"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import PayPalButton from "@/components/dashboard/PayPalButton";
import NicePayButton from "@/components/dashboard/NicePayButton";

interface Plan {
  id: number;
  name: string;
  price: number;
  max_members: number;
  max_storage_mb: number;
  paypal_plan_id?: string | null;
  paypal_product_id?: string | null;
}

function CheckoutContent() {
  const t = useTranslations("dashboard.settings.billing");
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const planId = searchParams.get("plan_id");
  const ownerType = searchParams.get("owner_type") as "team" | "personal" | null;
  const ownerId = searchParams.get("owner_id");
  const nicepayStatus = searchParams.get("nicepay");
  const nicepayMessage = searchParams.get("message");

  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [ownerName, setOwnerName] = useState<string>("");

  const isKorean = locale === "ko";

  useEffect(() => {
    if (planId && ownerType && ownerId) {
      fetchPlan(Number(planId));
      fetchOwnerInfo(ownerType, Number(ownerId));
    }
  }, [planId, ownerType, ownerId]);

  const fetchPlan = async (id: number) => {
    try {
      const res = await fetch(`/api/plans?id=${id}`);
      const data = await res.json();
      setPlan(data);
    } catch (error) {
      console.error("Failed to fetch plan:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOwnerInfo = async (type: "team" | "personal", id: number) => {
    try {
      if (type === "personal") {
        const meRes = await fetch("/api/me/account");
        const meData = await meRes.json();
        setOwnerName(meData.nickname || t("checkout.personal"));
      } else {
        const teamsRes = await fetch("/api/me/teams");
        const teamsData = await teamsRes.json();
        const team = teamsData.teams?.find((t: any) => t.id === id);
        setOwnerName(team?.name || t("checkout.team"));
      }
    } catch (error) {
      console.error("Failed to fetch owner info:", error);
    }
  };

  const handlePayPalSuccess = () => {
    alert(t("checkout.nicepay.success"));
    router.push("/dashboard/settings/billing");
  };

  const handlePayPalError = (error: any) => {
    console.error("PayPal Error:", error);
    alert(t("checkout.nicepay.error"));
  };

  const handleNicePayError = (errorMsg: string) => {
    console.error("NicePay Error:", errorMsg);
  };

  if (loading || !plan || !ownerType || !ownerId) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-4xl">
        {/* 헤더 */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="mb-4 text-sm text-muted-foreground hover:text-foreground"
          >
            &larr; {t("checkout.back")}
          </button>
          <h1 className="text-3xl font-bold text-foreground">
            {t("checkout.title")}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {t("checkout.description")}
          </p>
        </div>

        {/* NicePay 결제 실패 메시지 */}
        {nicepayStatus === "failed" && nicepayMessage && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">
              {nicepayMessage}
            </p>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* 주문 요약 */}
          <div className="lg:col-span-1">
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="text-lg font-semibold text-card-foreground">
                {t("checkout.orderSummary")}
              </h2>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t("checkout.subscriptionTarget")}
                  </span>
                  <div className="flex items-center gap-2">
                    {ownerType === "personal" ? (
                      <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-2 py-1 rounded-full">
                        {t("checkout.personal")}
                      </span>
                    ) : (
                      <span className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 px-2 py-1 rounded-full">
                        {t("checkout.team")}
                      </span>
                    )}
                    <span className="text-sm font-medium text-foreground">
                      {ownerName}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t("checkout.plan")}
                  </span>
                  <span className="font-semibold text-foreground">
                    {plan.name}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t("checkout.maxMembers")}
                  </span>
                  <span className="text-sm text-foreground">
                    {plan.max_members}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t("checkout.storage")}
                  </span>
                  <span className="text-sm text-foreground">
                    {(plan.max_storage_mb / 1000).toFixed(1)}GB
                  </span>
                </div>
                <div className="border-t border-border pt-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">
                      {t("checkout.monthlyPayment")}
                    </span>
                    <span className="text-xl font-bold text-foreground">
                      {isKorean
                        ? `\u20A9${plan.price.toLocaleString()}`
                        : `$${plan.price.toLocaleString()}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 결제 수단 */}
          <div className="lg:col-span-2">
            <div className="space-y-6">
              <div className="rounded-lg border border-border bg-card p-6">
                {isKorean ? (
                  <>
                    {/* NicePay 카드 결제 */}
                    <div className="mb-6 flex items-center justify-center">
                      <h2 className="text-2xl font-semibold text-card-foreground">
                        {t("checkout.nicepay.title")}
                      </h2>
                    </div>

                    <p className="text-sm text-muted-foreground mb-6 text-center">
                      {t("checkout.nicepay.description")}
                    </p>

                    <NicePayButton
                      planId={plan.id}
                      amount={plan.price}
                      goodsName={`Pecal ${plan.name}`}
                      ownerId={Number(ownerId)}
                      ownerType={ownerType}
                      onError={handleNicePayError}
                    />
                  </>
                ) : (
                  <>
                    {/* PayPal */}
                    <div className="mb-6 flex items-center justify-center">
                      <h2 className="text-2xl font-semibold text-card-foreground">
                        {t("checkout.paypal.title")}
                      </h2>
                    </div>

                    <p className="text-sm text-muted-foreground mb-6 text-center">
                      {t("checkout.paypal.description")}
                    </p>

                    {!plan.paypal_plan_id && (
                      <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                          {t("checkout.paypal.notConfigured")}
                        </p>
                      </div>
                    )}

                    <PayPalButton
                      planId={plan.id}
                      paypalPlanId={plan.paypal_plan_id}
                      ownerId={Number(ownerId)}
                      ownerType={ownerType}
                      onSuccess={handlePayPalSuccess}
                      onError={handlePayPalError}
                    />
                  </>
                )}
              </div>

              {/* 약관 동의 */}
              <div className="rounded-lg border border-border bg-card p-6">
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id="terms"
                    required
                    className="mt-1 h-4 w-4 rounded border-border text-blue-600 focus:ring-blue-500"
                  />
                  <label
                    htmlFor="terms"
                    className="ml-2 text-sm text-muted-foreground"
                  >
                    {t("checkout.termsAgree")}
                  </label>
                </div>
              </div>

              <p className="text-center text-xs text-muted-foreground">
                {t("checkout.securePayment")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center p-12">Loading...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
