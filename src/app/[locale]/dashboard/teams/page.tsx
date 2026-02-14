"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { PERMISSIONS } from "@/lib/permissions";

interface Team {
  id: number;
  name: string;
  description: string | null;
  created_by: number;
  memberCount?: number;
}

interface TeamMember {
  member_id: number;
  nickname: string | null;
  email: string | null;
  role_name: string | null;
  role_id: number | null;
}

interface Plan {
  id: number;
  name: string;
  price: number;
  max_members: number;
  plan_type: "personal" | "team";
}

interface TeamPermission {
  permission_id: number;
  code: string;
  description: string | null;
}

interface TeamRole {
  team_role_id: number;
  name: string;
  memberCount?: number;
}

export default function TeamSettingsPage() {
  const t = useTranslations("dashboard.teamSettings");
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [roles, setRoles] = useState<TeamRole[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [rolePermissions, setRolePermissions] = useState<TeamPermission[]>([]);
  const [roleName, setRoleName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [memberRoleId, setMemberRoleId] = useState<number | null>(null);
  const [selectedAvailable, setSelectedAvailable] = useState<string | null>(null);
  const [selectedAssigned, setSelectedAssigned] = useState<string | null>(null);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [loadingRolePermissions, setLoadingRolePermissions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentMemberId, setCurrentMemberId] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const selectedTeam = useMemo(
    () => teams.find((t) => t.id === selectedTeamId) || null,
    [teams, selectedTeamId]
  );

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        setLoadingTeams(true);
        const meRes = await fetch("/api/me/account");
        const meData = await meRes.json();
        setCurrentMemberId(meData.member_id);

        const res = await fetch("/api/me/teams");
        const data = await res.json();
        const list = data.teams || [];
        setTeams(list);
        if (list.length > 0) {
          setSelectedTeamId(list[0].id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingTeams(false);
      }
    };
    fetchTeams();
  }, []);

  useEffect(() => {
    if (!selectedTeamId) return;

    const fetchMembers = async () => {
      try {
        setLoadingMembers(true);
        const res = await fetch(`/api/teams/${selectedTeamId}/members`);
        const data = await res.json();
        setMembers(data.members || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingMembers(false);
      }
    };

    const fetchRoles = async () => {
      try {
        setLoadingRoles(true);
        const res = await fetch(`/api/teams/${selectedTeamId}/roles`);
        const data = await res.json();
        const list = data.roles || [];
        setRoles(list);
        if (list.length > 0) {
          setSelectedRoleId((prev) =>
            prev && list.some((role: TeamRole) => role.team_role_id === prev)
              ? prev
              : list[0].team_role_id
          );
          const memberRole =
            list.find((role: TeamRole) => role.name === "Member") ||
            list[0];
          setMemberRoleId(memberRole.team_role_id);
        } else {
          setSelectedRoleId(null);
          setMemberRoleId(null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingRoles(false);
      }
    };

    const fetchPlan = async () => {
      try {
        const subRes = await fetch(
          `/api/subscriptions?owner_id=${selectedTeamId}&owner_type=team&active=true`
        );
        const subData = await subRes.json();
        if (subData?.plan_id) {
          const planRes = await fetch(`/api/plans?id=${subData.plan_id}`);
          const planData = await planRes.json();
          setPlan(planData);
          return;
        }

        const plansRes = await fetch("/api/plans");
        const plansData = await plansRes.json();
        const teamPlans = (plansData || []).filter(
          (p: Plan) => p.plan_type === "team"
        );
        if (teamPlans.length > 0) {
          teamPlans.sort((a: Plan, b: Plan) => a.price - b.price);
          setPlan(teamPlans[0]);
        }
      } catch (err) {
        console.error(err);
      }
    };

    const fetchTeam = async () => {
      try {
        const res = await fetch(`/api/teams/${selectedTeamId}`);
        const data = await res.json();
        setIsAdmin(Boolean(data?.team?.created_by === currentMemberId));
      } catch (err) {
        console.error(err);
      }
    };

    fetchMembers();
    fetchRoles();
    fetchPlan();
    fetchTeam();
  }, [selectedTeamId, currentMemberId]);

  useEffect(() => {
    if (!selectedTeamId || !selectedRoleId) return;
    const fetchRolePermissions = async () => {
      try {
        setLoadingRolePermissions(true);
        const res = await fetch(
          `/api/teams/${selectedTeamId}/roles/${selectedRoleId}/permissions`
        );
        const data = await res.json();
        setRolePermissions(data.permissions || []);
        setSelectedAvailable(null);
        setSelectedAssigned(null);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingRolePermissions(false);
      }
    };
    fetchRolePermissions();
  }, [selectedTeamId, selectedRoleId]);

  const handleAddMember = async () => {
    if (!selectedTeamId || !identifier.trim()) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/teams/${selectedTeamId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim(),
          role_id: memberRoleId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("errorAddMember"));
        return;
      }
      setIdentifier("");
      const membersRes = await fetch(`/api/teams/${selectedTeamId}/members`);
      const membersData = await membersRes.json();
      setMembers(membersData.members || []);
    } catch (err) {
      console.error(err);
      setError(t("errorAddMember"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: number) => {
    if (!selectedTeamId) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/teams/${selectedTeamId}/members?member_id=${memberId}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("errorRemoveMember"));
        return;
      }
      const membersRes = await fetch(`/api/teams/${selectedTeamId}/members`);
      const membersData = await membersRes.json();
      setMembers(membersData.members || []);
    } catch (err) {
      console.error(err);
      setError(t("errorRemoveMember"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateRole = async () => {
    if (!selectedTeamId || !roleName.trim()) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/teams/${selectedTeamId}/roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: roleName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("errorAddRole"));
        return;
      }
      setRoleName("");
      const rolesRes = await fetch(`/api/teams/${selectedTeamId}/roles`);
      const rolesData = await rolesRes.json();
      const list = rolesData.roles || [];
      setRoles(list);
      if (data.role_id) {
        setSelectedRoleId(Number(data.role_id));
      }
    } catch (err) {
      console.error(err);
      setError(t("errorAddRole"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteRole = async (roleId: number) => {
    if (!selectedTeamId) return;
    if (!confirm(t("confirmDeleteRole"))) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/teams/${selectedTeamId}/roles?role_id=${roleId}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("errorDeleteRole"));
        return;
      }
      const rolesRes = await fetch(`/api/teams/${selectedTeamId}/roles`);
      const rolesData = await rolesRes.json();
      const list = rolesData.roles || [];
      setRoles(list);
      if (selectedRoleId === roleId) {
        setSelectedRoleId(list[0]?.team_role_id ?? null);
      }
    } catch (err) {
      console.error(err);
      setError(t("errorDeleteRole"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveRolePermissions = async () => {
    if (!selectedTeamId || !selectedRoleId) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/teams/${selectedTeamId}/roles/${selectedRoleId}/permissions`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            codes: rolePermissions.map((p) => p.code),
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("errorSavePermissions"));
        return;
      }
    } catch (err) {
      console.error(err);
      setError(t("errorSavePermissions"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleTogglePermission = (code: string) => {
    setRolePermissions((prev) => {
      const exists = prev.some((p) => p.code === code);
      if (exists) {
        return prev.filter((p) => p.code !== code);
      }
      return [...prev, { permission_id: -1, code, description: null }];
    });
  };

  const handleAssignPermission = () => {
    if (!selectedAvailable) return;
    handleTogglePermission(selectedAvailable);
    setSelectedAvailable(null);
  };

  const handleUnassignPermission = () => {
    if (!selectedAssigned) return;
    handleTogglePermission(selectedAssigned);
    setSelectedAssigned(null);
  };

  const handleChangeMemberRole = async (memberId: number, roleId: number) => {
    if (!selectedTeamId) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/teams/${selectedTeamId}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_id: memberId, role_id: roleId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("errorUpdateMemberRole"));
        return;
      }
      const membersRes = await fetch(`/api/teams/${selectedTeamId}/members`);
      const membersData = await membersRes.json();
      setMembers(membersData.members || []);
    } catch (err) {
      console.error(err);
      setError(t("errorUpdateMemberRole"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (!selectedTeamId) return;
    if (!confirm(t("confirmDelete"))) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/teams/${selectedTeamId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("errorDeleteTeam"));
        return;
      }
      const nextTeams = teams.filter((t) => t.id !== selectedTeamId);
      setTeams(nextTeams);
      setSelectedTeamId(nextTeams[0]?.id ?? null);
      setMembers([]);
    } catch (err) {
      console.error(err);
      setError(t("errorDeleteTeam"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleManagePlan = () => {
    if (!selectedTeamId) return;
    sessionStorage.setItem("pending_team_id", String(selectedTeamId));
    router.push("/dashboard/settings/billing/plans?owner_type=team");
  };

  const memberLimit = plan?.max_members ?? 0;
  const roleOptions = useMemo(() => roles, [roles]);
  const permissionOptions = useMemo(
    () =>
      PERMISSIONS.map((permission) => ({
        code: permission.code,
        label: t(permission.labelKey),
      })),
    [t]
  );
  const selectedRole = useMemo(
    () => roles.find((role) => role.team_role_id === selectedRoleId) || null,
    [roles, selectedRoleId]
  );
  const currentUserRole = useMemo(() => {
    if (!currentMemberId) return null;
    return members.find((member) => member.member_id === currentMemberId) || null;
  }, [members, currentMemberId]);
  const assignedCodes = useMemo(
    () => new Set(rolePermissions.map((permission) => permission.code)),
    [rolePermissions]
  );
  const availablePermissions = useMemo(
    () => permissionOptions.filter((option) => !assignedCodes.has(option.code)),
    [permissionOptions, assignedCodes]
  );
  const assignedPermissions = useMemo(
    () => permissionOptions.filter((option) => assignedCodes.has(option.code)),
    [permissionOptions, assignedCodes]
  );

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
          {currentUserRole && (
            <p className="mt-2 text-xs font-medium text-muted-foreground">
              {t("myRole")}: {currentUserRole.role_name || t("memberRole")}
            </p>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              {t("teams")}
            </h2>
            {loadingTeams ? (
              <p className="text-sm text-muted-foreground">{t("loading")}</p>
            ) : teams.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("noTeams")}
              </p>
            ) : (
              <div className="space-y-2">
                {teams.map((team) => (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => setSelectedTeamId(team.id)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      team.id === selectedTeamId
                        ? "bg-blue-600 text-white"
                        : "hover:bg-accent text-foreground"
                    }`}
                  >
                    <div className="font-medium">{team.name}</div>
                    <div className="text-xs opacity-80">
                      {team.memberCount ?? 0} {t("members")}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-6">
            {!selectedTeam ? (
              <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
                {t("selectTeam")}
              </div>
            ) : (
              <>
                <div className="rounded-lg border border-border bg-card p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold text-foreground">
                        {selectedTeam.name}
                      </h2>
                      {selectedTeam.description && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {selectedTeam.description}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={handleManagePlan}
                          className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
                        >
                          {t("managePlan")}
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={handleDeleteTeam}
                          disabled={actionLoading}
                          className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          {t("deleteTeam")}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 text-sm text-muted-foreground">
                    {plan ? (
                      <span>
                        {t("currentPlan")}: {plan.name} · {t("maxMembers", { count: plan.max_members })}
                      </span>
                    ) : (
                      <span>{t("planLoading")}</span>
                    )}
                  </div>
                </div>

                {!isAdmin ? (
                  <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
                    {t("adminOnly")}
                  </div>
                ) : (
                  <div className="rounded-lg border border-border bg-card p-6">
                    <h3 className="text-lg font-semibold text-foreground">
                      {t("membersTitle")}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("membersDesc")}
                    </p>

                    <div className="mt-4 grid gap-2 md:grid-cols-3">
                      <input
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder={t("memberPlaceholder")}
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm md:col-span-2"
                      />
                      <select
                        value={memberRoleId ?? ""}
                        onChange={(e) =>
                          setMemberRoleId(
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      >
                        <option value="">{t("memberRoleSelect")}</option>
                        {roleOptions.map((role) => (
                          <option key={role.team_role_id} value={role.team_role_id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={handleAddMember}
                        disabled={
                          actionLoading ||
                          !identifier.trim() ||
                          !memberRoleId ||
                          (memberLimit > 0 && members.length >= memberLimit)
                        }
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {t("addMember")}
                      </button>
                    </div>

                    {memberLimit > 0 && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {t("memberCount", {
                          current: members.length,
                          max: memberLimit,
                        })}
                      </p>
                    )}

                    {error && (
                      <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                        {error}
                      </div>
                    )}

                    <div className="mt-4">
                      {loadingMembers ? (
                        <p className="text-sm text-muted-foreground">
                          {t("loading")}
                        </p>
                      ) : members.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          {t("noMembers")}
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {members.map((m) => (
                            <div
                              key={m.member_id}
                              className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2"
                            >
                              <div>
                                <div className="text-sm font-medium text-foreground">
                                  {m.nickname || m.email || `#${m.member_id}`}
                                </div>
                                {m.email && (
                                  <div className="text-xs text-muted-foreground">
                                    {m.email}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {m.member_id === selectedTeam?.created_by ? (
                                  <span>{t("ownerRole")}</span>
                                ) : (
                                  <select
                                    value={m.role_id ?? ""}
                                    onChange={(e) =>
                                      handleChangeMemberRole(
                                        m.member_id,
                                        Number(e.target.value)
                                      )
                                    }
                                    className="rounded border border-border bg-background px-2 py-1 text-xs"
                                  >
                                    {roleOptions.map((role) => (
                                      <option key={role.team_role_id} value={role.team_role_id}>
                                        {role.name}
                                      </option>
                                    ))}
                                  </select>
                                )}
                                {m.member_id !== currentMemberId && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveMember(m.member_id)}
                                    className="rounded border border-red-200 px-2 py-1 text-red-600 hover:bg-red-50"
                                  >
                                    {t("remove")}
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {isAdmin && (
                  <div className="space-y-6">
                    <div className="rounded-lg border border-border bg-card p-6">
                      <h3 className="text-lg font-semibold text-foreground">
                        {t("rolesTitle")}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t("rolesDesc")}
                      </p>

                      <div className="mt-4 flex gap-2">
                        <input
                          value={roleName}
                          onChange={(e) => setRoleName(e.target.value)}
                          placeholder={t("roleNamePlaceholder")}
                          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                        />
                        <button
                          type="button"
                          onClick={handleCreateRole}
                          disabled={actionLoading || !roleName.trim()}
                          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          {t("addRole")}
                        </button>
                      </div>

                      <div className="mt-4 space-y-2">
                        {loadingRoles ? (
                          <p className="text-sm text-muted-foreground">
                            {t("loading")}
                          </p>
                        ) : roles.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            {t("noRoles")}
                          </p>
                        ) : (
                          roles.map((role) => (
                            <div
                              key={role.team_role_id}
                              className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm"
                            >
                              <div className="font-medium text-foreground">
                                {role.name}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>
                                  {t("roleMembers", {
                                    count: role.memberCount ?? 0,
                                  })}
                                </span>
                                {role.name !== "Owner" && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteRole(role.team_role_id)}
                                    className="rounded border border-red-200 px-2 py-1 text-red-600 hover:bg-red-50"
                                  >
                                    {t("remove")}
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="rounded-lg border border-border bg-card p-6">
                      <h3 className="text-lg font-semibold text-foreground">
                        {t("permissionsTitle")}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t("permissionsDesc")}
                      </p>

                      <div className="mt-4 flex gap-2">
                        <select
                          value={selectedRoleId ?? ""}
                          onChange={(e) =>
                            setSelectedRoleId(
                              e.target.value ? Number(e.target.value) : null
                            )
                          }
                          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                        >
                          <option value="">{t("roleSelect")}</option>
                          {roleOptions.map((role) => (
                            <option key={role.team_role_id} value={role.team_role_id}>
                              {role.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={handleSaveRolePermissions}
                          disabled={
                            actionLoading ||
                            !selectedRoleId ||
                            selectedRole?.name === "Owner"
                          }
                          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          {t("savePermissions")}
                        </button>
                      </div>

                      <div className="mt-4">
                        {loadingRolePermissions ? (
                          <p className="text-sm text-muted-foreground">
                            {t("loading")}
                          </p>
                        ) : !selectedRoleId ? (
                          <p className="text-sm text-muted-foreground">
                            {t("selectRole")}
                          </p>
                        ) : (
                          <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr]">
                            <div>
                              <div className="text-xs font-medium text-muted-foreground">
                                {t("availablePermissions")}
                              </div>
                              <div className="mt-2 rounded-lg border border-border bg-background">
                                <div className="max-h-64 overflow-auto">
                                  {availablePermissions.length === 0 ? (
                                    <p className="p-3 text-xs text-muted-foreground">
                                      {t("noAvailablePermissions")}
                                    </p>
                                  ) : (
                                    availablePermissions.map((option) => (
                                      <button
                                        key={option.code}
                                        type="button"
                                        onClick={() => setSelectedAvailable(option.code)}
                                        className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                                          selectedAvailable === option.code
                                            ? "bg-blue-50 text-blue-700"
                                            : "hover:bg-accent"
                                        }`}
                                      >
                                        <span>{option.label}</span>
                                        <span className="text-xs text-muted-foreground">
                                          {option.code}
                                        </span>
                                      </button>
                                    ))
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={handleAssignPermission}
                                disabled={
                                  !selectedAvailable ||
                                  selectedRole?.name === "Owner"
                                }
                                className="rounded border border-border px-3 py-1 text-sm hover:bg-accent disabled:opacity-50"
                              >
                                {t("addPermissionArrow")}
                              </button>
                              <button
                                type="button"
                                onClick={handleUnassignPermission}
                                disabled={
                                  !selectedAssigned ||
                                  selectedRole?.name === "Owner"
                                }
                                className="rounded border border-border px-3 py-1 text-sm hover:bg-accent disabled:opacity-50"
                              >
                                {t("removePermissionArrow")}
                              </button>
                            </div>

                            <div>
                              <div className="text-xs font-medium text-muted-foreground">
                                {t("assignedPermissions")}
                              </div>
                              <div className="mt-2 rounded-lg border border-border bg-background">
                                <div className="max-h-64 overflow-auto">
                                  {assignedPermissions.length === 0 ? (
                                    <p className="p-3 text-xs text-muted-foreground">
                                      {t("noAssignedPermissions")}
                                    </p>
                                  ) : (
                                    assignedPermissions.map((option) => (
                                      <button
                                        key={option.code}
                                        type="button"
                                        onClick={() => setSelectedAssigned(option.code)}
                                        className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                                          selectedAssigned === option.code
                                            ? "bg-blue-50 text-blue-700"
                                            : "hover:bg-accent"
                                        }`}
                                      >
                                        <span>{option.label}</span>
                                        <span className="text-xs text-muted-foreground">
                                          {option.code}
                                        </span>
                                      </button>
                                    ))
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
