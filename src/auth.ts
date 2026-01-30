import NextAuth from "next-auth";
import Kakao from "next-auth/providers/kakao";
import { findOrCreateMember } from "./lib/member";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      memberId: number;
      email?: string | null;
      nickname?: string | null;
      provider: string;
    };
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Kakao({
      clientId: process.env.AUTH_KAKAO_ID!,
      clientSecret: process.env.AUTH_KAKAO_SECRET!,
    }),
    // 다른 프로바이더 추가 예시:
    // Google({
    //   clientId: process.env.AUTH_GOOGLE_ID!,
    //   clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    // }),
    // Naver({
    //   clientId: process.env.AUTH_NAVER_ID!,
    //   clientSecret: process.env.AUTH_NAVER_SECRET!,
    // }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!account) return false;

      try {
        const member = await findOrCreateMember(
          account.provider,
          account.providerAccountId,
          user.email ?? null
        );

        (user as Record<string, unknown>).memberId = member.member_id;
        (user as Record<string, unknown>).nickname = member.nickname;
        (user as Record<string, unknown>).provider = account.provider;

        return true;
      } catch (error) {
        console.error("Sign in error:", error);
        return false;
      }
    },
    async jwt({ token, user, account, trigger, session }) {
      if (user && account) {
        token.memberId = (user as Record<string, unknown>).memberId as number;
        token.nickname = (user as Record<string, unknown>).nickname as string;
        token.provider = account.provider;
      }
      if (trigger === "update" && session?.nickname) {
        token.nickname = session.nickname;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.sub!;
      session.user.memberId = token.memberId as number;
      session.user.nickname = token.nickname as string;
      session.user.provider = token.provider as string;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});