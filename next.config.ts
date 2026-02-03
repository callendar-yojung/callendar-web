import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    trustHostHeader: true, // Cloudflare HTTPS 프록시용
  },
};

export default withNextIntl(nextConfig);
