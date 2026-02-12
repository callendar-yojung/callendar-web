import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-helper";
import { getActiveBillingKey, removeBillingKeyById } from "@/lib/billing-key";
import { removeBillingKeyFromNicePay, generateMoid } from "@/lib/nicepay";

/** DELETE - 빌키 삭제 (NicePay + DB) */
export async function DELETE(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const billingKey = await getActiveBillingKey(user.memberId);
    if (!billingKey) {
      return NextResponse.json(
        { error: "등록된 카드가 없습니다." },
        { status: 404 }
      );
    }

    // NicePay 빌키 삭제 API 호출
    const moid = generateMoid(`PECAL_RM_${user.memberId}`);
    const result = await removeBillingKeyFromNicePay(billingKey.bid, moid);
    console.log("[Billing Remove] NicePay result:", result);

    // DB에서 빌키 상태 변경
    await removeBillingKeyById(billingKey.id);

    return NextResponse.json({
      success: true,
      message: "카드가 삭제되었습니다.",
    });
  } catch (error: any) {
    console.error("[Billing Remove] Error:", error.message);
    return NextResponse.json(
      { error: error.message || "카드 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
