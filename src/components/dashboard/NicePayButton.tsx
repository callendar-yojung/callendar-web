"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    AUTHNICE?: {
      requestPay: (options: NicePayRequestOptions) => void;
    };
  }
}

interface NicePayRequestOptions {
  clientId: string;
  method: string;
  orderId: string;
  amount: number;
  goodsName: string;
  returnUrl: string;
  fnError: (result: { errorMsg: string }) => void;
}

interface NicePayButtonProps {
  planId: number;
  amount: number;
  goodsName: string;
  ownerId: number;
  ownerType: "team" | "personal";
  onError?: (error: string) => void;
}

export default function NicePayButton({
  planId,
  amount,
  goodsName,
  ownerId,
  ownerType,
  onError,
}: NicePayButtonProps) {
  const [loading, setLoading] = useState(true);
  const [sdkReady, setSdkReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const existingScript = document.querySelector(
      'script[data-nicepay-sdk]'
    );
    if (existingScript) {
      setLoading(false);
      setSdkReady(true);
      return;
    }

    const script = document.createElement("script");
    script.setAttribute("data-nicepay-sdk", "true");
    script.src = "https://pay.nicepay.co.kr/v1/js/";
    script.async = true;

    script.onload = () => {
      setLoading(false);
      setSdkReady(true);
    };

    script.onerror = () => {
      setLoading(false);
      setError("NicePay SDK를 불러오는데 실패했습니다.");
      onError?.("NicePay SDK 로드 실패");
    };

    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [onError]);

  const handlePayment = () => {
    if (!window.AUTHNICE) {
      setError("NicePay SDK가 준비되지 않았습니다.");
      return;
    }

    const clientId = process.env.NEXT_PUBLIC_NICEPAY_CLIENT_ID;
    if (!clientId) {
      setError("NicePay Client ID가 설정되지 않았습니다.");
      return;
    }

    const timestamp = Date.now();
    const orderId = `PECAL_${planId}_${ownerId}_${timestamp}`;

    const returnUrl = `${window.location.origin}/api/nicepay/approve?plan_id=${planId}&owner_id=${ownerId}&owner_type=${ownerType}`;

    window.AUTHNICE.requestPay({
      clientId,
      method: "card",
      orderId,
      amount,
      goodsName,
      returnUrl,
      fnError: (result) => {
        setError(result.errorMsg);
        onError?.(result.errorMsg);
      },
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">결제 모듈 로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={handlePayment}
        disabled={!sdkReady}
        className="w-full rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        카드로 결제하기
      </button>
    </div>
  );
}
