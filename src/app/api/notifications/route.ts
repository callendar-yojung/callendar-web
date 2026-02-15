import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-helper";
import { getNotificationsForMember } from "@/lib/notification";

// GET /api/notifications?limit=20
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const limit = Number(request.nextUrl.searchParams.get("limit") || 20);
    const notifications = await getNotificationsForMember(user.memberId, limit);
    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("Failed to fetch notifications:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}
