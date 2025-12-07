import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";

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
        {/* コールドスタート時のスプラッシュスクリーン */}
        <div id="splash-screen" style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #EFF6FF 0%, #FFFFFF 50%, #EEF2FF 100%)',
          zIndex: 9999,
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.5rem',
            padding: '1rem',
          }}>
            <img
              src="/images/MITCHELL.png"
              alt="MITCHELL"
              style={{
                width: '128px',
                height: '128px',
                objectFit: 'contain',
                filter: 'drop-shadow(0 20px 25px rgb(0 0 0 / 0.15))',
                animation: 'bounce 1s infinite',
              }}
            />
            <h1 style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              background: 'linear-gradient(to right, #2563eb, #4f46e5)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              宇美町施設予約検索
            </h1>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.75rem',
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '4px solid #BFDBFE',
                borderTopColor: '#2563eb',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }} />
              <p style={{
                fontSize: '0.875rem',
                color: '#4B5563',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              }}>
                起動中...
              </p>
            </div>
          </div>
        </div>
        <style dangerouslySetInnerHTML={{
          __html: `
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
            @keyframes bounce {
              0%, 100% { transform: translateY(-25%); animation-timing-function: cubic-bezier(0.8, 0, 1, 1); }
              50% { transform: translateY(0); animation-timing-function: cubic-bezier(0, 0, 0.2, 1); }
            }
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
          `
        }} />
        <script dangerouslySetInnerHTML={{
          __html: `
            window.addEventListener('load', function() {
              const splash = document.getElementById('splash-screen');
              if (splash) {
                splash.style.opacity = '0';
                splash.style.transition = 'opacity 0.3s ease-out';
                setTimeout(function() { splash.remove(); }, 300);
              }
            });
          `
        }} />
        {children}
      </body>
    </html>
  );
}
