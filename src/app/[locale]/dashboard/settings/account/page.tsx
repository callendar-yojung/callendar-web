"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";

export default function AccountPage() {
  const t = useTranslations("dashboard.settings.account");
  const { data: session, update: updateSession } = useSession();
  const [nickname, setNickname] = useState(session?.user?.nickname || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!nickname.trim()) return;
    try {
      setSaving(true);
      setSaved(false);
      const response = await fetch("/api/me/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: nickname.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        setNickname(data.nickname);
        await updateSession({ nickname: data.nickname });
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const err = await response.json();
        alert(err.error || "Failed to update");
      }
    } catch (error) {
      console.error("Failed to update account:", error);
      alert("Failed to update account");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 프로필 정보 */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-card-foreground">
          {t("profile")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("profileDesc")}
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-subtle-foreground">
              {t("name")}
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-subtle-foreground">
              {t("email")}
            </label>
            <input
              type="email"
              defaultValue={session?.user?.email || ""}
              disabled
              className="mt-1 w-full rounded-lg border border-input bg-muted px-3 py-2 text-sm text-muted-foreground"
            />
            <p className="mt-1 text-xs text-muted-foreground">{t("emailDesc")}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "..." : t("save")}
            </button>
            {saved && (
              <span className="text-sm text-green-600 dark:text-green-400">
                Saved!
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 계정 삭제 */}
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6">
        <h2 className="text-lg font-semibold text-destructive">
          {t("deleteAccount")}
        </h2>
        <p className="mt-1 text-sm text-destructive/80">
          {t("deleteAccountDesc")}
        </p>
        <button
          type="button"
          className="mt-4 rounded-lg border border-destructive bg-background px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
        >
          {t("deleteButton")}
        </button>
      </div>
    </div>
  );
}