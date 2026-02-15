import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-helper";
import { checkTeamMembership, getTeamById } from "@/lib/team";
import { findMemberByEmailOrNickname, findMemberById } from "@/lib/member";
import { getActivePlanForOwner } from "@/lib/storage";
import pool from "@/lib/db";
import type { RowDataPacket } from "mysql2";
import { upsertTeamInvitation } from "@/lib/invitation";
import { createNotification } from "@/lib/notification";

// POST /api/teams/{id}/invitations
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const teamId = Number(id);
    if (Number.isNaN(teamId)) {
      return NextResponse.json({ error: "Invalid team id" }, { status: 400 });
    }

    const team = await getTeamById(teamId);
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }
    if (team.created_by !== user.memberId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const invitedMemberId = Number(body?.invited_member_id);
    const identifier = typeof body?.identifier === "string" ? body.identifier.trim() : "";
    if (!identifier && Number.isNaN(invitedMemberId)) {
      return NextResponse.json({ error: "identifier is required" }, { status: 400 });
    }

    const member = Number.isFinite(invitedMemberId)
      ? await findMemberById(invitedMemberId)
      : await findMemberByEmailOrNickname(identifier);
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const alreadyMember = await checkTeamMembership(teamId, member.member_id);
    if (alreadyMember) {
      return NextResponse.json({ error: "Already a member" }, { status: 400 });
    }

    const planInfo = await getActivePlanForOwner("team", teamId);
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM team_members WHERE team_id = ?`,
      [teamId]
    );
    const currentCount = Number(rows[0]?.count || 0);
    if (currentCount >= planInfo.max_members) {
      return NextResponse.json({ error: "Member limit reached" }, { status: 400 });
    }

    const invitationId = await upsertTeamInvitation({
      teamId,
      invitedMemberId: member.member_id,
      invitedBy: user.memberId,
    });

    await createNotification({
      member_id: member.member_id,
      type: "TEAM_INVITE",
      title: "Team invitation",
      message: `${team.name} invited you to join the team.`,
      payload: { team_id: teamId, invitation_id: invitationId },
      source_type: "TEAM_INVITE",
      source_id: invitationId,
    });

    return NextResponse.json({ success: true, invitation_id: invitationId });
  } catch (error) {
    console.error("Failed to create invitation:", error);
    return NextResponse.json({ error: "Failed to invite member" }, { status: 500 });
  }
}
