'use client';

import { useState } from 'react';
import type { FacilityAvailability } from '@/lib/types';
import { formatDate } from '@/lib/utils/date';
import AvailabilityList from './AvailabilityList';

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

  /**
   * スポーツ種目を日本語で表示
   */
  const getSportTypeLabel = (type: 'basketball' | 'mini-basketball'): string => {
    return type === 'basketball' ? 'バスケットボール' : 'ミニバスケットボール';
  };

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* 施設情報ヘッダー */}
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
        <h2 className="text-lg font-bold text-gray-900">{facility.name}</h2>
        <p className="mt-1 text-sm text-gray-600">
          {getSportTypeLabel(facility.type)}
        </p>
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

            // 空きのある時間帯の数をカウント
            const availableCount = availData.slots.filter(
              (slot) => slot.available
            ).length;

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
                    <div className="mt-1 text-sm text-gray-600">
                      空き: {availableCount} / {availData.slots.length}
                    </div>
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
