import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The /api/v1/* proxy is handled by app/api/v1/[...path]/route.ts
  // which streams request/response bodies without buffering, so large
  // file uploads (videos) are not limited by the rewrite proxy's ~1 MB cap.
};

export default nextConfig;
