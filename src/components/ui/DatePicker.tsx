'use client';

import { useState } from 'react';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameDay,
  isBefore,
  startOfDay,
  addMonths,
  subMonths,
  getDay,
} from 'date-fns';
import { ja } from 'date-fns/locale';

interface DatePickerProps {
  selectedDates: Date[];
  onDateSelect: (dates: Date[]) => void;
  minDate?: Date;
}

/**
 * カレンダーグリッドで複数日選択を可能にするDatePickerコンポーネント
 * モバイルタッチ操作に最適化されています
 */
export default function DatePicker({
  selectedDates,
  onDateSelect,
  minDate,
}: DatePickerProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // 月の最初と最後の日を取得
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // 月の最初の日の曜日（0: 日曜日）
  const startDayOfWeek = getDay(monthStart);

  // 日付が選択されているかチェック
  const isDateSelected = (date: Date) => {
    return selectedDates.some((selectedDate) => isSameDay(selectedDate, date));
  };

  // 日付が過去日かチェック
  const isDateDisabled = (date: Date) => {
    if (!minDate) return false;
    return isBefore(startOfDay(date), startOfDay(minDate));
  };

  // 日付選択ハンドラ
  const handleDateClick = (date: Date) => {
    if (isDateDisabled(date)) return;

    if (isDateSelected(date)) {
      // 選択解除
      onDateSelect(
        selectedDates.filter((selectedDate) => !isSameDay(selectedDate, date))
      );
    } else {
      // 選択追加
      onDateSelect([...selectedDates, date]);
    }
  };

  // 前の月へ
  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  // 次の月へ
  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  // 曜日ヘッダー
  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

  return (
    <div className="w-full">
      {/* 月ナビゲーション */}
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={handlePreviousMonth}
          className="min-h-[44px] min-w-[44px] rounded-md p-2 text-gray-600 hover:bg-gray-100 active:bg-gray-200"
          aria-label="前の月"
        >
          ‹
        </button>

        <h2 className="text-lg font-medium">
          {format(currentMonth, 'yyyy年M月', { locale: ja })}
        </h2>

        <button
          type="button"
          onClick={handleNextMonth}
          className="min-h-[44px] min-w-[44px] rounded-md p-2 text-gray-600 hover:bg-gray-100 active:bg-gray-200"
          aria-label="次の月"
        >
          ›
        </button>
      </div>

      {/* カレンダーグリッド */}
      <div className="grid grid-cols-7 gap-1">
        {/* 曜日ヘッダー */}
        {weekDays.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-sm font-medium text-gray-600"
          >
            {day}
          </div>
        ))}

        {/* 空白セル（月の最初の日まで） */}
        {Array.from({ length: startDayOfWeek }).map((_, index) => (
          <div key={`empty-${index}`} />
        ))}

        {/* 日付セル */}
        {daysInMonth.map((date) => {
          const selected = isDateSelected(date);
          const disabled = isDateDisabled(date);

          return (
            <button
              key={date.toISOString()}
              type="button"
              onClick={() => handleDateClick(date)}
              disabled={disabled}
              className={`
                min-h-[44px] min-w-[44px] rounded-md p-2 text-base
                ${
                  selected
                    ? 'bg-blue-600 text-white font-medium'
                    : disabled
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-800 hover:bg-gray-100 active:bg-gray-200'
                }
              `}
              aria-label={format(date, 'M月d日', { locale: ja })}
              aria-pressed={selected}
            >
              {format(date, 'd')}
            </button>
          );
        })}
      </div>

      {/* 選択された日付の表示 */}
      {selectedDates.length > 0 && (
        <div className="mt-4 text-sm text-gray-600">
          選択中: {selectedDates.length}日
        </div>
      )}
    </div>
  );
}
