import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-helper";
import { getPlanById } from "@/lib/plan";
import {
  encryptCardData,
  registerBillingKey,
  approveBilling,
  generateMoid,
} from "@/lib/nicepay";
import { saveBillingKey, getActiveBillingKey } from "@/lib/billing-key";
import { createSubscription } from "@/lib/subscription";

/** GET - 현재 사용자의 활성 빌키(저장된 카드) 정보 반환 */
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const billingKey = await getActiveBillingKey(user.memberId);

  if (!billingKey) {
    return NextResponse.json({ billingKey: null });
  }

  return NextResponse.json({
    billingKey: {
      id: billingKey.id,
      cardCode: billingKey.card_code,
      cardName: billingKey.card_name,
      cardNoMasked: billingKey.card_no_masked,
      createdAt: billingKey.created_at,
    },
  });
}

/** POST - 빌키 발급 + 첫 결제 승인 + 구독 생성 */
export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { cardNo, expYear, expMonth, idNo, cardPw, planId, ownerId, ownerType } = body;

    if (!cardNo || !expYear || !expMonth || !idNo || !cardPw || !planId || !ownerId || !ownerType) {
      return NextResponse.json(
        { error: "필수 파라미터가 누락되었습니다." },
        { status: 400 }
      );
    }

    // 1. 플랜 조회
    const plan = await getPlanById(Number(planId));
    if (!plan) {
      return NextResponse.json(
        { error: "플랜을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (plan.price <= 0) {
      return NextResponse.json(
        { error: "무료 플랜은 결제가 필요하지 않습니다." },
        { status: 400 }
      );
    }

    // 2. 카드 데이터 암호화
    const encData = encryptCardData(cardNo, expYear, expMonth, idNo, cardPw);

    // 3. 빌키 발급
    const moid = generateMoid(`PECAL_BK_${user.memberId}`);
    console.log("[Billing Register] Requesting billing key for member:", user.memberId);

    const billingResult = await registerBillingKey(encData, moid);

    // 4. 첫 결제 승인
    const approveMoid = generateMoid(`PECAL_AP_${user.memberId}`);
    const goodsName = `Pecal ${plan.name}`;

    console.log("[Billing Register] Approving first payment:", plan.price);
    const approveResult = await approveBilling(
      billingResult.bid,
      approveMoid,
      plan.price,
      goodsName
    );

    // 5. DB에 빌키 저장
    await saveBillingKey(
      user.memberId,
      billingResult.bid,
      billingResult.cardCode,
      billingResult.cardName,
      billingResult.cardNo
    );

    // 6. 구독 생성
    await createSubscription(
      Number(ownerId),
      ownerType as "team" | "personal",
      Number(planId),
      user.memberId
    );

    console.log("[Billing Register] Success for member:", user.memberId);

    return NextResponse.json({
      success: true,
      message: "결제가 완료되었습니다.",
      tid: approveResult.tid,
    });
  } catch (error: any) {
    console.error("[Billing Register] Error:", error.message);
    return NextResponse.json(
      { error: error.message || "결제 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
