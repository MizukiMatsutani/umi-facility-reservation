'use client';

import { AlertCircle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

/**
 * 確認ダイアログコンポーネント
 *
 * ユーザーに操作の確認を求めるモーダルダイアログを表示します。
 */
export default function ConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = '続ける',
  cancelText = 'キャンセル',
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* オーバーレイ */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* ダイアログ */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-slide-up">
        <div
          className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dialog-title"
        >
          {/* アイコンとタイトル */}
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
              <AlertCircle className="h-6 w-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3
                id="dialog-title"
                className="text-lg font-semibold text-gray-900"
              >
                {title}
              </h3>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                {message}
              </p>
            </div>
          </div>

          {/* ボタン */}
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="
                rounded-lg border-2 border-gray-300 bg-white
                px-4 py-2.5 text-sm font-semibold text-gray-700
                shadow-sm transition-all duration-200
                hover:border-gray-400 hover:shadow-md
                focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2
              "
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="
                rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600
                px-4 py-2.5 text-sm font-semibold text-white
                shadow-lg shadow-blue-500/30 transition-all duration-200
                hover:shadow-xl hover:shadow-blue-500/40
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              "
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
