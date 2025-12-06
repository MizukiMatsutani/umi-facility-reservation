'use client';

import { useState, useEffect } from 'react';
import { TimeRange } from '@/lib/types';

interface TimePickerProps {
  value: TimeRange | undefined;
  onChange: (timeRange: TimeRange | undefined) => void;
}

/**
 * 時間範囲選択コンポーネント
 * From-To形式で時刻を選択でき、未選択時は全時間帯を検索します
 */
export default function TimePicker({ value, onChange }: TimePickerProps) {
  const [fromTime, setFromTime] = useState<string | undefined>(value?.from);
  const [toTime, setToTime] = useState<string | undefined>(value?.to);
  const [validationError, setValidationError] = useState<string>('');

  // 時刻オプションを生成（8:30～21:30、30分刻み）
  const generateTimeOptions = (): string[] => {
    const options: string[] = [];
    const startHour = 8;
    const startMinute = 30;
    const endHour = 21;
    const endMinute = 30;

    for (let hour = startHour; hour <= endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        // 開始時刻チェック
        if (hour === startHour && minute < startMinute) continue;
        // 終了時刻チェック
        if (hour === endHour && minute > endMinute) break;

        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        options.push(timeString);
      }
    }

    return options;
  };

  const timeOptions = generateTimeOptions();

  // バリデーション: ToはFromより後でなければならない
  useEffect(() => {
    if (fromTime && toTime) {
      if (fromTime >= toTime) {
        setValidationError('終了時刻は開始時刻より後にしてください');
        onChange(undefined);
        return;
      }
    }

    setValidationError('');

    // 両方選択されている場合のみTimeRangeを更新
    if (fromTime && toTime) {
      onChange({ from: fromTime, to: toTime });
    } else {
      // どちらか未選択なら全時間帯（undefined）
      onChange(undefined);
    }
  }, [fromTime, toTime]);

  // Fromを変更
  const handleFromChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    setFromTime(selectedValue === '' ? undefined : selectedValue);
  };

  // Toを変更
  const handleToChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    setToTime(selectedValue === '' ? undefined : selectedValue);
  };

  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-medium text-gray-700">
        時間帯（オプション）
      </label>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* From 時刻選択 */}
        <div className="flex items-center gap-2">
          <label htmlFor="time-from" className="text-base text-gray-600">
            開始
          </label>
          <select
            id="time-from"
            value={fromTime || ''}
            onChange={handleFromChange}
            className="min-h-[44px] flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            aria-label="開始時刻"
          >
            <option value="">全時間帯</option>
            {timeOptions.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </div>

        <span className="hidden text-gray-600 sm:block">〜</span>

        {/* To 時刻選択 */}
        <div className="flex items-center gap-2">
          <label htmlFor="time-to" className="text-base text-gray-600">
            終了
          </label>
          <select
            id="time-to"
            value={toTime || ''}
            onChange={handleToChange}
            className="min-h-[44px] flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            aria-label="終了時刻"
          >
            <option value="">全時間帯</option>
            {timeOptions.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* バリデーションエラー表示 */}
      {validationError && (
        <p className="text-sm text-red-600" role="alert">
          {validationError}
        </p>
      )}

      {/* 説明テキスト */}
      <p className="text-sm text-gray-500">
        時間帯を指定しない場合は、すべての時間帯を検索します
      </p>
    </div>
  );
}
