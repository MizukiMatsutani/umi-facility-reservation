'use client';

interface LoadingSpinnerProps {
  message?: string;
}

/**
 * ローディング状態を表示するスピナーコンポーネント
 * アニメーション付きスピナーとオプションのメッセージを表示します
 */
export default function LoadingSpinner({ message }: LoadingSpinnerProps) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 p-8"
      role="status"
      aria-label="読み込み中"
    >
      {/* スピナー */}
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />

      {/* メッセージ */}
      {message && (
        <p className="text-center text-base text-gray-700">
          {message}
        </p>
      )}
    </div>
  );
}
