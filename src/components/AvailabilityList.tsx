'use client';

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
 * AvailabilityList - ガントチャート風の空き状況表示コンポーネント
 *
 * 縦軸に時間帯、横軸にコート名を配置したマトリックス形式で空き状況を表示します。
 * 最大3カラムまで対応し、視覚的に連続した空き時間を把握しやすくします。
 *
 * 色分け:
 * - 緑背景: 空き
 * - グレー背景: 満
 *
 * @param props - コンポーネントのプロパティ
 * @returns ガントチャート風の表示要素
 */
export default function AvailabilityList({
  slots,
  dateLabel,
}: AvailabilityListProps) {
  if (slots.length === 0) {
    return (
      <div className="w-full rounded-lg border border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-600">
        時間帯データがありません
      </div>
    );
  }

  // 最初のスロットからコート名を取得
  const courts = slots[0]?.courts || [];
  const courtNames = courts.map(c => c.name);

  return (
    <div className="w-full">
      {/* ヘッダー */}
      {dateLabel && (
        <div className="mb-3 text-sm font-medium text-gray-800">
          {dateLabel}
        </div>
      )}

      {/* ガントチャート風テーブル */}
      <div className="overflow-x-auto rounded-lg border border-gray-300">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border-r border-gray-300 px-3 py-2 text-left text-sm font-semibold text-gray-700">
                時間
              </th>
              {courtNames.map((courtName, index) => (
                <th
                  key={`court-header-${index}`}
                  className="border-r border-gray-300 px-3 py-2 text-center text-sm font-semibold text-gray-700 last:border-r-0"
                >
                  {courtName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slots.map((slot, slotIndex) => (
              <tr key={`slot-${slotIndex}`} className="border-t border-gray-300">
                <td className="border-r border-gray-300 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700">
                  {slot.time}
                </td>
                {slot.courts.map((court, courtIndex) => (
                  <td
                    key={`court-${slotIndex}-${courtIndex}`}
                    className={`border-r border-gray-300 px-3 py-2 text-center text-sm font-medium last:border-r-0 ${
                      court.available
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {court.available ? '○' : '×'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 凡例 */}
      <div className="mt-2 flex items-center gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-green-100 border border-green-300"></span>
          <span>空き</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-gray-200 border border-gray-300"></span>
          <span>満</span>
        </div>
      </div>
    </div>
  );
}
