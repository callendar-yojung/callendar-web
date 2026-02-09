import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-helper";
import { createTag, getTagsByOwner } from "@/lib/tag";

// GET /api/tags?owner_type=team&owner_id=1
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const ownerType = searchParams.get("owner_type") as "team" | "personal";
    const ownerId = searchParams.get("owner_id");

    if (!ownerType || !ownerId) {
      return NextResponse.json(
        { error: "owner_type and owner_id are required" },
        { status: 400 }
      );
    }

    if (ownerType !== "team" && ownerType !== "personal") {
      return NextResponse.json(
        { error: "owner_type must be 'team' or 'personal'" },
        { status: 400 }
      );
    }

    // TODO: 권한 확인 로직 추가 (팀 멤버인지, 본인의 개인 태그인지)

    const tags = await getTagsByOwner(ownerType, Number(ownerId));

    return NextResponse.json({ tags });
  } catch (error) {
    console.error("Failed to fetch tags:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/tags
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, color, owner_type, owner_id } = body;

    if (!name || !owner_type || !owner_id) {
      return NextResponse.json(
        { error: "name, owner_type, and owner_id are required" },
        { status: 400 }
      );
    }

    if (owner_type !== "team" && owner_type !== "personal") {
      return NextResponse.json(
        { error: "owner_type must be 'team' or 'personal'" },
        { status: 400 }
      );
    }

    // TODO: 권한 확인 로직 추가

    const tagId = await createTag({
      name,
      color: color || "#3B82F6",
      owner_type,
      owner_id: Number(owner_id),
      member_id: user.memberId,
    });

    return NextResponse.json({ tag_id: tagId }, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create tag:", error);

    // 중복 태그명 에러 처리
    if (error.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { error: "Tag with this name already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

