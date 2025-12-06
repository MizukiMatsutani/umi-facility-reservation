'use client';

import { useEffect } from 'react';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * アプリケーションレベルのエラーバウンダリ
 * Next.js App Routerの規約に従ったエラーページ
 */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // エラーをコンソールに記録（開発環境での確認用）
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div
        className="flex max-w-md flex-col items-center gap-4 rounded-lg border border-red-200 bg-red-50 p-6"
        role="alert"
        aria-live="assertive"
      >
        {/* エラーアイコン */}
        <div className="text-4xl text-red-600">⚠️</div>

        {/* エラーメッセージ */}
        <h1 className="text-xl font-bold text-gray-900">
          エラーが発生しました
        </h1>

        <p className="text-center text-base text-gray-800">
          申し訳ございません。予期しないエラーが発生しました。
          <br />
          ページを再読み込みしてお試しください。
        </p>

        {/* エラー詳細（開発環境のみ） */}
        {process.env.NODE_ENV === 'development' && (
          <details className="w-full">
            <summary className="cursor-pointer text-sm text-gray-600">
              エラー詳細
            </summary>
            <pre className="mt-2 overflow-auto rounded bg-gray-100 p-2 text-xs text-gray-700">
              {error.message}
            </pre>
          </details>
        )}

        {/* 再試行ボタン */}
        <button
          type="button"
          onClick={reset}
          className="min-h-[44px] min-w-[44px] rounded-md bg-blue-600 px-6 py-2 text-base font-medium text-white hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-label="ページを再読み込み"
        >
          再読み込み
        </button>
      </div>
    </div>
  );
}
