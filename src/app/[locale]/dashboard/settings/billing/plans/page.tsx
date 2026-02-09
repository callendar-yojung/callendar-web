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

interface TeamWithSubscription {
  id: number;
  name: string;
  subscription: Subscription | null;
  isAdmin: boolean;
}

export default function PlansPage() {
  const t = useTranslations("pricing");
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [selectedOwnerType, setSelectedOwnerType] = useState<"team" | "personal" | null>(null);
  const [selectedOwnerId, setSelectedOwnerId] = useState<number | null>(null);

  // 개인 구독
  const [personalSubscription, setPersonalSubscription] = useState<Subscription | null>(null);
  const [currentMemberId, setCurrentMemberId] = useState<number | null>(null);

  // 관리자인 팀의 구독 목록
  const [teamSubscriptions, setTeamSubscriptions] = useState<TeamWithSubscription[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // 플랜 목록 가져오기
      const plansRes = await fetch("/api/plans");
      const plansData = await plansRes.json();

      if (Array.isArray(plansData) && plansData.length > 0) {
        setPlans(plansData);
      } else {
        await createDefaultPlans();
        return;
      }

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

      // 내가 속한 팀 목록 가져오기
      const teamsRes = await fetch("/api/me/teams");
      const teamsData = await teamsRes.json();

      if (teamsData.teams && teamsData.teams.length > 0) {
        const teamList: TeamWithSubscription[] = [];

        for (const team of teamsData.teams) {
          // 팀의 생성자(관리자)인지 확인
          const isAdmin = team.created_by === memberId;

          if (isAdmin) {
            // 팀의 활성 구독 가져오기
            const teamSubRes = await fetch(
              `/api/subscriptions?owner_id=${team.id}&owner_type=team&active=true`
            );
            const teamSubData = await teamSubRes.json();

            teamList.push({
              id: team.id,
              name: team.name,
              subscription: teamSubData && teamSubData.plan_id ? teamSubData : null,
              isAdmin: true,
            });
          }
        }

        setTeamSubscriptions(teamList);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultPlans = async () => {
    const defaultPlansData = [
      { name: "Basic", price: 0, max_members: 5, max_storage_mb: 1000 },
      { name: "Team", price: 8000, max_members: 50, max_storage_mb: 10000 },
      { name: "Enterprise", price: 20000, max_members: 999, max_storage_mb: 100000 },
    ];

    try {
      for (const plan of defaultPlansData) {
        await fetch("/api/plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(plan),
        });
      }
      await fetchData();
    } catch (error) {
      console.error("Failed to create default plans:", error);
      setLoading(false);
    }
  };

  const handleSelectPlan = async (plan: Plan, ownerType: "team" | "personal", ownerId: number) => {
    // 현재 가입중인 플랜인지 확인
    if (ownerType === "personal") {
      if (personalSubscription && personalSubscription.plan_id === plan.id) {
        return;
      }
    } else {
      const team = teamSubscriptions.find(t => t.id === ownerId);
      if (team?.subscription && team.subscription.plan_id === plan.id) {
        return;
      }
    }

    setSelectedPlanId(plan.id);
    setSelectedOwnerType(ownerType);
    setSelectedOwnerId(ownerId);

    // 결제 페이지로 이동
    router.push(
      `/dashboard/settings/billing/checkout?plan_id=${plan.id}&owner_type=${ownerType}&owner_id=${ownerId}`
    );
  };

  // 현재 플랜인지 확인
  const isCurrentPlan = (planId: number, ownerType: "team" | "personal", ownerId: number) => {
    if (ownerType === "personal") {
      return personalSubscription?.plan_id === planId;
    } else {
      const team = teamSubscriptions.find(t => t.id === ownerId);
      return team?.subscription?.plan_id === planId;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-muted-foreground">Loading plans...</div>
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <p className="text-muted-foreground">플랜을 불러올 수 없습니다.</p>
          <button
            onClick={fetchData}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  const renderPlanCards = (ownerType: "team" | "personal", ownerId: number) => (
    <div className="grid gap-6 md:grid-cols-3">
      {plans.map((plan) => {
        const isCurrent = isCurrentPlan(plan.id, ownerType, ownerId);
        const isTeamPlan = plan.name === "Team";

        return (
          <div
            key={plan.id}
            className={`relative rounded-xl border-2 p-6 transition-all ${
              isCurrent
                ? "border-green-500 bg-green-50 dark:bg-green-950"
                : isTeamPlan
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                : "border-border bg-card hover:border-blue-300"
            }`}
          >
            {isCurrent && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-green-600 px-4 py-1 text-xs font-semibold text-white">
                가입중
              </div>
            )}

            {!isCurrent && isTeamPlan && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-4 py-1 text-xs font-semibold text-white">
                {t("popular")}
              </div>
            )}

            <div className="text-center">
              <h3 className="text-xl font-bold text-foreground">
                {plan.name}
              </h3>
              <div className="mt-4">
                <span className="text-4xl font-bold text-foreground">
                  ₩{plan.price.toLocaleString()}
                </span>
                <span className="text-muted-foreground"> / 월</span>
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
                최대 {plan.max_members}명의 팀 멤버
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
                {(plan.max_storage_mb / 1000).toFixed(1)}GB 저장소
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
                무제한 워크스페이스
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
                무제한 태스크
              </li>
            </ul>

            <button
              onClick={() => handleSelectPlan(plan, ownerType, ownerId)}
              disabled={isCurrent || (selectedPlanId === plan.id && selectedOwnerType === ownerType && selectedOwnerId === ownerId)}
              className={`mt-6 w-full rounded-lg px-4 py-3 font-semibold transition-colors ${
                isCurrent
                  ? "cursor-default border border-green-600 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                  : isTeamPlan
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "border border-border bg-background text-foreground hover:bg-accent"
              } disabled:opacity-50`}
            >
              {isCurrent ? "현재 플랜" : (selectedPlanId === plan.id && selectedOwnerType === ownerType && selectedOwnerId === ownerId) ? "선택됨" : "선택하기"}
            </button>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl">
        {/* 헤더 */}
        <div className="mb-8 text-center">
          <button
            onClick={() => router.back()}
            className="mb-4 text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-foreground">{t("title")}</h1>
          <p className="mt-2 text-muted-foreground">{t("description")}</p>
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
              <h2 className="text-2xl font-bold text-foreground">개인 구독</h2>
              <p className="text-sm text-muted-foreground">
                나의 개인 워크스페이스를 위한 플랜
              </p>
            </div>
          </div>
          {currentMemberId && renderPlanCards("personal", currentMemberId)}
        </div>

        {/* 팀 구독 섹션 */}
        {teamSubscriptions.length > 0 && (
          <div className="space-y-12">
            <div className="border-t border-border pt-8">
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
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    관리중인 팀 구독
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    내가 관리자인 팀의 구독 플랜
                  </p>
                </div>
              </div>
            </div>

            {teamSubscriptions.map((team) => (
              <div key={team.id} className="space-y-6">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-semibold text-foreground">
                    {team.name}
                  </h3>
                  <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                    관리자
                  </span>
                </div>
                {renderPlanCards("team", team.id)}
              </div>
            ))}
          </div>
        )}

        {/* 추가 정보 */}
        <div className="mt-12 border-t border-border pt-8 text-center">
          <p className="text-sm text-muted-foreground">
            모든 플랜은 언제든지 변경 가능합니다
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            7일 무료 체험 기간이 제공됩니다
          </p>
        </div>
      </div>
    </div>
  );
}
