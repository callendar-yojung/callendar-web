import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-helper";
import { getUnreadCount } from "@/lib/notification";

// GET /api/notifications/unread
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const count = await getUnreadCount(user.memberId);
    return NextResponse.json({ count });
  } catch (error) {
    console.error("Failed to fetch unread count:", error);
    return NextResponse.json({ error: "Failed to fetch unread count" }, { status: 500 });
  }
}
