'use client';

import { generateDateRange } from '@/lib/utils/date';

interface QuickDateSelectProps {
  onQuickSelect: (dates: Date[]) => void;
}

/**
 * クイック日付選択コンポーネント
 * 「本日から1週間」ボタンで簡単に7日分の日付を選択できます
 */
export default function QuickDateSelect({ onQuickSelect }: QuickDateSelectProps) {
  // 本日から1週間（7日分）を選択
  const handleWeekSelect = () => {
    const today = new Date();
    const weekDates = generateDateRange(today, 7);
    onQuickSelect(weekDates);
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700">
        クイック選択
      </label>

      <button
        type="button"
        onClick={handleWeekSelect}
        className="min-h-[44px] min-w-[44px] rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100"
        aria-label="本日から1週間の日付を選択"
      >
        本日から1週間
      </button>
    </div>
  );
}
