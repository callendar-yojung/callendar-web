import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-helper";
import { respondToInvitation } from "@/lib/invitation";
import { markNotificationsReadBySource } from "@/lib/notification";

// PATCH /api/invitations/{id} { action: 'accept' | 'decline' }
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const invitationId = Number(id);
    if (Number.isNaN(invitationId)) {
      return NextResponse.json({ error: "Invalid invitation id" }, { status: 400 });
    }

    const body = await request.json();
    const action = body?.action === "accept" ? "accept" : body?.action === "decline" ? "decline" : null;
    if (!action) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const result = await respondToInvitation({
      invitationId,
      memberId: user.memberId,
      action,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.message || "Failed" }, { status: 400 });
    }

    await markNotificationsReadBySource(user.memberId, "TEAM_INVITE", invitationId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to respond invitation:", error);
    return NextResponse.json({ error: "Failed to respond invitation" }, { status: 500 });
  }
}
