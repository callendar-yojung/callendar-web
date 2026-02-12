"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Plan {
  id: number;
  name: string;
  price: number;
  max_members: number;
  max_storage_mb: number;
  created_at: string;
}

interface Subscription {
  id: number;
  owner_id: number;
  owner_type: "team" | "personal";
  plan_id: number;
  status: string;
  plan_name?: string;
  plan_price?: number;
}

export default function PlansPage() {
  const t = useTranslations("dashboard.settings.billing.plans");
  const tPricing = useTranslations("pricing");
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);

  // 개인 구독
  const [personalSubscription, setPersonalSubscription] =
    useState<Subscription | null>(null);
  const [currentMemberId, setCurrentMemberId] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // 플랜 목록 가져오기
      const plansRes = await fetch("/api/plans");
      if (!plansRes.ok) {
        console.error("Failed to fetch plans:", plansRes.status);
        return;
      }
      const plansData = await plansRes.json();

      if (!Array.isArray(plansData) || plansData.length === 0) {
        return;
      }

      setPlans(plansData);

      // 현재 사용자 정보 가져오기
      const meRes = await fetch("/api/me/account");
      const meData = await meRes.json();
      const memberId = meData.member_id;
      setCurrentMemberId(memberId);

      // 개인 활성 구독 가져오기
      const personalSubRes = await fetch(
        `/api/subscriptions?owner_id=${memberId}&owner_type=personal&active=true`
      );
      const personalSubData = await personalSubRes.json();

      if (personalSubData && personalSubData.plan_id) {
        setPersonalSubscription(personalSubData);
      } else {
        // Basic 플랜을 기본으로 설정
        const basicPlan = plansData.find((p: Plan) => p.name === "Basic");
        if (basicPlan) {
          setPersonalSubscription({
            id: 0,
            owner_id: memberId,
            owner_type: "personal",
            plan_id: basicPlan.id,
            status: "ACTIVE",
            plan_name: basicPlan.name,
            plan_price: basicPlan.price,
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (plan: Plan) => {
    if (!currentMemberId) return;

    // Basic 플랜은 선택 불가
    if (plan.price === 0) return;

    // 현재 가입중인 플랜인지 확인
    if (personalSubscription && personalSubscription.plan_id === plan.id) {
      return;
    }

    setSelectedPlanId(plan.id);

    // 결제 페이지로 이동
    router.push(
      `/dashboard/settings/billing/checkout?plan_id=${plan.id}&owner_type=personal&owner_id=${currentMemberId}`
    );
  };

  // 현재 플랜인지 확인
  const isCurrentPlan = (planId: number) => {
    return personalSubscription?.plan_id === planId;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <p className="text-muted-foreground">{t("loadError")}</p>
          <button
            onClick={fetchData}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            {t("retry")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl">
        {/* 헤더 */}
        <div className="mb-8 text-center">
          <button
            onClick={() => router.back()}
            className="mb-4 text-sm text-muted-foreground hover:text-foreground"
          >
            {t("back")}
          </button>
          <h1 className="text-3xl font-bold text-foreground">
            {tPricing("title")}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {tPricing("description")}
          </p>
        </div>

        {/* 개인 구독 섹션 */}
        <div className="mb-12">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900">
              <svg
                className="h-6 w-6 text-blue-600 dark:text-blue-400"
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
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                {t("personalSection")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("personalDesc")}
              </p>
            </div>
          </div>

          {currentMemberId && (
            <div className="grid gap-6 md:grid-cols-3">
              {plans.map((plan) => {
                const isCurrent = isCurrentPlan(plan.id);
                const isBasic = plan.price === 0;
                const isTeamPlan = plan.name === "Team";

                return (
                  <div
                    key={plan.id}
                    className={`relative rounded-xl border-2 p-6 transition-all ${
                      isCurrent
                        ? "border-green-500 bg-green-50 dark:bg-green-950"
                        : isBasic
                          ? "border-border bg-muted/50 opacity-70"
                          : isTeamPlan
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                            : "border-border bg-card hover:border-blue-300"
                    }`}
                  >
                    {isCurrent && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-green-600 px-4 py-1 text-xs font-semibold text-white">
                        {t("subscribed")}
                      </div>
                    )}

                    {!isCurrent && isTeamPlan && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-4 py-1 text-xs font-semibold text-white">
                        {tPricing("popular")}
                      </div>
                    )}

                    <div className="text-center">
                      <h3 className="text-xl font-bold text-foreground">
                        {plan.name}
                      </h3>
                      <div className="mt-4">
                        <span className="text-4xl font-bold text-foreground">
                          {"\u20A9"}
                          {plan.price.toLocaleString()}
                        </span>
                        <span className="text-muted-foreground">
                          {" "}
                          {t("perMonth")}
                        </span>
                      </div>
                    </div>

                    <ul className="mt-6 space-y-3">
                      <li className="flex items-center text-sm text-muted-foreground">
                        <svg
                          className="mr-2 h-5 w-5 text-green-600"
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
                        {t("maxMembers", { count: plan.max_members })}
                      </li>
                      <li className="flex items-center text-sm text-muted-foreground">
                        <svg
                          className="mr-2 h-5 w-5 text-green-600"
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
                        {t("storage", {
                          size: (plan.max_storage_mb / 1000).toFixed(1),
                        })}
                      </li>
                      <li className="flex items-center text-sm text-muted-foreground">
                        <svg
                          className="mr-2 h-5 w-5 text-green-600"
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
                        {t("unlimitedWorkspaces")}
                      </li>
                      <li className="flex items-center text-sm text-muted-foreground">
                        <svg
                          className="mr-2 h-5 w-5 text-green-600"
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
                        {t("unlimitedTasks")}
                      </li>
                    </ul>

                    <button
                      onClick={() => handleSelectPlan(plan)}
                      disabled={isCurrent || isBasic || selectedPlanId === plan.id}
                      className={`mt-6 w-full rounded-lg px-4 py-3 font-semibold transition-colors ${
                        isCurrent
                          ? "cursor-default border border-green-600 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                          : isBasic
                            ? "cursor-not-allowed border border-border bg-muted text-muted-foreground"
                            : isTeamPlan
                              ? "bg-blue-600 text-white hover:bg-blue-700"
                              : "border border-border bg-background text-foreground hover:bg-accent"
                      } disabled:opacity-50`}
                    >
                      {isCurrent
                        ? t("currentPlan")
                        : isBasic
                          ? t("basicPlan")
                          : selectedPlanId === plan.id
                            ? t("selected")
                            : t("select")}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 팀 구독 섹션 - 준비 중 */}
        <div className="mb-12 border-t border-border pt-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-full bg-purple-100 p-2 dark:bg-purple-900">
              <svg
                className="h-6 w-6 text-purple-600 dark:text-purple-400"
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
            <p className="text-muted-foreground">{t("teamComingSoon")}</p>
          </div>
        </div>

        {/* 추가 정보 */}
        <div className="mt-12 border-t border-border pt-8 text-center">
          <p className="text-sm text-muted-foreground">{t("changeable")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("freeTrial")}
          </p>
        </div>
      </div>
    </div>
  );
}
