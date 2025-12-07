'use client';

import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

/**
 * トースト通知コンポーネント
 *
 * 成功、エラー、情報、警告メッセージを表示します
 */
export function Toast({ id, type, message, duration = 5000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // マウント時にアニメーション開始
    requestAnimationFrame(() => {
      setIsVisible(true);
    });

    // 自動クローズタイマー
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onClose(id);
    }, 300); // アニメーション時間と同期
  };

  // タイプごとのスタイル設定
  const styles = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: <CheckCircle className="h-5 w-5 text-green-600" />,
      iconBg: 'bg-green-100',
      text: 'text-green-800',
      progressBar: 'bg-green-500',
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: <AlertCircle className="h-5 w-5 text-red-600" />,
      iconBg: 'bg-red-100',
      text: 'text-red-800',
      progressBar: 'bg-red-500',
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      icon: <AlertTriangle className="h-5 w-5 text-yellow-600" />,
      iconBg: 'bg-yellow-100',
      text: 'text-yellow-800',
      progressBar: 'bg-yellow-500',
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: <Info className="h-5 w-5 text-blue-600" />,
      iconBg: 'bg-blue-100',
      text: 'text-blue-800',
      progressBar: 'bg-blue-500',
    },
  };

  const style = styles[type];

  return (
    <div
      className={`
        pointer-events-auto w-full max-w-md overflow-hidden rounded-lg border shadow-lg
        transition-all duration-300 ease-out
        ${style.bg} ${style.border}
        ${isVisible && !isLeaving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
      role="alert"
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* アイコン */}
          <div className={`flex-shrink-0 rounded-full p-1.5 ${style.iconBg}`}>
            {style.icon}
          </div>

          {/* メッセージ */}
          <div className="flex-1 pt-0.5">
            <p className={`text-sm font-medium ${style.text}`}>{message}</p>
          </div>

          {/* 閉じるボタン */}
          <button
            onClick={handleClose}
            className={`
              flex-shrink-0 rounded-md p-1.5
              ${style.text} opacity-70
              hover:opacity-100
              focus:outline-none focus:ring-2 focus:ring-offset-2
              transition-opacity
            `}
            aria-label="閉じる"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* プログレスバー（自動クローズの場合） */}
      {duration > 0 && (
        <div className="h-1 w-full bg-gray-200">
          <div
            className={`h-full ${style.progressBar}`}
            style={{
              width: '100%',
              animation: `toast-shrink ${duration}ms linear forwards`,
            }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * トーストコンテナコンポーネント
 *
 * 複数のトーストを管理し、画面右上に表示します
 */
export interface ToastContainerProps {
  toasts: Array<Omit<ToastProps, 'onClose'>>;
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div
      aria-live="assertive"
      className="pointer-events-none fixed inset-0 z-50 flex flex-col items-end gap-3 p-4 sm:p-6"
      style={{ top: '1rem', right: '1rem', left: 'auto', bottom: 'auto' }}
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={onClose} />
      ))}
    </div>
  );
}
