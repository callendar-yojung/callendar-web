import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

// S3 클라이언트 초기화
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-northeast-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || "";

// S3 사용 가능 여부 체크
export function isS3Configured(): boolean {
  return !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_S3_BUCKET
  );
}

/**
 * 파일을 S3에 업로드
 */
export async function uploadToS3(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await s3Client.send(command);

  // 공개 URL 반환 (CloudFront 또는 S3 직접 URL)
  // CloudFront가 설정되어 있으면 CloudFront URL 사용
  const cloudFrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN;
  if (cloudFrontDomain) {
    return `https://${cloudFrontDomain}/${key}`;
  }

  // S3 직접 URL
  return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || "ap-northeast-2"}.amazonaws.com/${key}`;
}

/**
 * S3에서 파일 삭제
 */
export async function deleteFromS3(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
}

/**
 * S3 key 생성 (uploads/personal/{ownerId}/{storedName} 형식)
 */
export function generateS3Key(
  ownerType: "team" | "personal",
  ownerId: number,
  storedName: string
): string {
  const folder = ownerType === "team" ? "teams" : "personal";
  return `uploads/${folder}/${ownerId}/${storedName}`;
}

/**
 * URL에서 S3 key 추출
 */
export function extractS3KeyFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    // CloudFront 또는 S3 URL에서 path 추출
    const path = urlObj.pathname;
    // 앞의 / 제거
    return path.startsWith("/") ? path.slice(1) : path;
  } catch {
    // 로컬 경로인 경우 (예: /uploads/personal/3/xxx.png)
    if (url.startsWith("/uploads/")) {
      return url.slice(1); // 앞의 / 제거
    }
    return null;
  }
}

export { s3Client, BUCKET_NAME };
