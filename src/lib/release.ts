import pool from "./db";

interface ReleaseData {
  version: string;
  platform: string;
  fileName: string;
  downloadUrl: string;
  fileSize: number;
  checksum: string;
  releaseNotes?: string;
  isPrerelease?: boolean;
}

export async function createOrUpdateRelease(data: ReleaseData) {
  const {
    version,
    platform,
    fileName,
    downloadUrl,
    fileSize,
    checksum,
    releaseNotes = "",
    isPrerelease = false,
  } = data;

  try {
    const [result] = await pool.execute(
      `INSERT INTO releases 
       (version, platform, file_name, download_url, file_size, 
        checksum, release_notes, is_prerelease, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
       download_url = VALUES(download_url),
       file_size = VALUES(file_size),
       checksum = VALUES(checksum),
       release_notes = VALUES(release_notes),
       updated_at = NOW()`,
      [version, platform, fileName, downloadUrl, fileSize, checksum, releaseNotes, isPrerelease]
    );

    return {
      success: true,
      insertId: (result as any).insertId,
    };
  } catch (error) {
    console.error("❌ Failed to save release:", error);
    throw error;
  }
}

export async function getLatestRelease(platform: string) {
  try {
    const [rows] = await pool.execute(
      `SELECT * FROM releases 
       WHERE platform = ? AND is_prerelease = false 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [platform]
    );

    return (rows as any[])[0] || null;
  } catch (error) {
    console.error("❌ Failed to get latest release:", error);
    throw error;
  }
}
