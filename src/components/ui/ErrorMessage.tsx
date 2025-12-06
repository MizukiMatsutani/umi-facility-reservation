'use client';

import { ErrorType, ERROR_MESSAGES } from '@/lib/types/api';

interface ErrorMessageProps {
  errorType: ErrorType;
  message?: string;
  onRetry?: () => void;
}

/**
 * エラーメッセージを表示するコンポーネント
 * エラータイプに応じたメッセージと再試行ボタンを表示します
 */
export default function ErrorMessage({
  errorType,
  message,
  onRetry,
}: ErrorMessageProps) {
  // カスタムメッセージがある場合はそれを使用、なければデフォルトメッセージ
  const displayMessage = message || ERROR_MESSAGES[errorType];

  // エラータイプに応じたアイコンカラー
  const getIconColor = () => {
    switch (errorType) {
      case 'validation':
        return 'text-yellow-600';
      case 'rate_limit':
        return 'text-orange-600';
      default:
        return 'text-red-600';
    }
  };

  return (
    <div
      className="flex flex-col items-center gap-4 rounded-lg border border-red-200 bg-red-50 p-6"
      role="alert"
      aria-live="assertive"
    >
      {/* エラーアイコン */}
      <div className={`text-4xl ${getIconColor()}`}>⚠️</div>

      {/* エラーメッセージ */}
      <p className="text-center text-base text-gray-800">
        {displayMessage}
      </p>

      {/* 再試行ボタン */}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="min-h-[44px] min-w-[44px] rounded-md bg-blue-600 px-6 py-2 text-base font-medium text-white hover:bg-blue-700 active:bg-blue-800"
          aria-label="再試行"
        >
          再試行
        </button>
      )}
    </div>
  );
}
