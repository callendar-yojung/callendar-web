"use client";

import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";

export default function LoginPage() {
  const t = useTranslations("login");

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-background p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">
            {t("title")}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {t("description")}
          </p>
        </div>

        <div className="space-y-4">
          <button
            type="button"
            onClick={() => signIn("kakao", { callbackUrl: "/" })}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-accent px-4 py-3 font-medium text-background transition-colors hover:opacity-95"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M10 2.5C5.30558 2.5 1.5 5.53485 1.5 9.27273C1.5 11.6561 3.07455 13.7515 5.45455 14.9545L4.54545 18.0909C4.48485 18.303 4.72727 18.4697 4.90909 18.3333L8.60606 15.8182C9.06061 15.8788 9.52727 15.9091 10 15.9091C14.6944 15.9091 18.5 12.8742 18.5 9.13636C18.5 5.53485 14.6944 2.5 10 2.5Z"
                fill="currentColor"
              />
            </svg>
            {t("kakao")}
          </button>
        </div>
      </div>
    </div>
  );
}
