import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // React Strict Modeの有効化（開発時の潜在的な問題を検出）
  reactStrictMode: true,

  // SWCによる最小化を有効化（高速なビルド）
  swcMinify: true,

  // gzip圧縮を有効化（レスポンスサイズの削減）
  compress: true,

  // X-Powered-Byヘッダーを無効化（セキュリティ向上）
  poweredByHeader: false,

  // Puppeteerをサーバーコンポーネントの外部パッケージとして設定
  // Vercelのサーバーレス環境で正しく動作させるために必要
  experimental: {
    serverComponentsExternalPackages: ["puppeteer"],
  },
};

export default nextConfig;
