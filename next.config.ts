import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  // React Strict Modeの有効化（開発時の潜在的な問題を検出）
  reactStrictMode: true,

  // gzip圧縮を有効化（レスポンスサイズの削減）
  compress: true,

  // X-Powered-Byヘッダーを無効化（セキュリティ向上）
  poweredByHeader: false,

  // Puppeteerをサーバーコンポーネントの外部パッケージとして設定
  // Vercelのサーバーレス環境で正しく動作させるために必要
  // Next.js 16では serverExternalPackages に変更
  serverExternalPackages: ["puppeteer", "puppeteer-core", "@sparticuz/chromium"],
};

export default withBundleAnalyzer(nextConfig);
