import { NextRequest, NextResponse } from "next/server";
import { findOrCreateMember } from "@/lib/member";
import { generateAccessToken, generateRefreshToken } from "@/lib/jwt";

/**
 * GET /api/auth/kakao/callback?code=XXX
 * 카카오 OAuth 콜백을 처리합니다 (Tauri 앱용).
 *
 * Architecture: Next.js App Router + Tauri Desktop App
 *
 * Flow:
 * 1. tauri-plugin-oauth가 localhost:8888에서 카카오 콜백 수신
 * 2. 카카오 인증 코드로 액세스 토큰 교환
 * 3. 카카오 사용자 정보 가져오기
 * 4. DB에서 멤버 찾기/생성
 * 5. JWT 토큰 생성
 * 6. JSON으로 토큰과 사용자 정보 반환 (브라우저 리다이렉트 없음)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.json(
        { error: `Kakao OAuth error: ${error}` },
        { status: 400 }
    );
  }

  if (!code) {
    return NextResponse.json(
        { error: "Authorization code is missing" },
        { status: 400 }
    );
  }

  try {
    console.log("🔑 카카오 OAuth 콜백 처리 시작:", { code: code.substring(0, 10) + "..." });

    // 1. 카카오 액세스 토큰 받기
    const tokenResponse = await fetch("https://kauth.kakao.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: process.env.AUTH_KAKAO_ID!,
        client_secret: process.env.AUTH_KAKAO_SECRET!,
        code,
        // Tauri 앱은 localhost:8888로 고정
        redirect_uri: "http://localhost:8888",
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("❌ 카카오 토큰 에러:", errorData);
      return NextResponse.json(
          { error: "Failed to get Kakao access token" },
          { status: 500 }
      );
    }

    const tokenData = await tokenResponse.json();
    const kakaoAccessToken = tokenData.access_token;
    console.log("✅ 카카오 액세스 토큰 획득");

    // 2. 카카오 사용자 정보 가져오기
    const userResponse = await fetch("https://kapi.kakao.com/v2/user/me", {
      headers: {
        Authorization: `Bearer ${kakaoAccessToken}`,
      },
    });

    if (!userResponse.ok) {
      console.error("❌ 카카오 사용자 정보 가져오기 실패");
      return NextResponse.json(
          { error: "Failed to get Kakao user info" },
          { status: 500 }
      );
    }

    const kakaoUser = await userResponse.json();
    const providerId = String(kakaoUser.id);
    const email = kakaoUser.kakao_account?.email || null;
    console.log("✅ 카카오 사용자 정보 획득:", { providerId, email });

    // 3. DB에서 멤버 찾기 또는 생성
    const member = await findOrCreateMember("kakao", providerId, email);
    console.log("✅ 멤버 처리 완료:", { memberId: member.member_id });

    // 4. JWT 토큰 생성
    const memberNickname = member.nickname ?? "사용자";
    const accessToken = await generateAccessToken({
      memberId: member.member_id,
      nickname: memberNickname,
      provider: "kakao",
      email: member.email,
    });

    const refreshToken = await generateRefreshToken({
      memberId: member.member_id,
      nickname: memberNickname,
      provider: "kakao",
      email: member.email,
    });

    console.log("✅ JWT 토큰 생성 완료");

    // 5. JSON으로 토큰과 사용자 정보 반환 (Tauri 앱용)
    return NextResponse.json({
      accessToken,
      refreshToken,
      member: {
        memberId: member.member_id,
        nickname: memberNickname,
        email: member.email,
        provider: "kakao",
      },
    });

  } catch (error) {
    console.error("❌ 카카오 콜백 처리 에러:", error);
    return NextResponse.json(
        {
          error: "Authentication failed",
          details: error instanceof Error ? error.message : "Unknown error"
        },
        { status: 500 }
    );
  }
}
