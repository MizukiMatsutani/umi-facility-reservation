'use client';

import { useState } from 'react';
import DatePicker from './ui/DatePicker';
import TimePicker from './ui/TimePicker';
import QuickDateSelect from './ui/QuickDateSelect';
import { SearchParams, TimeRange } from '@/lib/types';
import { validateSearchParams, validateTimeRange } from '@/lib/utils/validation';

interface SearchFormProps {
  onSubmit: (params: SearchParams) => void;
  isLoading?: boolean;
}

/**
 * 検索フォームコンポーネント
 * DatePicker、TimePicker、QuickDateSelectを統合し、検索パラメータのバリデーションと送信を行います
 */
export default function SearchForm({ onSubmit, isLoading = false }: SearchFormProps) {
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange | undefined>(undefined);
  const [validationError, setValidationError] = useState<string>('');

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

  // 時間範囲変更ハンドラ
  const handleTimeRangeChange = (range: TimeRange | undefined) => {
    setTimeRange(range);
    setValidationError('');
  };

  // フォーム送信ハンドラ
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setValidationError('');

    try {
      // バリデーション実行
      validateSearchParams(selectedDates);
      validateTimeRange(timeRange);

      // 検索パラメータ構築
      const params: SearchParams = {
        dates: selectedDates,
        timeRange,
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
          selectedDates={selectedDates}
          onDateSelect={handleDateSelect}
          minDate={new Date()}
        />
      </div>

      {/* 時間範囲選択 */}
      <TimePicker value={timeRange} onChange={handleTimeRangeChange} />

      {/* バリデーションエラー表示 */}
      {validationError && (
        <div
          className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-800"
          role="alert"
        >
          {validationError}
        </div>
      )}

      {/* 検索ボタン */}
      <button
        type="submit"
        disabled={isLoading}
        className="min-h-[44px] rounded-md bg-blue-600 px-6 py-3 text-base font-medium text-white hover:bg-blue-700 active:bg-blue-800 disabled:cursor-not-allowed disabled:bg-gray-400"
        aria-label="施設を検索"
      >
        {isLoading ? '検索中...' : '検索'}
      </button>

      {/* 選択状態の表示 */}
      {selectedDates.length > 0 && (
        <div className="text-sm text-gray-600">
          <p>
            選択中: {selectedDates.length}日
            {timeRange && ` / ${timeRange.from} 〜 ${timeRange.to}`}
          </p>
        </div>
      )}
    </form>
  );
}
