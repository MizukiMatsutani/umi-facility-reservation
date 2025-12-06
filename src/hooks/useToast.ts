'use client';

import { useState, useCallback } from 'react';
import { ToastType } from '@/components/ui/Toast';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

/**
 * トースト通知を管理するカスタムフック
 *
 * @returns トースト管理用のメソッドとトーストリスト
 */
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  /**
   * トーストを追加
   */
  const addToast = useCallback((type: ToastType, message: string, duration = 5000) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: Toast = { id, type, message, duration };
    setToasts((prev) => [...prev, newToast]);
    return id;
  }, []);

  /**
   * 成功トーストを表示
   */
  const success = useCallback(
    (message: string, duration?: number) => {
      return addToast('success', message, duration);
    },
    [addToast]
  );

  /**
   * エラートーストを表示
   */
  const error = useCallback(
    (message: string, duration?: number) => {
      return addToast('error', message, duration);
    },
    [addToast]
  );

  /**
   * 情報トーストを表示
   */
  const info = useCallback(
    (message: string, duration?: number) => {
      return addToast('info', message, duration);
    },
    [addToast]
  );

  /**
   * 警告トーストを表示
   */
  const warning = useCallback(
    (message: string, duration?: number) => {
      return addToast('warning', message, duration);
    },
    [addToast]
  );

  /**
   * トーストを削除
   */
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  /**
   * すべてのトーストをクリア
   */
  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  return {
    toasts,
    success,
    error,
    info,
    warning,
    removeToast,
    clearAll,
  };
}
