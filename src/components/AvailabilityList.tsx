'use client';

import { useState } from 'react';
import type { TimeSlot } from '@/lib/types';

/**
 * AvailabilityListコンポーネントのプロパティ
 */
interface AvailabilityListProps {
  /** 表示する時間帯のリスト */
  slots: readonly TimeSlot[];
  /** 日付文字列（表示用） */
  dateLabel?: string;
}

/**
 * AvailabilityList - 時間帯ごとの空き状況を表示するコンポーネント
 *
 * 特定の日付における時間帯ごとの空き状況をリスト表示します。
 * 空き状況は色で視覚的に区別され（緑=空き、グレー=空いていない）、
 * 「空きのみ表示」ボタンで表示を切り替えることができます。
 *
 * @param props - コンポーネントのプロパティ
 * @returns 時間帯リストのReact要素
 */
export default function AvailabilityList({
  slots,
  dateLabel,
}: AvailabilityListProps) {
  // 全ての時間帯を表示するか、空きのある時間帯のみ表示するかを管理
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);

  // フィルタリングされた時間帯のリスト
  const filteredSlots = showAvailableOnly
    ? slots.filter((slot) => slot.available)
    : slots;

  // 空きのある時間帯の数をカウント
  const availableCount = slots.filter((slot) => slot.available).length;

  return (
    <div className="w-full">
      {/* ヘッダー部分：統計情報と切り替えボタン */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="text-sm text-gray-600">
          {dateLabel && (
            <span className="font-medium text-gray-800">{dateLabel}</span>
          )}{' '}
          <span>
            空き: {availableCount} / {slots.length}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowAvailableOnly(!showAvailableOnly)}
          className="min-h-[44px] min-w-[44px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 active:bg-gray-100"
          aria-label={
            showAvailableOnly ? '全ての時間帯を表示' : '空きのみ表示'
          }
        >
          {showAvailableOnly ? '全て表示' : '空きのみ'}
        </button>
      </div>

      {/* 時間帯リスト */}
      {filteredSlots.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-600">
          {showAvailableOnly
            ? '空いている時間帯がありません'
            : '時間帯データがありません'}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredSlots.map((slot, index) => (
            <div
              key={`${slot.time}-${index}`}
              className={`rounded-lg border px-4 py-3 ${
                slot.available
                  ? 'border-green-300 bg-green-50 text-green-800'
                  : 'border-gray-300 bg-gray-50 text-gray-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{slot.time}</span>
                <span className="text-sm">
                  {slot.available ? '○ 空き' : '× 空いていない'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
