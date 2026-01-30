"use client";

import { useTranslations } from "next-intl";

export default function BillingPage() {
  const t = useTranslations("dashboard.settings.billing");

  return (
    <div className="space-y-6">
      {/* 현재 플랜 */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-card-foreground">
          {t("currentPlan")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("currentPlanDesc")}
        </p>

        <div className="mt-6 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div>
            <p className="font-semibold text-blue-900">Free</p>
            <p className="text-sm text-blue-700">$0 / month</p>
          </div>
          <button
            type="button"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            {t("upgrade")}
          </button>
        </div>
      </div>

      {/* 결제 수단 */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-card-foreground">
          {t("paymentMethod")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("paymentMethodDesc")}
        </p>

        <div className="mt-6 rounded-lg border-2 border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">{t("noPaymentMethod")}</p>
          <button
            type="button"
            className="mt-4 rounded-lg border border-border px-4 py-2 text-sm font-medium text-subtle-foreground transition-colors hover:bg-hover"
          >
            {t("addPaymentMethod")}
          </button>
        </div>
      </div>

      {/* 결제 내역 */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-card-foreground">
          {t("history")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("historyDesc")}
        </p>

        <div className="mt-6 text-center py-8">
          <p className="text-sm text-muted-foreground">{t("noHistory")}</p>
        </div>
      </div>
    </div>
  );
}