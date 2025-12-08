'use client';

import { useState } from 'react';
import DatePicker from './ui/DatePicker';
import QuickDateSelect from './ui/QuickDateSelect';
import ConfirmDialog from './ui/ConfirmDialog';
import { SearchParams } from '@/lib/types';
import { validateSearchParams } from '@/lib/utils/validation';
import { Calendar, RefreshCw, Search } from 'lucide-react';

/**
 * プログレス状態の型定義
 */
export interface ProgressState {
  step: string;
  progress: number;
  currentDate?: Date;
}

interface SearchFormProps {
  onSubmit: (params: SearchParams) => void;
  onValidationError?: (error: string) => void;
  isLoading?: boolean;
  initialDates?: Date[];
  progressState?: ProgressState | null;
}

/**
 * 検索フォームコンポーネント
 * DatePicker、QuickDateSelectを統合し、検索パラメータのバリデーションと送信を行います
 */
export default function SearchForm({
  onSubmit,
  onValidationError,
  isLoading = false,
  initialDates = [],
  progressState = null,
}: SearchFormProps) {
  const [selectedDates, setSelectedDates] = useState<Date[]>(initialDates);
  const [resetKey, setResetKey] = useState<number>(0); // リセット用のキー
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingParams, setPendingParams] = useState<SearchParams | null>(null);

  // クイック選択ハンドラ
  const handleQuickSelect = (dates: Date[]) => {
    setSelectedDates(dates);
  };

  // 日付選択ハンドラ
  const handleDateSelect = (dates: Date[]) => {
    setSelectedDates(dates);
  };

  // リセットハンドラ
  const handleReset = () => {
    setSelectedDates([]);
    setResetKey(prev => prev + 1); // キーを変更してコンポーネントを再マウント
  };

  // 確認ダイアログのキャンセルハンドラ
  const handleDialogCancel = () => {
    setShowConfirmDialog(false);
    setPendingParams(null);
  };

  // 確認ダイアログの確認ハンドラ
  const handleDialogConfirm = () => {
    setShowConfirmDialog(false);
    if (pendingParams) {
      onSubmit(pendingParams);
      setPendingParams(null);
    }
  };

  // フォーム送信ハンドラ
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      // バリデーション実行
      validateSearchParams(selectedDates);

      // 検索パラメータ構築
      const params: SearchParams = {
        dates: selectedDates,
      };

      // 複数日選択の場合は確認ダイアログを表示
      if (selectedDates.length > 1) {
        setPendingParams(params);
        setShowConfirmDialog(true);
        return;
      }

      // 1日のみの場合はそのまま検索実行
      onSubmit(params);
    } catch (error) {
      // バリデーションエラーをコールバック
      if (error instanceof Error) {
        onValidationError?.(error.message);
      } else {
        onValidationError?.('入力内容に誤りがあります');
      }
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* クイック日付選択 */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-900">クイック選択</h3>
          </div>
          <QuickDateSelect onQuickSelect={handleQuickSelect} />
        </div>

        {/* 日付選択 */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <label className="text-sm font-semibold text-gray-900">
              検索する日付を選択
            </label>
          </div>
          <DatePicker
            key={`date-picker-${resetKey}`}
            selectedDates={selectedDates}
            onDateSelect={handleDateSelect}
            minDate={new Date()}
          />
        </div>

        {/* 選択状態の表示 */}
        {selectedDates.length > 0 && !isLoading && (
          <div className="rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600">
                  <span className="text-sm font-bold text-white">{selectedDates.length}</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  日付を選択中
                </span>
              </div>
            </div>
          </div>
        )}

        {/* プログレス表示 */}
        {isLoading && progressState && (
          <div className="rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border border-blue-200">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">
                  {progressState.step}
                </span>
                <span className="text-sm font-bold text-blue-600">
                  {progressState.progress.toFixed(0)}%
                </span>
              </div>
              {/* プログレスバー */}
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progressState.progress}%` }}
                />
              </div>
              {/* 現在処理中の日付 */}
              {progressState.currentDate && (
                <p className="text-xs text-gray-600">
                  処理中: {new Date(progressState.currentDate).toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              )}
            </div>
          </div>
        )}

        {/* 検索ボタンとリセットボタン */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            disabled={isLoading || selectedDates.length === 0}
            className="
              group relative flex-1 overflow-hidden rounded-lg
              bg-gradient-to-r from-blue-600 to-indigo-600
              px-6 py-3.5 text-base font-semibold text-white
              shadow-lg shadow-blue-500/30
              transition-all duration-300 ease-out
              hover:shadow-xl hover:shadow-blue-500/40
              hover:scale-[1.02]
              active:scale-[0.98]
              disabled:cursor-not-allowed disabled:opacity-50
              disabled:hover:scale-100 disabled:hover:shadow-lg
            "
            aria-label="施設を検索"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-indigo-700 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <div className="relative flex items-center justify-center gap-2">
              {isLoading ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>検索中...</span>
                </>
              ) : (
                <>
                  <Search className="h-5 w-5" />
                  <span>検索</span>
                </>
              )}
            </div>
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={isLoading}
            className="
              group relative flex-shrink-0 overflow-hidden rounded-lg
              bg-white border-2 border-gray-300
              px-6 py-3.5 text-base font-semibold text-gray-700
              shadow-sm
              transition-all duration-300 ease-out
              hover:border-gray-400 hover:shadow-md
              hover:scale-[1.02]
              active:scale-[0.98]
              disabled:cursor-not-allowed disabled:opacity-50
              disabled:hover:scale-100
              sm:flex-initial sm:px-8
            "
            aria-label="選択をリセット"
          >
            <div className="flex items-center justify-center gap-2">
              <RefreshCw className="h-5 w-5 transition-transform duration-300 group-hover:rotate-180" />
              <span>リセット</span>
            </div>
          </button>
        </div>
      </form>

      {/* 確認ダイアログ */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        onConfirm={handleDialogConfirm}
        onCancel={handleDialogCancel}
        title="検索に時間がかかります"
        message="複数日を検索する場合、30秒〜1分程度お時間をいただく場合があります。検索を続けますか？"
        confirmText="検索を続ける"
        cancelText="キャンセル"
      />
    </>
  );
}
