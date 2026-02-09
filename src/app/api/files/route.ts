import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-helper";
import {
  getFilesByTeamId,
  getFileById,
  createFile,
  updateFile,
  deleteFile,
  getTotalFileSizeByTeamId,
} from "@/lib/file";
import { checkStorageLimit } from "@/lib/storage";

// GET /api/files?team_id=1 - 팀의 모든 파일 조회
// GET /api/files?id=1 - 특정 파일 조회
// GET /api/files?team_id=1&total_size=true - 팀의 총 파일 크기 조회
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("team_id");
    const fileId = searchParams.get("id");
    const totalSize = searchParams.get("total_size");

    if (totalSize) {
      // 팀의 총 파일 크기 조회
      const totalFileSize = await getTotalFileSizeByTeamId(teamId);
      return NextResponse.json({ totalFileSize });
    }

    if (fileId) {
      // 특정 파일 조회
      const file = await getFileById(fileId);
      return NextResponse.json(file);
    }

    // 팀의 모든 파일 조회
    const files = await getFilesByTeamId(teamId);
    return NextResponse.json(files);
  } catch (error) {
    console.error("Error fetching files:", error);
    return NextResponse.json(
      { error: "Failed to fetch files" },
      { status: 500 }
    );
  }
}

// POST /api/files - 새 파일 생성
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { teamId, name, size, type } = body;

    // 스토리지 용량 초과 체크
    const isWithinLimit = await checkStorageLimit(user.id, size);
    if (!isWithinLimit) {
      return NextResponse.json(
        { error: "Storage limit exceeded" },
        { status: 403 }
      );
    }

    // 파일 생성
    const file = await createFile({ teamId, name, size, type, userId: user.id });
    return NextResponse.json(file, { status: 201 });
  } catch (error) {
    console.error("Error creating file:", error);
    return NextResponse.json(
      { error: "Failed to create file" },
      { status: 500 }
    );
  }
}

// PUT /api/files - 파일 정보 수정
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, size, type } = body;

    // 파일 정보 수정
    const file = await updateFile({ id, name, size, type, userId: user.id });
    return NextResponse.json(file);
  } catch (error) {
    console.error("Error updating file:", error);
    return NextResponse.json(
      { error: "Failed to update file" },
      { status: 500 }
    );
  }
}

// DELETE /api/files - 파일 삭제
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("id");

    // 파일 삭제
    await deleteFile(fileId);
    return NextResponse.json({ message: "File deleted successfully" });
  } catch (error) {
    console.error("Error deleting file:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}
