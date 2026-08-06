import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    'playwright',
    'playwright-core',
    'cheerio',
    'adm-zip',
    'postcss',
    'ts-morph',
  ],
};

export default nextConfig;
