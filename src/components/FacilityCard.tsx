'use client';

import { useState } from 'react';
import type { FacilityAvailability, AvailabilityData } from '@/lib/types';
import { formatDate } from '@/lib/utils/date';
import AvailabilityList from './AvailabilityList';

/**
 * コートごとの連続空き時間帯の配列
 */
interface CourtSlots {
  courtName: string;
  timeRanges: string[]; // ["8:30-14:00", "16:30-21:30"]
}

function calculateContinuousSlots(availData: AvailabilityData): CourtSlots[] {
  // コート名のリストを取得（最初のスロットから）
  if (availData.slots.length === 0 || availData.slots[0].courts.length === 0) {
    return [];
  }

  const courtNames = availData.slots[0].courts.map(c => c.name);
  const courtSlotsMap = new Map<string, string[]>();

  // 各コートごとに連続した空き時間を探す
  courtNames.forEach(courtName => {
    const timeRanges: string[] = [];
    let continuousStart: string | null = null;

    availData.slots.forEach((slot, index) => {
      const court = slot.courts.find(c => c.name === courtName);
      const isAvailable = court?.available || false;

      if (isAvailable) {
        // 空きの場合
        if (continuousStart === null) {
          // 連続開始
          continuousStart = slot.time.split('-')[0];
        }
      } else {
        // 空きでない場合
        if (continuousStart !== null) {
          // 連続終了
          const prevSlot = availData.slots[index - 1];
          const endTime = prevSlot.time.split('-')[1];
          timeRanges.push(`${continuousStart}-${endTime}`);
          continuousStart = null;
        }
      }
    });

    // 最後まで連続していた場合
    if (continuousStart !== null) {
      const lastSlot = availData.slots[availData.slots.length - 1];
      const endTime = lastSlot.time.split('-')[1];
      timeRanges.push(`${continuousStart}-${endTime}`);
    }

    // 空き時間がある場合のみMapに追加
    if (timeRanges.length > 0) {
      courtSlotsMap.set(courtName, timeRanges);
    }
  });

  // MapをCourtSlots配列に変換
  return Array.from(courtSlotsMap.entries()).map(([courtName, timeRanges]) => ({
    courtName,
    timeRanges,
  }));
}

/**
 * FacilityCardコンポーネントのプロパティ
 */
interface FacilityCardProps {
  /** 施設と空き状況データ */
  facilityAvailability: FacilityAvailability;
}

/**
 * FacilityCard - 施設単位の空き状況を表示するコンポーネント
 *
 * 施設名と日付ごとの空き状況を表示します。
 * 各日付セクションは展開/折りたたみが可能で、
 * AvailabilityListコンポーネントを使用して時間帯リストを表示します。
 *
 * @param props - コンポーネントのプロパティ
 * @returns 施設カードのReact要素
 */
export default function FacilityCard({
  facilityAvailability,
}: FacilityCardProps) {
  const { facility, availability } = facilityAvailability;

  // 各日付の展開/折りたたみ状態を管理
  // キーは日付のISO文字列、値は展開状態（true=展開、false=折りたたみ）
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>(
    {}
  );

  /**
   * 指定された日付の展開/折りたたみ状態を切り替える
   */
  const toggleDate = (dateIso: string) => {
    setExpandedDates((prev) => ({
      ...prev,
      [dateIso]: !prev[dateIso],
    }));
  };

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* 施設情報ヘッダー */}
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
        <h2 className="text-lg font-bold text-gray-900">{facility.name}</h2>
      </div>

      {/* 日付ごとの空き状況セクション */}
      <div className="divide-y divide-gray-200">
        {availability.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="text-gray-600 mb-3">空き状況データがありません</p>
            <a
              href="https://www.11489.jp/Umi/web/Home/WgR_ModeSelect"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              宇美町の施設予約サイトで詳細を確認
            </a>
          </div>
        ) : (
          availability.map((availData) => {
            const dateIso = availData.date.toISOString();
            const isExpanded = expandedDates[dateIso] ?? false;
            const dateLabel = formatDate(availData.date);

            // コートごとの連続空き時間を計算
            const continuousSlots = calculateContinuousSlots(availData);

            return (
              <div key={dateIso} className="px-4 py-3">
                {/* 日付ヘッダーと展開/折りたたみボタン */}
                <button
                  type="button"
                  onClick={() => toggleDate(dateIso)}
                  className="flex w-full min-h-[44px] items-center justify-between gap-2 text-left transition-colors hover:bg-gray-50 active:bg-gray-100 rounded-md px-2 py-2"
                  aria-expanded={isExpanded}
                  aria-label={`${dateLabel}の空き状況を${isExpanded ? '折りたたむ' : '展開する'}`}
                >
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">
                      {dateLabel}
                    </div>
                    {/* 連続空き時間サマリ */}
                    {continuousSlots.length > 0 ? (
                      <div className="mt-1 text-sm text-gray-600 space-y-0.5">
                        {continuousSlots.map((courtSlot, index) => (
                          <div key={index}>
                            {courtSlot.courtName}
                            <br />
                            <span className="ml-4">
                              {courtSlot.timeRanges.join('、')}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-1 text-sm text-gray-500">
                        空きなし
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    <svg
                      className={`h-5 w-5 text-gray-400 transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </button>

                {/* 時間帯リスト（展開時のみ表示） */}
                {isExpanded && (
                  <div className="mt-3">
                    <AvailabilityList
                      slots={availData.slots}
                      dateLabel={dateLabel}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
