"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useWorkspace } from "@/contexts/WorkspaceContext";

interface Workspace {
  workspace_id: number;
  type: "team" | "personal";
  name: string;
  owner_id: number;
  memberCount?: number;
}

interface Team {
  id: number;
  name: string;
  description: string | null;
  memberCount?: number;
}

export default function WorkspaceSwitcher() {
  const t = useTranslations("dashboard.workspace");
  const { currentWorkspace, setCurrentWorkspace } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDescription, setNewTeamDescription] = useState("");
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [wsRes, teamRes] = await Promise.all([
        fetch("/api/me/workspaces"),
        fetch("/api/me/teams"),
      ]);
      const wsData = await wsRes.json();
      const teamData = await teamRes.json();
      setWorkspaces(wsData.workspaces || []);
      setTeams(teamData.teams || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (workspace: Workspace) => {
    setCurrentWorkspace(workspace);
    setIsOpen(false);
  };

  // 개인 워크스페이스들
  const personalWorkspaces = workspaces.filter((w) => w.type === "personal");

  // 현재 선택된 워크스페이스가 어느 팀 소속인지 표시
  const currentTeam =
    currentWorkspace?.type === "team"
      ? teams.find((t) => t.id === currentWorkspace.owner_id)
      : null;

  return (
    <>
      <div ref={dropdownRef} className="relative">
        {/* 현재 선택된 워크스페이스 버튼 */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center justify-between gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-left transition-all hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 ${
                currentWorkspace?.type === "personal"
                  ? "bg-gradient-to-br from-violet-500 to-purple-600 shadow-md"
                  : "bg-gradient-to-br from-blue-500 to-cyan-600 shadow-md"
              }`}
            >
              {currentWorkspace?.type === "personal" ? (
                <svg
                  className="h-5 w-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              ) : (
                <svg
                  className="h-5 w-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                {currentWorkspace?.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {currentWorkspace?.type === "personal"
                  ? t("personalWorkspace") || "개인 워크스페이스"
                  : currentTeam
                    ? `${currentTeam.name} · ${currentWorkspace?.memberCount || 0} ${t("members")}`
                    : t("teamWorkspace")}
              </p>
            </div>
          </div>
          <svg
            className={`h-5 w-5 text-gray-400 transition-transform flex-shrink-0 ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {/* 드롭다운 */}
        {isOpen && (
          <div className="absolute left-0 top-full z-50 mt-2 w-full min-w-[320px] max-h-[420px] overflow-y-auto overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl">
            {/* 개인 워크스페이스 섹션 */}
            <div className="p-2">
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {t("personal")}
                </span>
              </div>
              {personalWorkspaces.length > 0 ? (
                personalWorkspaces.map((ws) => (
                  <button
                    key={ws.workspace_id}
                    type="button"
                    onClick={() => handleSelect(ws)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all ${
                      currentWorkspace?.workspace_id === ws.workspace_id
                        ? "bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500/20"
                        : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    }`}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 shadow-sm">
                      <svg
                        className="h-4 w-4 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                        {ws.name}
                      </p>
                    </div>
                    {currentWorkspace?.workspace_id === ws.workspace_id && (
                      <svg
                        className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </button>
                ))
              ) : (
                <p className="px-3 py-2 text-xs text-gray-400">
                  {t("noWorkspaces") || "워크스페이스 없음"}
                </p>
              )}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700" />

            {/* 팀 섹션 */}
            <div className="p-2">
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {t("teams")}
                </span>
              </div>

              {teams.length > 0 ? (
                <div className="space-y-1">
                  {teams.map((team) => (
                    <button
                      key={team.id}
                      type="button"
                      onClick={() => {
                        // 팀의 워크스페이스를 찾아서 선택
                        const teamWs = workspaces.find(
                          (w) => w.type === "team" && w.owner_id === team.id
                        );
                        if (teamWs) handleSelect(teamWs);
                      }}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all ${
                        currentWorkspace?.type === "team" &&
                        currentWorkspace?.owner_id === team.id
                          ? "bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500/20"
                          : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      }`}
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 shadow-sm">
                        <svg
                          className="h-4 w-4 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {team.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {team.memberCount} {t("members")}
                        </p>
                      </div>
                      {currentWorkspace?.type === "team" &&
                        currentWorkspace?.owner_id === team.id && (
                          <svg
                            className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-3 py-6 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {t("noTeams") || "No teams yet"}
                  </p>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700" />

            {/* 새 팀 생성 버튼 */}
            <div className="p-2">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setShowCreateModal(true);
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-blue-600 dark:text-blue-400 transition-all hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-dashed border-blue-300 dark:border-blue-600">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </div>
                <span className="text-sm font-semibold">
                  {t("createTeam")}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 팀 생성 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-2xl">
            <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {t("createNewTeam") || "Create New Team"}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t("createTeamDescription") ||
                  "Create a team workspace to collaborate with others"}
              </p>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newTeamName.trim()) return;

                try {
                  setIsCreatingTeam(true);
                  const response = await fetch("/api/me/teams", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      name: newTeamName.trim(),
                      description: newTeamDescription.trim() || null,
                    }),
                  });

                  if (!response.ok) {
                    throw new Error("Failed to create team");
                  }

                  await fetchData();
                  setShowCreateModal(false);
                  setNewTeamName("");
                  setNewTeamDescription("");
                } catch (error) {
                  console.error("Failed to create team:", error);
                  alert(t("createTeamError") || "Failed to create team");
                } finally {
                  setIsCreatingTeam(false);
                }
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label
                  htmlFor="teamName"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                >
                  {t("teamName") || "Team Name"}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  id="teamName"
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder={
                    t("teamNamePlaceholder") || "e.g., Marketing Team"
                  }
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                  disabled={isCreatingTeam}
                  autoFocus
                />
              </div>

              <div>
                <label
                  htmlFor="teamDescription"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                >
                  {t("teamDescription") || "Description"}{" "}
                  <span className="text-gray-400 text-xs">(Optional)</span>
                </label>
                <textarea
                  id="teamDescription"
                  value={newTeamDescription}
                  onChange={(e) => setNewTeamDescription(e.target.value)}
                  placeholder={
                    t("teamDescriptionPlaceholder") ||
                    "What's this team about?"
                  }
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                  disabled={isCreatingTeam}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewTeamName("");
                    setNewTeamDescription("");
                  }}
                  disabled={isCreatingTeam}
                  className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {t("cancel") || "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={isCreatingTeam || !newTeamName.trim()}
                  className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  {isCreatingTeam ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg
                        className="animate-spin h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      {t("creating") || "Creating..."}
                    </span>
                  ) : (
                    t("create") || "Create Team"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}