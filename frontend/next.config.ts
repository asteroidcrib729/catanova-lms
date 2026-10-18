import type { NextConfig } from "next";
import deployment from "./vercel.json";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Reuse the reviewed deployment policy in local previews and next start too.
  headers: () => deployment.headers,
};

export default nextConfig;
