import pool from "./db";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";

export interface Task {
  id: number;
  title: string;
  start_time: Date;
  end_time: Date;
  content: string | null;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  color?: string;
  created_at: Date;
  updated_at: Date;
  created_by: number;
  updated_by: number;
  workspace_id: number;
  tags?: Array<{ tag_id: number; name: string; color: string }>;
}

export interface CreateTaskData {
  title: string;
  start_time: string;
  end_time: string;
  content?: string;
  status?: "TODO" | "IN_PROGRESS" | "DONE";
  color?: string;
  member_id: number;
  workspace_id: number;
  tag_ids?: number[];
}

/**
 * 새 태스크 생성 (워크스페이스 기반)
 */
export async function createTask(data: CreateTaskData): Promise<number> {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.query<ResultSetHeader>(
      `INSERT INTO tasks (title, start_time, end_time, content, status, color, created_at, updated_at, created_by, updated_by, workspace_id)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW(), ?, ?, ?)`,
      [
        data.title,
        data.start_time,
        data.end_time,
        data.content || null,
        data.status || "TODO",
        data.color || "#3B82F6",
        data.member_id,
        data.member_id,
        data.workspace_id
      ]
    );

    const taskId = result.insertId;

    // 태그 추가
    if (data.tag_ids && data.tag_ids.length > 0) {
      const now = new Date();
      const tagValues = data.tag_ids.map(tagId => [taskId, tagId, now]);
      await connection.query(
        `INSERT INTO task_tags (task_id, tag_id, created_at) VALUES ?`,
        [tagValues]
      );
    }

    await connection.commit();
    return taskId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 워크스페이스의 태스크 목록 조회
 */
export async function getTasksByWorkspaceId(workspaceId: number): Promise<Task[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM tasks
     WHERE workspace_id = ?
     ORDER BY start_time DESC`,
    [workspaceId]
  );
  return rows as Task[];
}

export interface PaginatedTasksResult {
  tasks: Task[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const ALLOWED_SORT_COLUMNS = ["start_time", "end_time", "created_at", "updated_at", "title", "status"] as const;
type SortColumn = typeof ALLOWED_SORT_COLUMNS[number];

/**
 * 워크스페이스의 태스크 목록 조회 (페이징/정렬/필터)
 */
export async function getTasksByWorkspaceIdPaginated(
  workspaceId: number,
  options: {
    page?: number;
    limit?: number;
    sort_by?: string;
    sort_order?: "ASC" | "DESC";
    status?: string;
    search?: string;
  } = {}
): Promise<PaginatedTasksResult> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));
  const offset = (page - 1) * limit;
  const sortOrder = options.sort_order === "ASC" ? "ASC" : "DESC";
  const sortBy: SortColumn = ALLOWED_SORT_COLUMNS.includes(options.sort_by as SortColumn)
    ? (options.sort_by as SortColumn)
    : "start_time";

  const conditions: string[] = ["t.workspace_id = ?"];
  const params: any[] = [workspaceId];

  if (options.status && ["TODO", "IN_PROGRESS", "DONE"].includes(options.status)) {
    conditions.push("t.status = ?");
    params.push(options.status);
  }

  if (options.search) {
    conditions.push("(t.title LIKE ? OR t.content LIKE ?)");
    const searchTerm = `%${options.search}%`;
    params.push(searchTerm, searchTerm);
  }

  const whereClause = conditions.join(" AND ");

  // 전체 개수 조회
  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(DISTINCT t.id) as total FROM tasks t WHERE ${whereClause}`,
    params
  );
  const total = countRows[0].total;

  // 데이터 조회 (태그 포함)
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT 
      t.*,
      tg.tag_id,
      tags.name as tag_name,
      tags.color as tag_color
     FROM tasks t
     LEFT JOIN task_tags tg ON t.id = tg.task_id
     LEFT JOIN tags ON tg.tag_id = tags.tag_id
     WHERE ${whereClause} 
     ORDER BY t.${sortBy} ${sortOrder}
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  // 태스크별로 그룹화하여 태그 배열 생성
  const tasksMap = new Map<number, Task>();

  rows.forEach((row: any) => {
    if (!tasksMap.has(row.id)) {
      tasksMap.set(row.id, {
        id: row.id,
        title: row.title,
        start_time: row.start_time,
        end_time: row.end_time,
        content: row.content,
        status: row.status,
        color: row.color,
        created_at: row.created_at,
        updated_at: row.updated_at,
        created_by: row.created_by,
        updated_by: row.updated_by,
        workspace_id: row.workspace_id,
        tags: []
      });
    }

    // 태그가 있으면 추가
    if (row.tag_id) {
      tasksMap.get(row.id)!.tags!.push({
        tag_id: row.tag_id,
        name: row.tag_name,
        color: row.tag_color
      });
    }
  });

  const tasks = Array.from(tasksMap.values());

  return {
    tasks,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * 태스크 수정
 */
export async function updateTask(
  taskId: number,
  data: {
    title?: string;
    start_time?: string;
    end_time?: string;
    content?: string;
    status?: "TODO" | "IN_PROGRESS" | "DONE";
    color?: string;
    tag_ids?: number[];
  },
  memberId: number
): Promise<void> {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const updates: string[] = [];
    const values: any[] = [];

    if (data.title !== undefined) {
      updates.push('title = ?');
      values.push(data.title);
    }
    if (data.start_time) {
      updates.push('start_time = ?');
      values.push(data.start_time);
    }
    if (data.end_time) {
      updates.push('end_time = ?');
      values.push(data.end_time);
    }
    if (data.content !== undefined) {
      updates.push('content = ?');
      values.push(data.content);
    }
    if (data.status) {
      updates.push('status = ?');
      values.push(data.status);
    }
    if (data.color !== undefined) {
      updates.push('color = ?');
      values.push(data.color);
    }

    if (updates.length > 0) {
      updates.push('updated_at = NOW()');
      updates.push('updated_by = ?');
      values.push(memberId, taskId);

      await connection.query(
        `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
    }

    // 태그 업데이트
    if (data.tag_ids !== undefined) {
      // 기존 태그 삭제
      await connection.query('DELETE FROM task_tags WHERE task_id = ?', [taskId]);

      // 새 태그 추가
      if (data.tag_ids.length > 0) {
        const now = new Date();
        const tagValues = data.tag_ids.map(tagId => [taskId, tagId, now]);
        await connection.query(
          `INSERT INTO task_tags (task_id, tag_id, created_at) VALUES ?`,
          [tagValues]
        );
      }
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 태스크 삭제
 */
export async function deleteTask(taskId: number): Promise<void> {
  await pool.query(`DELETE FROM tasks WHERE id = ?`, [taskId]);
}

/**
 * 특정 월의 날짜별 태스크 개수 조회 (워크스페이스 기반)
 */
export async function getTaskCountsByMonth(
  workspaceId: number,
  year: number,
  month: number
): Promise<{ date: string; count: number }[]> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT dates.date, COUNT(t.id) as count
     FROM (
       SELECT DATE_ADD(?, INTERVAL seq DAY) as date
       FROM (
         SELECT 0 as seq UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL 
         SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL 
         SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL 
         SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15 UNION ALL 
         SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19 UNION ALL 
         SELECT 20 UNION ALL SELECT 21 UNION ALL SELECT 22 UNION ALL SELECT 23 UNION ALL 
         SELECT 24 UNION ALL SELECT 25 UNION ALL SELECT 26 UNION ALL SELECT 27 UNION ALL 
         SELECT 28 UNION ALL SELECT 29 UNION ALL SELECT 30
       ) as seq_table
       WHERE DATE_ADD(?, INTERVAL seq DAY) <= ?
     ) as dates
     LEFT JOIN tasks t ON DATE(dates.date) BETWEEN DATE(t.start_time) AND DATE(t.end_time)
       AND t.workspace_id = ?
     WHERE dates.date BETWEEN ? AND ?
     GROUP BY dates.date
     HAVING count > 0
     ORDER BY dates.date`,
    [startDate, startDate, endDate, workspaceId, startDate, endDate]
  );

  return rows.map(row => ({
    date: row.date,
    count: Number(row.count)
  }));
}

/**
 * 특정 날짜의 태스크 목록 조회 (워크스페이스 기반)
 * @param workspaceId - 워크스페이스 ID
 * @param date - 조회할 날짜 (YYYY-MM-DD, 사용자 로컬 시간 기준)
 * @param timezoneOffsetMinutes - 사용자 타임존 오프셋 (분 단위, UTC 기준, e.g., -540 for UTC+9)
 */
export async function getTasksByDate(
  workspaceId: number,
  date: string,
  timezoneOffsetMinutes: number = 0
): Promise<Task[]> {
  // Calculate the UTC time range for the user's local date
  // timezoneOffsetMinutes is negative for timezones ahead of UTC (e.g., -540 for UTC+9)
  // So we add the offset to convert local time to UTC
  const localDateStart = new Date(`${date}T00:00:00`);
  const localDateEnd = new Date(`${date}T23:59:59.999`);

  // Convert local time to UTC by adding the offset
  const utcStart = new Date(localDateStart.getTime() + timezoneOffsetMinutes * 60 * 1000);
  const utcEnd = new Date(localDateEnd.getTime() + timezoneOffsetMinutes * 60 * 1000);

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT
      t.*,
      tg.tag_id,
      tags.name as tag_name,
      tags.color as tag_color
     FROM tasks t
     LEFT JOIN task_tags tg ON t.id = tg.task_id
     LEFT JOIN tags ON tg.tag_id = tags.tag_id
     WHERE t.workspace_id = ?
       AND t.start_time >= ?
       AND t.start_time <= ?
     ORDER BY t.start_time ASC`,
    [workspaceId, utcStart, utcEnd]
  );

  // 태스크별로 그룹화하여 태그 배열 생성
  const tasksMap = new Map<number, Task>();

  rows.forEach((row: any) => {
    if (!tasksMap.has(row.id)) {
      tasksMap.set(row.id, {
        id: row.id,
        title: row.title,
        start_time: row.start_time,
        end_time: row.end_time,
        content: row.content,
        status: row.status,
        color: row.color,
        created_at: row.created_at,
        updated_at: row.updated_at,
        created_by: row.created_by,
        updated_by: row.updated_by,
        workspace_id: row.workspace_id,
        tags: []
      });
    }

    // 태그가 있으면 추가
    if (row.tag_id) {
      tasksMap.get(row.id)!.tags!.push({
        tag_id: row.tag_id,
        name: row.tag_name,
        color: row.tag_color
      });
    }
  });

  return Array.from(tasksMap.values());
}

/**
 * 특정 월의 날짜별 태스크 목록 조회 (워크스페이스 기반) - 제목 포함
 * @param workspaceId - 워크스페이스 ID
 * @param year - 연도
 * @param month - 월 (1-12)
 * @param timezoneOffsetMinutes - 사용자 타임존 오프셋 (분 단위, UTC 기준)
 */
export async function getTasksWithTitlesByMonth(
  workspaceId: number,
  year: number,
  month: number,
  timezoneOffsetMinutes: number = 0
): Promise<{ date: string; tasks: { id: number; title: string; start_time: Date; end_time: Date }[] }[]> {
  // Calculate the UTC time range for the user's local month
  const localMonthStart = new Date(year, month - 1, 1, 0, 0, 0);
  const lastDay = new Date(year, month, 0).getDate();
  const localMonthEnd = new Date(year, month - 1, lastDay, 23, 59, 59, 999);

  // Convert local time to UTC
  const utcStart = new Date(localMonthStart.getTime() + timezoneOffsetMinutes * 60 * 1000);
  const utcEnd = new Date(localMonthEnd.getTime() + timezoneOffsetMinutes * 60 * 1000);

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT
       t.id,
       t.title,
       t.start_time,
       t.end_time
     FROM tasks t
     WHERE t.workspace_id = ?
       AND t.start_time >= ?
       AND t.start_time <= ?
     ORDER BY t.start_time ASC`,
    [workspaceId, utcStart, utcEnd]
  );

  // Group by local date
  const grouped = rows.reduce((acc: any, row: any) => {
    // Convert UTC start_time to user's local date for grouping
    const startTimeUTC = new Date(row.start_time);
    const localTime = new Date(startTimeUTC.getTime() - timezoneOffsetMinutes * 60 * 1000);
    const dateStr = localTime.toISOString().split('T')[0];

    if (!acc[dateStr]) {
      acc[dateStr] = [];
    }
    acc[dateStr].push({
      id: row.id,
      title: row.title,
      start_time: row.start_time,
      end_time: row.end_time
    });
    return acc;
  }, {});

  return Object.entries(grouped).map(([date, tasks]) => ({
    date,
    tasks: tasks as { id: number; title: string; start_time: Date; end_time: Date }[]
  }));
}
