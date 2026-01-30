"use client";

import { Link, usePathname } from "@/i18n/routing";
import { useTranslations } from "next-intl";

const settingsNav = [
  { key: "general", href: "/dashboard/settings", icon: "⚙️" },
  { key: "account", href: "/dashboard/settings/account", icon: "👤" },
  { key: "privacy", href: "/dashboard/settings/privacy", icon: "🔒" },
  { key: "billing", href: "/dashboard/settings/billing", icon: "💳" },
  { key: "usage", href: "/dashboard/settings/usage", icon: "📊" },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("dashboard.settings");
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {t("title")}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* 사이드바 */}
        <aside className="w-full lg:w-64">
          <nav className="space-y-1 rounded-lg border border-border bg-card p-2">
            {settingsNav.map((item) => {
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-active text-foreground"
                      : "text-muted-foreground hover:bg-hover hover:text-foreground"
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  {t(`nav.${item.key}`)}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* 콘텐츠 */}
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}