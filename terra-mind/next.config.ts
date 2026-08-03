import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite", "@neondatabase/serverless"],
  transpilePackages: ["three", "@react-three/fiber", "@react-three/drei"],
};

export default nextConfig;
