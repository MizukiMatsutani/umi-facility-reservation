'use client';

import { useState } from 'react';
import DatePicker from './ui/DatePicker';
import QuickDateSelect from './ui/QuickDateSelect';
import { SearchParams } from '@/lib/types';
import { validateSearchParams } from '@/lib/utils/validation';

interface SearchFormProps {
  onSubmit: (params: SearchParams) => void;
  isLoading?: boolean;
  initialDates?: Date[];
}

/**
 * 検索フォームコンポーネント
 * DatePicker、QuickDateSelectを統合し、検索パラメータのバリデーションと送信を行います
 */
export default function SearchForm({
  onSubmit,
  isLoading = false,
  initialDates = [],
}: SearchFormProps) {
  const [selectedDates, setSelectedDates] = useState<Date[]>(initialDates);
  const [validationError, setValidationError] = useState<string>('');
  const [resetKey, setResetKey] = useState<number>(0); // リセット用のキー

  // クイック選択ハンドラ
  const handleQuickSelect = (dates: Date[]) => {
    setSelectedDates(dates);
    setValidationError('');
  };

  // 日付選択ハンドラ
  const handleDateSelect = (dates: Date[]) => {
    setSelectedDates(dates);
    setValidationError('');
  };

  // リセットハンドラ
  const handleReset = () => {
    setSelectedDates([]);
    setValidationError('');
    setResetKey(prev => prev + 1); // キーを変更してコンポーネントを再マウント
  };

  // フォーム送信ハンドラ
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setValidationError('');

    try {
      // バリデーション実行
      validateSearchParams(selectedDates);

      // 検索パラメータ構築
      const params: SearchParams = {
        dates: selectedDates,
      };

      // コールバック実行
      onSubmit(params);
    } catch (error) {
      // バリデーションエラーを表示
      if (error instanceof Error) {
        setValidationError(error.message);
      } else {
        setValidationError('入力内容に誤りがあります');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* クイック日付選択 */}
      <QuickDateSelect onQuickSelect={handleQuickSelect} />

      {/* 日付選択 */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700">
          検索する日付を選択
        </label>
        <DatePicker
          key={`date-picker-${resetKey}`}
          selectedDates={selectedDates}
          onDateSelect={handleDateSelect}
          minDate={new Date()}
        />
      </div>

      {/* バリデーションエラー表示 */}
      {validationError && (
        <div
          className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-800"
          role="alert"
        >
          {validationError}
        </div>
      )}

      {/* 検索ボタンとリセットボタン */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 min-h-[44px] rounded-md bg-blue-600 px-6 py-3 text-base font-medium text-white hover:bg-blue-700 active:bg-blue-800 disabled:cursor-not-allowed disabled:bg-gray-400"
          aria-label="施設を検索"
        >
          {isLoading ? '検索中...' : '検索'}
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={isLoading}
          className="flex-1 min-h-[44px] rounded-md bg-gray-200 px-6 py-3 text-base font-medium text-gray-700 hover:bg-gray-300 active:bg-gray-400 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 sm:flex-initial sm:px-8"
          aria-label="選択をリセット"
        >
          リセット
        </button>
      </div>

      {/* 選択状態の表示 */}
      {selectedDates.length > 0 && (
        <div className="text-sm text-gray-600">
          <p>選択中: {selectedDates.length}日</p>
        </div>
      )}
    </form>
  );
}
