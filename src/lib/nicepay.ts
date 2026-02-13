const NICEPAY_API_URL =
  process.env.NODE_ENV === "production"
    ? "https://api.nicepay.co.kr"
    : "https://sandbox-api.nicepay.co.kr";

function getSecretKey(): string {
  const key = process.env.NICEPAY_SECRET_KEY;
  if (!key) throw new Error("NICEPAY_SECRET_KEY is not configured");
  return key;
}

/** Basic Auth 헤더 생성: Base64(SecretKey:) */
function getAuthHeader(): string {
  const secretKey = getSecretKey();
  return Buffer.from(`${secretKey}:`).toString("base64");
}

/** MOID 생성 */
export function generateMoid(prefix: string): string {
  return `${prefix}_${Date.now()}`;
}

interface BillingKeyResult {
  bid: string;
  cardCode: string;
  cardName: string;
  cardNo: string;
  resultCode: string;
  resultMsg: string;
}

/**
 * 빌키(BID) 발급 API — V2 Modern
 * POST /v1/billing/{tid}
 */
export async function registerBillingKey(
  tid: string,
  orderId: string,
  amount: number,
  goodsName: string,
  cardQuota?: number
): Promise<BillingKeyResult> {
  const response = await fetch(`${NICEPAY_API_URL}/v1/billing/${tid}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${getAuthHeader()}`,
    },
    body: JSON.stringify({
      orderId,
      amount,
      goodsName,
      cardQuota: cardQuota ?? 0,
    }),
  });

  const result = await response.json();
  console.log("[NicePay Billing] Register result:", JSON.stringify(result));

  if (result.resultCode !== "0000") {
    throw new Error(result.resultMsg || "빌키 발급 실패");
  }

  return {
    bid: result.bid,
    cardCode: result.card?.cardCode || "",
    cardName: result.card?.cardName || "",
    cardNo: result.card?.cardNo || "",
    resultCode: result.resultCode,
    resultMsg: result.resultMsg,
  };
}

interface BillingApproveResult {
  tid: string;
  amt: number;
  resultCode: string;
  resultMsg: string;
}

/**
 * 빌링 재결제(정기결제) API — V2 Modern
 * POST /v1/billing/re-pay
 */
export async function approveBilling(
  bid: string,
  orderId: string,
  amount: number,
  goodsName: string,
  cardQuota?: number
): Promise<BillingApproveResult> {
  const response = await fetch(`${NICEPAY_API_URL}/v1/billing/re-pay`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${getAuthHeader()}`,
    },
    body: JSON.stringify({
      bid,
      orderId,
      amount,
      goodsName,
      cardQuota: cardQuota ?? 0,
      useShopInterest: false,
    }),
  });

  const result = await response.json();
  console.log("[NicePay Billing] Approve result:", JSON.stringify(result));

  if (result.resultCode !== "0000") {
    throw new Error(result.resultMsg || "빌링 승인 실패");
  }

  return {
    tid: result.tid || "",
    amt: result.amount || amount,
    resultCode: result.resultCode,
    resultMsg: result.resultMsg,
  };
}

interface ExpireBillingKeyResult {
  resultCode: string;
  resultMsg: string;
}

/**
 * 빌링키(BID) 만료 API
 * POST /v1/subscribe/{bid}/expire
 */
export async function expireBillingKey(
  bid: string,
  orderId: string
): Promise<ExpireBillingKeyResult> {
  const response = await fetch(
    `${NICEPAY_API_URL}/v1/subscribe/${bid}/expire`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${getAuthHeader()}`,
      },
      body: JSON.stringify({ orderId }),
    }
  );

  const result = await response.json();
  console.log("[NicePay Billing] Expire result:", JSON.stringify(result));

  return {
    resultCode: result.resultCode,
    resultMsg: result.resultMsg,
  };
}
