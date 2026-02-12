"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

interface NicePayButtonProps {
  planId: number;
  amount: number;
  goodsName: string;
  ownerId: number;
  ownerType: "team" | "personal";
  onError?: (error: string) => void;
  onSuccess?: () => void;
}

export default function NicePayButton({
  planId,
  amount,
  goodsName,
  ownerId,
  ownerType,
  onError,
  onSuccess,
}: NicePayButtonProps) {
  const t = useTranslations("dashboard.settings.billing.checkout.nicepay");

  const [cardNo, setCardNo] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cardPw, setCardPw] = useState("");
  const [idNo, setIdNo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 16);
    const parts = digits.match(/.{1,4}/g);
    return parts ? parts.join(" ") : digits;
  };

  const formatExpiry = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 3) {
      return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    return digits;
  };

  const handleCardNoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCardNo(formatCardNumber(e.target.value));
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setExpiry(formatExpiry(e.target.value));
  };

  const handleCardPwChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCardPw(e.target.value.replace(/\D/g, "").slice(0, 2));
  };

  const handleIdNoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIdNo(e.target.value.replace(/\D/g, "").slice(0, 10));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const rawCardNo = cardNo.replace(/\s/g, "");
      const [expMonth, expYear] = expiry.split("/");

      if (rawCardNo.length !== 16) {
        throw new Error(t("cardNumberError"));
      }
      if (!expMonth || !expYear || expMonth.length !== 2 || expYear.length !== 2) {
        throw new Error(t("expiryError"));
      }
      if (cardPw.length !== 2) {
        throw new Error(t("passwordError"));
      }
      if (idNo.length !== 6 && idNo.length !== 10) {
        throw new Error(t("birthError"));
      }

      const response = await fetch("/api/nicepay/billing/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardNo: rawCardNo,
          expYear,
          expMonth,
          idNo,
          cardPw,
          planId,
          ownerId,
          ownerType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t("registerError"));
      }

      onSuccess?.();
    } catch (err: any) {
      const message = err.message || t("registerError");
      setError(message);
      onError?.(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* 카드번호 */}
      <div>
        <label
          htmlFor="cardNo"
          className="mb-1 block text-sm font-medium text-foreground"
        >
          {t("cardNumber")}
        </label>
        <input
          id="cardNo"
          type="text"
          inputMode="numeric"
          placeholder={t("cardNumberPlaceholder")}
          value={cardNo}
          onChange={handleCardNoChange}
          disabled={loading}
          className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          autoComplete="cc-number"
        />
      </div>

      {/* 유효기간 + 비밀번호 앞2자리 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="expiry"
            className="mb-1 block text-sm font-medium text-foreground"
          >
            {t("cardExpiry")}
          </label>
          <input
            id="expiry"
            type="text"
            inputMode="numeric"
            placeholder={t("expiryPlaceholder")}
            value={expiry}
            onChange={handleExpiryChange}
            disabled={loading}
            className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            autoComplete="cc-exp"
          />
        </div>
        <div>
          <label
            htmlFor="cardPw"
            className="mb-1 block text-sm font-medium text-foreground"
          >
            {t("cardPassword")}
          </label>
          <input
            id="cardPw"
            type="password"
            inputMode="numeric"
            placeholder="**"
            value={cardPw}
            onChange={handleCardPwChange}
            disabled={loading}
            className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            autoComplete="off"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {t("passwordHint")}
          </p>
        </div>
      </div>

      {/* 생년월일 / 사업자번호 */}
      <div>
        <label
          htmlFor="idNo"
          className="mb-1 block text-sm font-medium text-foreground"
        >
          {t("birthDate")}
        </label>
        <input
          id="idNo"
          type="text"
          inputMode="numeric"
          placeholder={t("birthPlaceholder")}
          value={idNo}
          onChange={handleIdNoChange}
          disabled={loading}
          className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          autoComplete="off"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          {t("birthHint")}
        </p>
      </div>

      {/* 결제 버튼 */}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? t("subscribing") : t("subscribeButton")}
      </button>
    </form>
  );
}
