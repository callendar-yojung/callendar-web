import { createHash, createCipheriv } from "crypto";

const NICEPAY_API_URL = "https://webapi.nicepay.co.kr/webapi";

function getMid(): string {
  const mid = process.env.NICEPAY_MID;
  if (!mid) throw new Error("NICEPAY_MID is not configured");
  return mid;
}

function getMerchantKey(): string {
  const key = process.env.NICEPAY_MERCHANT_KEY;
  if (!key) throw new Error("NICEPAY_MERCHANT_KEY is not configured");
  return key;
}

/** YYYYMMDDHHMMSS 포맷 현재 시각 */
export function getEdiDate(): string {
  const now = new Date();
  const y = now.getFullYear().toString();
  const m = (now.getMonth() + 1).toString().padStart(2, "0");
  const d = now.getDate().toString().padStart(2, "0");
  const h = now.getHours().toString().padStart(2, "0");
  const min = now.getMinutes().toString().padStart(2, "0");
  const s = now.getSeconds().toString().padStart(2, "0");
  return `${y}${m}${d}${h}${min}${s}`;
}

/** SHA-256 해시 생성 (hex) */
export function generateSignData(fields: string[]): string {
  const joined = fields.join("");
  return createHash("sha256").update(joined).digest("hex");
}

/**
 * AES-128-ECB / PKCS5Padding 으로 카드 데이터 암호화
 * key = MerchantKey 앞 16자리, 결과는 Hex 인코딩
 */
export function encryptData(plainText: string): string {
  const merchantKey = getMerchantKey();
  const key = Buffer.from(merchantKey.substring(0, 16), "utf8");
  const cipher = createCipheriv("aes-128-ecb", key, null);
  cipher.setAutoPadding(true);
  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
}

/** 카드 데이터 암호화 (카드번호|유효기간|생년월일|비밀번호) */
export function encryptCardData(
  cardNo: string,
  expYear: string,
  expMonth: string,
  idNo: string,
  cardPw: string
): string {
  const plainText = `${cardNo}|${expYear}${expMonth}|${idNo}|${cardPw}`;
  return encryptData(plainText);
}

/** NicePay TID 생성: MID(10) + 서비스코드(2) + 날짜(8) + 시간(6) + 시퀀스(4) */
export function generateTID(mid?: string): string {
  const m = mid || getMid();
  const now = new Date();
  const dateStr = getEdiDate();
  const seq = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `${m}01${dateStr}${seq}`;
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
 * 빌키(BID) 발급 API 호출
 * POST /webapi/billing/billing_regist.jsp
 */
export async function registerBillingKey(
  encData: string,
  moid: string
): Promise<BillingKeyResult> {
  const mid = getMid();
  const merchantKey = getMerchantKey();
  const ediDate = getEdiDate();
  const signData = generateSignData([mid, ediDate, moid, merchantKey]);

  const params = new URLSearchParams({
    MID: mid,
    EdiDate: ediDate,
    Moid: moid,
    EncData: encData,
    SignData: signData,
    CharSet: "utf-8",
  });

  const response = await fetch(
    `${NICEPAY_API_URL}/billing/billing_regist.jsp`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    }
  );

  const result = await response.json();
  console.log("[NicePay Billing] Register result:", JSON.stringify(result));

  if (result.ResultCode !== "F100") {
    throw new Error(result.ResultMsg || "빌키 발급 실패");
  }

  return {
    bid: result.BID,
    cardCode: result.CardCode || "",
    cardName: result.CardName || "",
    cardNo: result.CardNo || "",
    resultCode: result.ResultCode,
    resultMsg: result.ResultMsg,
  };
}

interface BillingApproveResult {
  tid: string;
  authCode: string;
  amt: string;
  resultCode: string;
  resultMsg: string;
}

/**
 * 빌링 승인 API 호출
 * POST /webapi/billing/billing_approve.jsp
 */
export async function approveBilling(
  bid: string,
  moid: string,
  amt: number,
  goodsName: string
): Promise<BillingApproveResult> {
  const mid = getMid();
  const merchantKey = getMerchantKey();
  const ediDate = getEdiDate();
  const tid = generateTID(mid);
  const amtStr = amt.toString();
  const signData = generateSignData([mid, ediDate, moid, amtStr, bid, merchantKey]);

  const params = new URLSearchParams({
    TID: tid,
    BID: bid,
    MID: mid,
    EdiDate: ediDate,
    Moid: moid,
    Amt: amtStr,
    GoodsName: goodsName,
    SignData: signData,
    CharSet: "utf-8",
  });

  const response = await fetch(
    `${NICEPAY_API_URL}/billing/billing_approve.jsp`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    }
  );

  const result = await response.json();
  console.log("[NicePay Billing] Approve result:", JSON.stringify(result));

  if (result.ResultCode !== "3001") {
    throw new Error(result.ResultMsg || "빌링 승인 실패");
  }

  return {
    tid: result.TID || tid,
    authCode: result.AuthCode || "",
    amt: result.Amt || amtStr,
    resultCode: result.ResultCode,
    resultMsg: result.ResultMsg,
  };
}

interface BillingRemoveResult {
  resultCode: string;
  resultMsg: string;
}

/**
 * 빌키 삭제 API 호출
 * POST /webapi/billing/billing_remove.jsp
 */
export async function removeBillingKeyFromNicePay(
  bid: string,
  moid: string
): Promise<BillingRemoveResult> {
  const mid = getMid();
  const merchantKey = getMerchantKey();
  const ediDate = getEdiDate();
  const signData = generateSignData([mid, ediDate, moid, bid, merchantKey]);

  const params = new URLSearchParams({
    MID: mid,
    BID: bid,
    EdiDate: ediDate,
    Moid: moid,
    SignData: signData,
    CharSet: "utf-8",
  });

  const response = await fetch(
    `${NICEPAY_API_URL}/billing/billing_remove.jsp`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    }
  );

  const result = await response.json();
  console.log("[NicePay Billing] Remove result:", JSON.stringify(result));

  return {
    resultCode: result.ResultCode,
    resultMsg: result.ResultMsg,
  };
}
