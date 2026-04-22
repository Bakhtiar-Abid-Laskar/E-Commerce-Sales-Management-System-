import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  // Empty turbopack config: suppresses the "webpack config but no turbopack config" error
  // from next-pwa (which uses webpack). Turbopack is used in dev; webpack in production build.
  turbopack: {},
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default withPWA(nextConfig);
