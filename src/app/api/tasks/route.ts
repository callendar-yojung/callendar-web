import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-helper";
import {
  createTask,
  getTasksByWorkspaceIdPaginated,
  updateTask,
  deleteTask
} from "@/lib/task";
import { checkWorkspaceAccess } from "@/lib/workspace";

// GET /api/tasks?workspace_id={id}&page=1&limit=20&sort_by=start_time&sort_order=DESC&status=TODO&search=keyword
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get("workspace_id");

    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspace_id is required" },
        { status: 400 }
      );
    }

    // 워크스페이스 접근 권한 확인
    const hasAccess = await checkWorkspaceAccess(
      Number(workspaceId),
      user.memberId
    );

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const page = searchParams.get("page");
    const limit = searchParams.get("limit");
    const sort_by = searchParams.get("sort_by");
    const sort_order = searchParams.get("sort_order");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const result = await getTasksByWorkspaceIdPaginated(Number(workspaceId), {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      sort_by: sort_by || undefined,
      sort_order: (sort_order === "ASC" || sort_order === "DESC") ? sort_order : undefined,
      status: status || undefined,
      search: search || undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

// POST /api/tasks - 새 태스크 생성
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, start_time, end_time, content, status, workspace_id, color, tag_ids } = body;

    // 유효성 검사
    if (!title || !start_time || !end_time || !workspace_id) {
      return NextResponse.json(
        { error: "Missing required fields: title, start_time, end_time, workspace_id" },
        { status: 400 }
      );
    }

    // 워크스페이스 접근 권한 확인
    const hasAccess = await checkWorkspaceAccess(
      Number(workspace_id),
      user.memberId
    );

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 시간 유효성 검사
    if (new Date(start_time) >= new Date(end_time)) {
      return NextResponse.json(
        { error: "End time must be after start time" },
        { status: 400 }
      );
    }

    // 태스크 생성
    const taskId = await createTask({
      title,
      start_time,
      end_time,
      content,
      status: status || "TODO",
      color: color || "#3B82F6",
      tag_ids: tag_ids || [],
      member_id: user.memberId,
      workspace_id: Number(workspace_id),
    });

    return NextResponse.json(
      { success: true, taskId },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create task:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}

// PATCH /api/tasks - 태스크 수정
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { task_id, title, start_time, end_time, content, status, color, tag_ids } = body;

    if (!task_id) {
      return NextResponse.json(
        { error: "task_id is required" },
        { status: 400 }
      );
    }

    await updateTask(
      Number(task_id),
      { title, start_time, end_time, content, status, color, tag_ids },
      user.memberId
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update task:", error);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks - 태스크 삭제
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const taskId = searchParams.get("task_id");

    if (!taskId) {
      return NextResponse.json(
        { error: "task_id is required" },
        { status: 400 }
      );
    }

    await deleteTask(Number(taskId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete task:", error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
