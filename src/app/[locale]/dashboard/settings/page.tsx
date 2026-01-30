"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/routing";
import { useTheme } from "@/contexts/ThemeContext";

export default function SettingsPage() {
  const t = useTranslations("dashboard.settings");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  const [language, setLanguage] = useState(locale);
  const [timezone, setTimezone] = useState("Asia/Seoul");
  const [notifications, setNotifications] = useState(true);

  // 쿠키에서 설정 불러오기
  useEffect(() => {
    const savedTimezone = getCookie("timezone");
    const savedNotifications = getCookie("notifications");

    if (savedTimezone) setTimezone(savedTimezone);
    if (savedNotifications) setNotifications(savedNotifications === "true");
  }, []);

  // 쿠키 가져오기
  const getCookie = (name: string): string | null => {
    if (typeof document === "undefined") return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
    return null;
  };

  // 쿠키 설정
  const setCookie = (name: string, value: string, days = 365) => {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
  };

  // 언어 변경
  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    setCookie("NEXT_LOCALE", newLanguage);
    router.replace(pathname, { locale: newLanguage as "ko" | "en" });
  };

  // 타임존 변경
  const handleTimezoneChange = (newTimezone: string) => {
    setTimezone(newTimezone);
    setCookie("timezone", newTimezone);
  };

  // 테마 변경
  const handleThemeChange = (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme);
  };

  // 알림 토글
  const handleNotificationsToggle = () => {
    const newValue = !notifications;
    setNotifications(newValue);
    setCookie("notifications", String(newValue));
  };

  // 저장 (모든 설정 확인)
  const handleSave = () => {
    alert(t("general.save") + " " + "✓");
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-card-foreground">
          {t("general.title")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("general.description")}
        </p>

        <div className="mt-6 space-y-4">
          {/* 언어 설정 */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <label className="text-sm font-medium text-card-foreground">
                {t("general.language")}
              </label>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("general.languageDesc")}
              </p>
            </div>
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="ko">Korean</option>
              <option value="en">English</option>
            </select>
          </div>

          {/* 타임존 */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <label className="text-sm font-medium text-card-foreground">
                {t("general.timezone")}
              </label>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("general.timezoneDesc")}
              </p>
            </div>
            <select
              value={timezone}
              onChange={(e) => handleTimezoneChange(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="Asia/Seoul">Seoul (GMT+9)</option>
              <option value="America/New_York">New_York GMT-5)</option>
              <option value="Europe/London">Rundon (GMT+0)</option>
            </select>
          </div>

          {/* 테마 */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <label className="text-sm font-medium text-card-foreground">
                {t("general.theme")}
              </label>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("general.themeDesc")}
              </p>
            </div>
            <select
              value={theme}
              onChange={(e) => handleThemeChange(e.target.value as "light" | "dark" | "system")}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="light">light</option>
              <option value="dark">dark</option>
              <option value="system">system</option>
            </select>
          </div>

          {/* 알림 */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-card-foreground">
                {t("general.notifications")}
              </label>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("general.notificationsDesc")}
              </p>
            </div>
            <button
              type="button"
              onClick={handleNotificationsToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                notifications ? "bg-blue-600" : "bg-muted"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  notifications ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            {t("general.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
