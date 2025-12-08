import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import SplashScreen from "@/components/SplashScreen";

// 日本語フォントの設定（Noto Sans JP）
const notoSansJP = Noto_Sans_JP({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "700"],
  display: "swap", // フォント読み込み中も文字を表示（CLS防止）
  variable: "--font-noto-sans-jp",
  preload: true, // 重要なフォントをプリロード
});

// メタデータ設定
export const metadata: Metadata = {
  title: "宇美町施設予約検索",
  description: "宇美町の体育施設（バスケットボール・ミニバスケットボール）の空き状況を検索できます",
  robots: "index, follow",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "施設予約検索",
    statusBarStyle: "default",
  },
};

// ビューポート設定（モバイル最適化）
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${notoSansJP.variable} antialiased`}>
        <SplashScreen />
        {children}
      </body>
    </html>
  );
}
