import pool from "./db";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

export interface Team {
  id: number;
  name: string;
  description: string | null;
  created_at: Date;
  created_by: number;
  memberCount?: number;
}

export async function getTeamsByMemberId(
  memberId: number
): Promise<Team[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT 
      t.team_id as id, 
      t.name, 
      t.description, 
      t.created_at,
      t.created_by,
      (SELECT COUNT(*) FROM team_members WHERE team_id = t.team_id) as memberCount
     FROM teams t
     JOIN team_members tm ON t.team_id = tm.team_id
     WHERE tm.member_id = ?
     ORDER BY t.created_at DESC`,
    [memberId]
  );
  return rows as Team[];
}

export async function getTeamById(teamId: number): Promise<Team | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT 
      t.team_id as id, 
      t.name, 
      t.description, 
      t.created_at,
      t.created_by,
      (SELECT COUNT(*) FROM team_members WHERE team_id = t.team_id) as memberCount
     FROM teams t
     WHERE t.team_id = ?`,
    [teamId]
  );
  return rows.length > 0 ? (rows[0] as Team) : null;
}

export async function createTeam(
  name: string,
  description: string | null,
  memberId: number
): Promise<number> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. teams 테이블에 삽입
    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO teams (name, description, created_at, created_by)
       VALUES (?, ?, NOW(), ?)`,
      [name, description, memberId]
    );

    const teamId = result.insertId;

    // 2. 기본 팀 역할 생성 (Owner)
    const [roleResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO team_roles (team_id, name, created_at, created_by)
       VALUES (?, 'Owner', NOW(), ?)`,
      [teamId, memberId]
    );

    const roleId = roleResult.insertId;

    // 3. team_members 테이블에 생성자 추가
    await connection.execute(
      `INSERT INTO team_members (team_id, member_id, team_role_id)
       VALUES (?, ?, ?)`,
      [teamId, memberId, roleId]
    );

    // 4. 팀 워크스페이스 생성 (트랜잭션 커넥션 사용)
    await connection.execute(
      `INSERT INTO workspaces (type, owner_id, name, created_by, created_at)
       VALUES ('team', ?, ?, ?, NOW())`,
      [teamId, name, memberId]
    );

    await connection.commit();
    return teamId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateTeam(
  teamId: number,
  name: string,
  description: string | null
): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE teams 
     SET name = ?, description = ?
     WHERE team_id = ?`,
    [name, description, teamId]
  );
  return result.affectedRows > 0;
}

export async function deleteTeam(teamId: number): Promise<boolean> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. team_role_permissions 삭제
    await connection.execute(
      `DELETE trp FROM team_role_permissions trp
       JOIN team_roles tr ON trp.team_role_id = tr.team_role_id
       WHERE tr.team_id = ?`,
      [teamId]
    );

    // 2. team_roles 삭제
    await connection.execute(
      `DELETE FROM team_roles WHERE team_id = ?`,
      [teamId]
    );

    // 3. team_members 삭제
    await connection.execute(
      `DELETE FROM team_members WHERE team_id = ?`,
      [teamId]
    );

    // 4. workspaces 삭제 (팀 워크스페이스)
    await connection.execute(
      `DELETE FROM workspaces WHERE type = 'team' AND owner_id = ?`,
      [teamId]
    );

    // 5. teams 삭제
    const [result] = await connection.execute<ResultSetHeader>(
      `DELETE FROM teams WHERE team_id = ?`,
      [teamId]
    );

    await connection.commit();
    return result.affectedRows > 0;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 회원이 팀에 속해있는지 확인
 */
export async function checkTeamMembership(
  teamId: number,
  memberId: number
): Promise<boolean> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT 1 FROM team_members 
     WHERE team_id = ? AND member_id = ?`,
    [teamId, memberId]
  );
  return rows.length > 0;
}
