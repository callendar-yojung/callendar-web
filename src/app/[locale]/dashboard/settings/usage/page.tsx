"use client";

import { useTranslations } from "next-intl";

export default function UsagePage() {
  const t = useTranslations("dashboard.settings.usage");

  return (
    <div className="space-y-6">
      {/* 스토리지 */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-card-foreground">
          {t("storage")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("storageDesc")}
        </p>

        <div className="mt-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">1.2 GB / 5 GB</span>
            <span className="text-muted-foreground">24%</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full w-[24%] rounded-full bg-blue-600" />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">{t("documents")}</p>
              <p className="font-medium text-card-foreground">0.8 GB</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("files")}</p>
              <p className="font-medium text-card-foreground">0.3 GB</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("other")}</p>
              <p className="font-medium text-card-foreground">0.1 GB</p>
            </div>
          </div>
        </div>
      </div>

      {/* API 호출 */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-card-foreground">
          {t("api")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("apiDesc")}
        </p>

        <div className="mt-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">1,234 / 10,000 {t("requests")}</span>
            <span className="text-muted-foreground">12%</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full w-[12%] rounded-full bg-green-600" />
          </div>
        </div>
      </div>

      {/* 팀 멤버 */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-card-foreground">
          {t("teamMembers")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("teamMembersDesc")}
        </p>

        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm">
            <span className="text-2xl font-bold text-card-foreground">4</span>
            <span className="ml-1 text-muted-foreground">/ 5 {t("members")}</span>
          </div>
          <button
            type="button"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            {t("inviteMember")}
          </button>
        </div>
      </div>

      {/* 활동 통계 */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-card-foreground">
          {t("activity")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("activityDesc")}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg bg-subtle p-4">
            <p className="text-sm text-muted-foreground">{t("tasksCreated")}</p>
            <p className="mt-1 text-2xl font-bold text-card-foreground">24</p>
            <p className="text-xs text-muted-foreground">{t("thisMonth")}</p>
          </div>
          <div className="rounded-lg bg-subtle p-4">
            <p className="text-sm text-muted-foreground">{t("tasksCompleted")}</p>
            <p className="mt-1 text-2xl font-bold text-card-foreground">18</p>
            <p className="text-xs text-muted-foreground">{t("thisMonth")}</p>
          </div>
          <div className="rounded-lg bg-subtle p-4">
            <p className="text-sm text-muted-foreground">{t("comments")}</p>
            <p className="mt-1 text-2xl font-bold text-card-foreground">56</p>
            <p className="text-xs text-muted-foreground">{t("thisMonth")}</p>
          </div>
          <div className="rounded-lg bg-subtle p-4">
            <p className="text-sm text-muted-foreground">{t("meetings")}</p>
            <p className="mt-1 text-2xl font-bold text-card-foreground">8</p>
            <p className="text-xs text-muted-foreground">{t("thisMonth")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}