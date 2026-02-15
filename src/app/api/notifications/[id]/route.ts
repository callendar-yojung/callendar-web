import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-helper";
import { deleteNotification, markNotificationRead } from "@/lib/notification";

// PATCH /api/notifications/{id}
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const notificationId = Number(id);
    if (Number.isNaN(notificationId)) {
      return NextResponse.json({ error: "Invalid notification id" }, { status: 400 });
    }

    const success = await markNotificationRead(notificationId, user.memberId);
    return NextResponse.json({ success });
  } catch (error) {
    console.error("Failed to mark notification read:", error);
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
  }
}

// DELETE /api/notifications/{id}
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const notificationId = Number(id);
    if (Number.isNaN(notificationId)) {
      return NextResponse.json({ error: "Invalid notification id" }, { status: 400 });
    }

    const success = await deleteNotification(notificationId, user.memberId);
    return NextResponse.json({ success });
  } catch (error) {
    console.error("Failed to delete notification:", error);
    return NextResponse.json({ error: "Failed to delete notification" }, { status: 500 });
  }
}
