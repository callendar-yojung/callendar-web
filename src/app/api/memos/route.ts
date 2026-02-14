import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-helper";
import { checkTeamMembership } from "@/lib/team";
import { createMemo, getMemos, type MemoOwnerType } from "@/lib/memo";

function parseOwnerType(value: string | null): MemoOwnerType | null {
  if (value === "personal" || value === "team") return value;
  return null;
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ownerType = parseOwnerType(request.nextUrl.searchParams.get("owner_type"));
  const ownerId = Number(request.nextUrl.searchParams.get("owner_id"));
  const query = request.nextUrl.searchParams.get("query")?.trim() ?? "";
  const sortParam = request.nextUrl.searchParams.get("sort") ?? "latest";
  const favoriteOnly = request.nextUrl.searchParams.get("favorite") === "1";
  const page = Number(request.nextUrl.searchParams.get("page") || 1);
  const pageSize = Number(request.nextUrl.searchParams.get("page_size") || 10);

  if (!ownerType || Number.isNaN(ownerId)) {
    return NextResponse.json({ error: "Invalid owner" }, { status: 400 });
  }
  if (!Number.isFinite(page) || page < 1) {
    return NextResponse.json({ error: "Invalid page" }, { status: 400 });
  }
  if (!Number.isFinite(pageSize) || pageSize < 1 || pageSize > 50) {
    return NextResponse.json({ error: "Invalid page size" }, { status: 400 });
  }
  if (sortParam !== "latest" && sortParam !== "oldest" && sortParam !== "favorite") {
    return NextResponse.json({ error: "Invalid sort" }, { status: 400 });
  }

  if (ownerType === "personal" && ownerId !== user.memberId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (ownerType === "team") {
    const isMember = await checkTeamMembership(ownerId, user.memberId);
    if (!isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const result = await getMemos(
    ownerType,
    ownerId,
    user.memberId,
    query,
    sortParam as "latest" | "oldest" | "favorite",
    favoriteOnly,
    pageSize,
    (page - 1) * pageSize
  );
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const ownerType = parseOwnerType(body?.owner_type ?? null);
  const ownerId = Number(body?.owner_id);
  const content = body?.content;
  const title = typeof body?.title === "string" ? body.title.trim() : "";

  if (!ownerType || Number.isNaN(ownerId)) {
    return NextResponse.json({ error: "Invalid owner" }, { status: 400 });
  }
  if (!content || typeof content !== "object") {
    return NextResponse.json({ error: "Invalid content" }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ error: "Invalid title" }, { status: 400 });
  }

  if (ownerType === "personal" && ownerId !== user.memberId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (ownerType === "team") {
    const isMember = await checkTeamMembership(ownerId, user.memberId);
    if (!isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const memoId = await createMemo(
    ownerType,
    ownerId,
    user.memberId,
    title,
    JSON.stringify(content)
  );

  return NextResponse.json({ success: true, memo_id: memoId });
}
