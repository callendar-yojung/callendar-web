import pool from "./db";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

export interface TeamStorageUsage {
  team_id: number;
  used_storage_mb: number;
  updated_at: Date;
}

export async function getStorageUsageByTeamId(
  teamId: number
): Promise<TeamStorageUsage | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT 
      team_id,
      used_storage_mb,
      updated_at
    FROM team_storage_usage
    WHERE team_id = ?`,
    [teamId]
  );
  return rows.length > 0 ? (rows[0] as TeamStorageUsage) : null;
}

export async function initializeStorageUsage(teamId: number): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO team_storage_usage (team_id, used_storage_mb, updated_at)
     VALUES (?, 0, NOW())
     ON DUPLICATE KEY UPDATE updated_at = NOW()`,
    [teamId]
  );
  return result.affectedRows > 0;
}

export async function updateStorageUsage(
  teamId: number,
  usedStorageMb: number
): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE team_storage_usage
     SET used_storage_mb = ?, updated_at = NOW()
     WHERE team_id = ?`,
    [usedStorageMb, teamId]
  );
  return result.affectedRows > 0;
}

export async function recalculateStorageUsage(teamId: number): Promise<number> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 실제 파일 사용량 계산
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT COALESCE(SUM(file_size_mb), 0) as total_size
       FROM files
       WHERE team_id = ?`,
      [teamId]
    );

    const totalSize = rows[0]?.total_size || 0;

    // 저장소 사용량 업데이트
    await connection.execute(
      `INSERT INTO team_storage_usage (team_id, used_storage_mb, updated_at)
       VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE 
         used_storage_mb = ?,
         updated_at = NOW()`,
      [teamId, totalSize, totalSize]
    );

    await connection.commit();
    return totalSize;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function checkStorageLimit(
  teamId: number,
  additionalMb: number
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT 
      tsu.used_storage_mb as current_usage,
      p.max_storage_mb as storage_limit
    FROM team_storage_usage tsu
    LEFT JOIN subscriptions s ON tsu.team_id = s.owner_id AND s.owner_type = 'team' AND s.status = 'ACTIVE'
    LEFT JOIN plans p ON s.plan_id = p.plan_id
    WHERE tsu.team_id = ?`,
    [teamId]
  );

  const currentUsage = rows[0]?.current_usage || 0;
  const storageLimit = rows[0]?.storage_limit || 1000; // 기본 1GB

  const allowed = currentUsage + additionalMb <= storageLimit;

  return {
    allowed,
    current: currentUsage,
    limit: storageLimit,
  };
}

export async function deleteStorageUsage(teamId: number): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    `DELETE FROM team_storage_usage WHERE team_id = ?`,
    [teamId]
  );
  return result.affectedRows > 0;
}
