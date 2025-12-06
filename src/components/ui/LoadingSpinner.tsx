'use client';

import { Loader2 } from 'lucide-react';

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
      className="flex flex-col items-center justify-center gap-6 p-12"
      role="status"
      aria-label="読み込み中"
    >
      {/* スピナー */}
      <div className="relative">
        {/* 外側のリング */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 opacity-20 blur-xl animate-pulse" />

        {/* 回転するスピナー */}
        <div className="relative flex items-center justify-center">
          <Loader2 className="h-16 w-16 animate-spin text-blue-600" />
        </div>
      </div>

      {/* メッセージ */}
      {message && (
        <div className="text-center space-y-2">
          <p className="text-lg font-medium text-gray-900">
            {message}
          </p>
          <div className="flex items-center justify-center gap-1">
            <div className="h-2 w-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="h-2 w-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="h-2 w-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      )}
    </div>
  );
}
