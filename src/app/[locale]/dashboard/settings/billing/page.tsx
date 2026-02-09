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
}

interface Subscription {
  id: number;
  owner_id: number;
  owner_type: "team" | "personal";
  plan_id: number;
  status: string;
  started_at: string;
  plan_name?: string;
  plan_price?: number;
}

interface TeamSubscription {
  team_id: number;
  team_name: string;
  subscription: Subscription | null;
}

export default function BillingPage() {
  const t = useTranslations("dashboard.settings.billing");
  const router = useRouter();
  const [personalSubscription, setPersonalSubscription] = useState<Subscription | null>(null);
  const [teamSubscriptions, setTeamSubscriptions] = useState<TeamSubscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCurrentSubscription();
  }, []);

  const fetchCurrentSubscription = async () => {
    try {
      // 현재 사용자 정보 가져오기
      const meRes = await fetch("/api/me/account");
      const meData = await meRes.json();
      const memberId = meData.member_id;

      console.log("Member ID:", memberId);

      // 개인 활성 구독 조회
      const personalSubRes = await fetch(
        `/api/subscriptions?owner_id=${memberId}&owner_type=personal&active=true`
      );
      const personalSubData = await personalSubRes.json();

      console.log("Personal subscription response:", personalSubData);

      // personalSubData가 null이 아니고 plan_id가 있으면 구독이 있는 것
      if (personalSubData && personalSubData.plan_id) {
        console.log("Setting personal subscription:", personalSubData);
        setPersonalSubscription(personalSubData);
      } else {
        console.log("No personal subscription found, loading Basic plan");
        // 구독이 없으면 Basic 플랜 정보 가져오기
        const plansRes = await fetch("/api/plans");
        const plansData = await plansRes.json();
        const basicPlan = plansData.find((p: Plan) => p.name === "Basic");

        if (basicPlan) {
          setPersonalSubscription({
            id: 0,
            owner_id: memberId,
            owner_type: "personal",
            plan_id: basicPlan.id,
            status: "ACTIVE",
            started_at: new Date().toISOString(),
            plan_name: basicPlan.name,
            plan_price: basicPlan.price,
          });
        }
      }

      // 팀 목록 가져오기
      const teamsRes = await fetch("/api/me/teams");
      const teamsData = await teamsRes.json();

      if (teamsData.teams && teamsData.teams.length > 0) {
        const teamSubList: TeamSubscription[] = [];

        for (const team of teamsData.teams) {
          // 각 팀의 활성 구독 조회
          const teamSubRes = await fetch(
            `/api/subscriptions?owner_id=${team.id}&owner_type=team&active=true`
          );
          const teamSubData = await teamSubRes.json();

          teamSubList.push({
            team_id: team.id,
            team_name: team.name,
            subscription: teamSubData && teamSubData.plan_id ? teamSubData : null,
          });
        }

        setTeamSubscriptions(teamSubList);
      }
    } catch (error) {
      console.error("Failed to fetch subscription:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 개인 구독 */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="rounded-full bg-blue-100 p-1.5 dark:bg-blue-900">
            <svg
              className="h-4 w-4 text-blue-600 dark:text-blue-400"
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
          <h2 className="text-lg font-semibold text-card-foreground">
            개인 구독 플랜
          </h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          개인 워크스페이스를 위한 플랜
        </p>

        <div className="mt-6 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
          <div>
            <p className="font-semibold text-blue-900 dark:text-blue-100">
              {personalSubscription?.plan_name || "Basic"}
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              ₩{personalSubscription?.plan_price?.toLocaleString() || 0} / 월
            </p>
            {personalSubscription && personalSubscription.id > 0 && (
              <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                상태: {personalSubscription.status}
              </p>
            )}
            {(!personalSubscription || personalSubscription.id === 0) && (
              <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                기본 무료 플랜
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => router.push("/dashboard/settings/billing/plans")}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            {personalSubscription && personalSubscription.id > 0 ? "플랜 변경" : "업그레이드"}
          </button>
        </div>
      </div>

      {/* 팀 구독 목록 */}
      {teamSubscriptions.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="rounded-full bg-purple-100 p-1.5 dark:bg-purple-900">
              <svg
                className="h-4 w-4 text-purple-600 dark:text-purple-400"
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
            <h2 className="text-lg font-semibold text-card-foreground">
              팀 구독 플랜
            </h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            소속된 팀의 구독 현황
          </p>

          <div className="mt-6 space-y-4">
            {teamSubscriptions.map((teamSub) => (
              <div
                key={teamSub.team_id}
                className="flex items-center justify-between rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-950"
              >
                <div>
                  <p className="font-semibold text-purple-900 dark:text-purple-100">
                    {teamSub.team_name}
                  </p>
                  <p className="text-sm text-purple-700 dark:text-purple-300">
                    {teamSub.subscription?.plan_name || "Basic"} - ₩
                    {teamSub.subscription?.plan_price?.toLocaleString() || 0} / 월
                  </p>
                  {teamSub.subscription && teamSub.subscription.id > 0 ? (
                    <p className="mt-1 text-xs text-purple-600 dark:text-purple-400">
                      상태: {teamSub.subscription.status}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-purple-600 dark:text-purple-400">
                      기본 무료 플랜
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => router.push("/dashboard/settings/billing/plans")}
                  className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700"
                >
                  {teamSub.subscription && teamSub.subscription.id > 0 ? "플랜 변경" : "업그레이드"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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
            className="mt-4 rounded-lg border border-border px-4 py-2 text-sm font-medium text-card-foreground transition-colors hover:bg-accent"
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

        <div className="mt-6 rounded-lg border-2 border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">{t("noHistory")}</p>
        </div>
      </div>
    </div>
  );
}
