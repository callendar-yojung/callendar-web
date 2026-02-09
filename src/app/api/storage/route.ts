import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-helper";
import {
  getStorageUsageByTeamId,
  initializeStorageUsage,
  updateStorageUsage,
  recalculateStorageUsage,
  checkStorageLimit,
  deleteStorageUsage,
} from "@/lib/storage";

// GET /api/storage?team_id=1 - 팀의 저장소 사용량 조회
// GET /api/storage?team_id=1&check_limit=100 - 용량 추가 가능 여부 확인
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("team_id");
    const checkLimit = searchParams.get("check_limit");

    if (!teamId) {
      return NextResponse.json({ error: "팀 ID를 제공해야 합니다." }, { status: 400 });
    }

    if (checkLimit) {
      const storageLimit = parseInt(checkLimit, 10);
      const isWithinLimit = await checkStorageLimit(user.id, teamId, storageLimit);

      return NextResponse.json({ withinLimit: isWithinLimit });
    }

    const storageUsage = await getStorageUsageByTeamId(user.id, teamId);

    return NextResponse.json(storageUsage);
  } catch (error) {
    console.error("Error fetching storage usage:", error);
    return NextResponse.json(
      { error: "Failed to fetch storage usage" },
      { status: 500 }
    );
  }
}

// POST /api/storage - 저장소 사용량 초기화
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { team_id, initial_usage } = await request.json();

    if (!team_id) {
      return NextResponse.json({ error: "팀 ID를 제공해야 합니다." }, { status: 400 });
    }

    await initializeStorageUsage(user.id, team_id, initial_usage);

    return NextResponse.json({ message: "Storage usage initialized" });
  } catch (error) {
    console.error("Error initializing storage usage:", error);
    return NextResponse.json(
      { error: "Failed to initialize storage usage" },
      { status: 500 }
    );
  }
}

// PUT /api/storage - 저장소 사용량 수정
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { team_id, usage } = await request.json();

    if (!team_id) {
      return NextResponse.json({ error: "팀 ID를 제공해야 합니다." }, { status: 400 });
    }

    await updateStorageUsage(user.id, team_id, usage);

    return NextResponse.json({ message: "Storage usage updated" });
  } catch (error) {
    console.error("Error updating storage usage:", error);
    return NextResponse.json(
      { error: "Failed to update storage usage" },
      { status: 500 }
    );
  }
}

// DELETE /api/storage - 저장소 사용량 삭제
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { team_id } = await request.json();

    if (!team_id) {
      return NextResponse.json({ error: "팀 ID를 제공해야 합니다." }, { status: 400 });
    }

    await deleteStorageUsage(user.id, team_id);

    return NextResponse.json({ message: "Storage usage deleted" });
  } catch (error) {
    console.error("Error deleting storage usage:", error);
    return NextResponse.json(
      { error: "Failed to delete storage usage" },
      { status: 500 }
    );
  }
}
