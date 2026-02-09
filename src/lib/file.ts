import pool from "./db";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

export interface File {
  id: number;
  team_id: number;
  file_name: string;
  file_size_mb: number;
  created_at: Date;
}

export async function getFilesByTeamId(teamId: number): Promise<File[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT 
      file_id as id,
      team_id,
      file_name,
      file_size_mb,
      created_at
    FROM files
    WHERE team_id = ?
    ORDER BY created_at DESC`,
    [teamId]
  );
  return rows as File[];
}

export async function getFileById(fileId: number): Promise<File | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT 
      file_id as id,
      team_id,
      file_name,
      file_size_mb,
      created_at
    FROM files
    WHERE file_id = ?`,
    [fileId]
  );
  return rows.length > 0 ? (rows[0] as File) : null;
}

export async function createFile(
  teamId: number,
  fileName: string,
  fileSizeMb: number
): Promise<number> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 파일 생성
    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO files (team_id, file_name, file_size_mb, created_at)
       VALUES (?, ?, ?, NOW())`,
      [teamId, fileName, fileSizeMb]
    );

    // 팀 저장소 사용량 업데이트
    await connection.execute(
      `INSERT INTO team_storage_usage (team_id, used_storage_mb, updated_at)
       VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE 
         used_storage_mb = used_storage_mb + ?,
         updated_at = NOW()`,
      [teamId, fileSizeMb, fileSizeMb]
    );

    await connection.commit();
    return result.insertId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateFile(
  fileId: number,
  fileName: string
): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE files
     SET file_name = ?
     WHERE file_id = ?`,
    [fileName, fileId]
  );
  return result.affectedRows > 0;
}

export async function deleteFile(fileId: number): Promise<boolean> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 파일 정보 가져오기
    const [fileRows] = await connection.execute<RowDataPacket[]>(
      `SELECT team_id, file_size_mb FROM files WHERE file_id = ?`,
      [fileId]
    );

    if (fileRows.length === 0) {
      await connection.rollback();
      return false;
    }

    const file = fileRows[0];
    const teamId = file.team_id;
    const fileSizeMb = file.file_size_mb;

    // 파일 삭제
    const [result] = await connection.execute<ResultSetHeader>(
      `DELETE FROM files WHERE file_id = ?`,
      [fileId]
    );

    if (result.affectedRows > 0) {
      // 팀 저장소 사용량 업데이트
      await connection.execute(
        `UPDATE team_storage_usage
         SET used_storage_mb = GREATEST(0, used_storage_mb - ?),
             updated_at = NOW()
         WHERE team_id = ?`,
        [fileSizeMb, teamId]
      );
    }

    await connection.commit();
    return result.affectedRows > 0;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function getTotalFileSizeByTeamId(teamId: number): Promise<number> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT COALESCE(SUM(file_size_mb), 0) as total_size
     FROM files
     WHERE team_id = ?`,
    [teamId]
  );
  return rows[0]?.total_size || 0;
}

