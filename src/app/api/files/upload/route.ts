import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-helper";
import { createFileRecord } from "@/lib/file";
import { canUploadFile, type OwnerType, formatBytes } from "@/lib/storage";
import { uploadToS3, generateS3Key, isS3Configured } from "@/lib/s3";
import { v4 as uuidv4 } from "uuid";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

// 허용된 파일 타입
const ALLOWED_TYPES = [
  // 이미지
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  // 문서
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  // 텍스트
  "text/plain",
  "text/csv",
  "text/markdown",
  // 압축
  "application/zip",
  "application/x-rar-compressed",
  "application/x-7z-compressed",
];

// POST /api/files/upload
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const ownerType = formData.get("owner_type") as OwnerType;
    const ownerId = formData.get("owner_id") as string;
    const taskId = formData.get("task_id") as string | null; // 선택적: 태스크에 바로 첨부

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ownerType || !ownerId) {
      return NextResponse.json(
        { error: "owner_type and owner_id are required" },
        { status: 400 }
      );
    }

    if (!["team", "personal"].includes(ownerType)) {
      return NextResponse.json(
        { error: "Invalid owner_type. Must be 'team' or 'personal'" },
        { status: 400 }
      );
    }

    // 파일 타입 검증
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `File type not allowed: ${file.type}` },
        { status: 400 }
      );
    }

    const fileSizeBytes = file.size;

    // 용량 체크
    const uploadCheck = await canUploadFile(ownerType, Number(ownerId), fileSizeBytes);
    if (!uploadCheck.allowed) {
      return NextResponse.json(
        {
          error: uploadCheck.reason,
          used_bytes: uploadCheck.used_bytes,
          limit_bytes: uploadCheck.limit_bytes,
          max_file_size_bytes: uploadCheck.max_file_size_bytes,
        },
        { status: 403 }
      );
    }

    // 파일 저장 경로 생성
    const fileExt = path.extname(file.name);
    const storedName = `${uuidv4()}${fileExt}`;
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let publicPath: string;

    // S3가 설정되어 있으면 S3에 업로드, 아니면 로컬 파일 시스템 사용
    if (isS3Configured()) {
      // S3에 업로드
      const s3Key = generateS3Key(ownerType, Number(ownerId), storedName);
      publicPath = await uploadToS3(s3Key, buffer, file.type);
    } else {
      // 로컬 파일 시스템에 저장 (개발 환경용)
      const uploadDir = path.join(
        process.cwd(),
        "public",
        "uploads",
        ownerType === "team" ? "teams" : "personal",
        ownerId
      );
      const filePath = path.join(uploadDir, storedName);
      publicPath = `/uploads/${ownerType === "team" ? "teams" : "personal"}/${ownerId}/${storedName}`;

      // 디렉토리 생성
      await mkdir(uploadDir, { recursive: true });

      // 파일 저장
      await writeFile(filePath, buffer);
    }

    // DB에 파일 레코드 생성
    const fileId = await createFileRecord({
      owner_type: ownerType,
      owner_id: Number(ownerId),
      original_name: file.name,
      stored_name: storedName,
      file_path: publicPath,
      file_size: fileSizeBytes,
      mime_type: file.type,
      uploaded_by: user.memberId,
    });

    // 태스크에 첨부 (task_id가 제공된 경우)
    if (taskId) {
      const { attachFileToTask } = await import("@/lib/task-attachment");
      await attachFileToTask(Number(taskId), fileId, user.memberId);
    }

    return NextResponse.json({
      success: true,
      file: {
        file_id: fileId,
        original_name: file.name,
        stored_name: storedName,
        file_path: publicPath,
        file_size: fileSizeBytes,
        file_size_formatted: formatBytes(fileSizeBytes),
        mime_type: file.type,
      },
    });
  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
