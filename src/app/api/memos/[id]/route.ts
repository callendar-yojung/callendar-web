import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-helper";
import { checkTeamMembership } from "@/lib/team";
import {
  deleteMemo,
  getMemoById,
  updateMemo,
  type MemoOwnerType,
} from "@/lib/memo";

function parseOwnerType(value: string | null): MemoOwnerType | null {
  if (value === "personal" || value === "team") return value;
  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const memoId = Number(id);
  const ownerType = parseOwnerType(request.nextUrl.searchParams.get("owner_type"));
  const ownerId = Number(request.nextUrl.searchParams.get("owner_id"));

  if (Number.isNaN(memoId) || !ownerType || Number.isNaN(ownerId)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
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

  const memo = await getMemoById(memoId, ownerType, ownerId, user.memberId);
  return NextResponse.json({ memo });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const memoId = Number(id);
  const body = await request.json();
  const ownerType = parseOwnerType(body?.owner_type ?? null);
  const ownerId = Number(body?.owner_id);
  const title = typeof body?.title === "string" ? body.title.trim() : null;
  const content = body?.content;
  const isFavorite =
    typeof body?.is_favorite === "boolean" ? body.is_favorite : null;

  if (Number.isNaN(memoId) || !ownerType || Number.isNaN(ownerId)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
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

  const success = await updateMemo(memoId, ownerType, ownerId, user.memberId, {
    title: title ?? undefined,
    contentJson: content ? JSON.stringify(content) : undefined,
    isFavorite: isFavorite ?? undefined,
  });

  return NextResponse.json({ success });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const memoId = Number(id);
  const ownerType = parseOwnerType(request.nextUrl.searchParams.get("owner_type"));
  const ownerId = Number(request.nextUrl.searchParams.get("owner_id"));

  if (Number.isNaN(memoId) || !ownerType || Number.isNaN(ownerId)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
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

  const success = await deleteMemo(memoId, ownerType, ownerId, user.memberId);
  return NextResponse.json({ success });
}
