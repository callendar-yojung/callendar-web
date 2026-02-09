import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-helper";
import { updateMemberNickname } from "@/lib/member";
import pool from "@/lib/db";
import type { RowDataPacket } from "mysql2";

// GET /api/me/account - 현재 사용자 정보 조회
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 사용자 정보 조회
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        member_id,
        provider,
        email,
        phone_number,
        nickname,
        created_at,
        lasted_at
      FROM members
      WHERE member_id = ?`,
      [user.memberId]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("Failed to fetch account:", error);
    return NextResponse.json(
      { error: "Failed to fetch account" },
      { status: 500 }
    );
  }
}

// PATCH /api/me/account - 닉네임 수정
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { nickname } = body;

    if (!nickname || typeof nickname !== "string" || nickname.trim().length === 0) {
      return NextResponse.json(
        { error: "Nickname is required" },
        { status: 400 }
      );
    }

    const trimmed = nickname.trim();
    if (trimmed.length > 200) {
      return NextResponse.json(
        { error: "Nickname must be 200 characters or less" },
        { status: 400 }
      );
    }

    // 닉네임 업데이트
    await updateMemberNickname(user.memberId, trimmed);

    return NextResponse.json({ success: true, nickname: trimmed });
  } catch (error) {
    console.error("Failed to update account:", error);
    return NextResponse.json(
      { error: "Failed to update account" },
      { status: 500 }
    );
  }
}
