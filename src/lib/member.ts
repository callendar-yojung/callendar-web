import pool from "./db";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

export interface Member {
  member_id: number;
  provider: string | null;
  provider_id: string | null;
  created_at: Date | null;
  lasted_at: Date | null;
  email: string | null;
  phone_number: string | null;
  nickname: string | null;
}

function generateRandomNickname(): string {
  const adjectives = [
    "행복한", "즐거운", "신나는", "귀여운", "멋진",
    "활발한", "용감한", "친절한", "빠른", "똑똑한",
  ];
  const nouns = [
    "고양이", "강아지", "토끼", "판다", "호랑이",
    "사자", "여우", "곰", "펭귄", "코알라",
  ];
  const randomNum = Math.floor(Math.random() * 10000);
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adjective}${noun}${randomNum}`;
}

export async function findMemberByProvider(
  provider: string,
  providerId: string
): Promise<Member | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT * FROM members WHERE provider = ? AND provider_id = ?",
    [provider, providerId]
  );
  return (rows[0] as Member) || null;
}

export async function createMember(
  provider: string,
  providerId: string,
  email: string | null
): Promise<Member> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const nickname = generateRandomNickname();
    const now = new Date();

    // 1. 회원 생성
    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO members (provider, provider_id, email, nickname, created_at, lasted_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [provider, providerId, email, nickname, now, now]
    );

    const insertId = result.insertId;

    // 2. 개인 워크스페이스 자동 생성
    await connection.execute(
      `INSERT INTO workspaces (type, owner_id, name, created_by, created_at)
       VALUES ('personal', ?, ?, ?, NOW())`,
      [insertId, `${nickname}의 워크스페이스`, insertId]
    );

    await connection.commit();

    return {
      member_id: insertId,
      provider,
      provider_id: providerId,
      email,
      nickname,
      phone_number: null,
      created_at: now,
      lasted_at: now,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateMemberLastLogin(memberId: number): Promise<void> {
  await pool.execute("UPDATE members SET lasted_at = ? WHERE member_id = ?", [
    new Date(),
    memberId,
  ]);
}

export async function updateMemberNickname(
  memberId: number,
  nickname: string
): Promise<void> {
  await pool.execute(
    "UPDATE members SET nickname = ? WHERE member_id = ?",
    [nickname, memberId]
  );
}

export async function findOrCreateMember(
  provider: string,
  providerId: string,
  email: string | null
): Promise<Member> {
  const existingMember = await findMemberByProvider(provider, providerId);

  if (existingMember) {
    await updateMemberLastLogin(existingMember.member_id);
    return existingMember;
  }

  return createMember(provider, providerId, email);
}
