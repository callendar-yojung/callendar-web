import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-helper";
import { clearNotifications } from "@/lib/notification";

// DELETE /api/notifications/clear
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const deleted = await clearNotifications(user.memberId);
    return NextResponse.json({ success: true, deleted });
  } catch (error) {
    console.error("Failed to clear notifications:", error);
    return NextResponse.json({ error: "Failed to clear notifications" }, { status: 500 });
  }
}
