"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PayPalButton from "@/components/dashboard/PayPalButton";

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
  const planId = searchParams.get("plan_id");
  const ownerType = searchParams.get("owner_type") as "team" | "personal" | null;
  const ownerId = searchParams.get("owner_id");

  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [ownerName, setOwnerName] = useState<string>("");

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
        setOwnerName(meData.nickname || "개인");
      } else {
        const teamsRes = await fetch("/api/me/teams");
        const teamsData = await teamsRes.json();
        const team = teamsData.teams?.find((t: any) => t.id === id);
        setOwnerName(team?.name || "팀");
      }
    } catch (error) {
      console.error("Failed to fetch owner info:", error);
    }
  };

  const handlePayPalSuccess = () => {
    alert("PayPal 결제가 완료되었습니다!");
    router.push("/dashboard/settings/billing");
  };

  const handlePayPalError = (error: any) => {
    console.error("PayPal Error:", error);
    alert("PayPal 결제 처리 중 오류가 발생했습니다.");
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
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-foreground">PayPal로 결제하기</h1>
          <p className="mt-2 text-muted-foreground">
            PayPal 계정으로 안전하게 결제하실 수 있습니다
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* 주문 요약 */}
          <div className="lg:col-span-1">
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="text-lg font-semibold text-card-foreground">
                주문 요약
              </h2>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">구독 대상</span>
                  <div className="flex items-center gap-2">
                    {ownerType === "personal" ? (
                      <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-2 py-1 rounded-full">
                        개인
                      </span>
                    ) : (
                      <span className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 px-2 py-1 rounded-full">
                        팀
                      </span>
                    )}
                    <span className="text-sm font-medium text-foreground">
                      {ownerName}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">플랜</span>
                  <span className="font-semibold text-foreground">
                    {plan.name}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    최대 멤버
                  </span>
                  <span className="text-sm text-foreground">
                    {plan.max_members}명
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    저장소
                  </span>
                  <span className="text-sm text-foreground">
                    {(plan.max_storage_mb / 1000).toFixed(1)}GB
                  </span>
                </div>
                <div className="border-t border-border pt-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">
                      월 결제액
                    </span>
                    <span className="text-xl font-bold text-foreground">
                      ₩{plan.price.toLocaleString()}
                    </span>
                  </div>
                </div>
                {plan.paypal_plan_id && (
                  <div className="pt-3 border-t border-border">
                    <div className="flex items-center gap-2">
                      <span className="text-blue-500">🅿️</span>
                      <span className="text-xs text-muted-foreground">
                        PayPal 구독 플랜 연동됨
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* PayPal 결제 */}
          <div className="lg:col-span-2">
            <div className="space-y-6">
              <div className="rounded-lg border border-border bg-card p-6">
                <div className="mb-6 flex items-center justify-center">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">🅿️</span>
                    <h2 className="text-2xl font-semibold text-card-foreground">
                      PayPal
                    </h2>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-6 text-center">
                  PayPal 계정으로 안전하게 구독 결제하실 수 있습니다.
                </p>

                {!plan.paypal_plan_id && (
                  <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      ⚠️ 이 플랜은 아직 PayPal 구독이 설정되지 않았습니다. 관리자에게 문의하세요.
                    </p>
                  </div>
                )}

                {plan ? (
                  <PayPalButton
                    planId={plan.id}
                    paypalPlanId={plan.paypal_plan_id}
                    ownerId={Number(ownerId)}
                    ownerType={ownerType}
                    onSuccess={handlePayPalSuccess}
                    onError={handlePayPalError}
                  />
                ) : (
                  <div className="text-center text-muted-foreground">
                    플랜 정보를 불러오는 중...
                  </div>
                )}
              </div>

              {/* 약관 동의 */}
              <div className="rounded-lg border border-border bg-card p-6">
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id="terms-paypal"
                    required
                    className="mt-1 h-4 w-4 rounded border-border text-blue-600 focus:ring-blue-500"
                  />
                  <label
                    htmlFor="terms-paypal"
                    className="ml-2 text-sm text-muted-foreground"
                  >
                    이용약관 및 개인정보 처리방침에 동의합니다
                  </label>
                </div>
              </div>

              <p className="text-center text-xs text-muted-foreground">
                🔒 모든 결제 정보는 암호화되어 안전하게 처리됩니다
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
