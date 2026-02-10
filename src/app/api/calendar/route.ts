import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-helper";
import { getTasksWithTitlesByMonth } from "@/lib/task";
import { checkWorkspaceAccess } from "@/lib/workspace";

// GET /api/calendar?workspace_id=123&year=2026&month=1&tz_offset=-540
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get("workspace_id");
    const year = searchParams.get("year");
    const month = searchParams.get("month");
    const tzOffset = searchParams.get("tz_offset"); // Minutes offset from UTC

    if (!workspaceId || !year || !month) {
      return NextResponse.json(
        { error: "workspace_id, year and month are required" },
        { status: 400 }
      );
    }

    // 워크스페이스 접근 권한 확인
    const hasAccess = await checkWorkspaceAccess(
      Number(workspaceId),
      user.memberId
    );

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse timezone offset (default to 0 if not provided)
    const timezoneOffsetMinutes = tzOffset ? parseInt(tzOffset, 10) : 0;

    const tasksByDate = await getTasksWithTitlesByMonth(
      Number(workspaceId),
      Number(year),
      Number(month),
      timezoneOffsetMinutes
    );

    return NextResponse.json({ tasksByDate });
  } catch (error) {
    console.error("Failed to fetch calendar data:", error);
    return NextResponse.json(
      { error: "Failed to fetch calendar data" },
      { status: 500 }
    );
  }
}