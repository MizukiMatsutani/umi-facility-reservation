'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import FacilityCard from '@/components/FacilityCard';
import type { FacilityAvailability, SearchParams } from '@/lib/types';
import { formatDate } from '@/lib/utils/date';

/**
 * 検索結果ページ
 *
 * スクレイピング結果を表示するページです。
 * セッションストレージから検索結果と検索条件を取得し、
 * FacilityCardコンポーネントで各施設の空き状況を表示します。
 */
export default function ResultsPage() {
  const router = useRouter();
  const [facilities, setFacilities] = useState<FacilityAvailability[]>([]);
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // セッションストレージから検索結果と検索条件を取得
    const resultsJson = sessionStorage.getItem('searchResults');
    const paramsJson = sessionStorage.getItem('searchParams');

    if (!resultsJson || !paramsJson) {
      // データがない場合はホームページにリダイレクト
      router.push('/');
      return;
    }

    try {
      const parsedFacilities: FacilityAvailability[] = JSON.parse(resultsJson);
      const parsedParams: SearchParams = JSON.parse(paramsJson);

      // Date文字列をDateオブジェクトに変換（イミュータブルに）
      const facilitiesWithDates = parsedFacilities.map((facility) => ({
        ...facility,
        availability: facility.availability.map((avail) => ({
          ...avail,
          date: new Date(avail.date),
        })),
      }));

      const paramsWithDates = {
        ...parsedParams,
        dates: parsedParams.dates.map((date) => new Date(date)),
      };

      setFacilities(facilitiesWithDates);
      setSearchParams(paramsWithDates);
    } catch (error) {
      console.error('検索結果のパースエラー:', error);
      router.push('/');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  /**
   * 新しい検索ボタンのハンドラ
   */
  const handleNewSearch = () => {
    // セッションストレージをクリアしてホームページに戻る
    sessionStorage.removeItem('searchResults');
    sessionStorage.removeItem('searchParams');
    router.push('/');
  };

  /**
   * 空きのある施設をフィルタリング
   */
  const facilitiesWithAvailability = facilities.filter((facility) => {
    return facility.availability.some((avail) =>
      avail.slots.some((slot) => slot.available)
    );
  });

  /**
   * 空きのない施設をフィルタリング
   */
  const facilitiesWithoutAvailability = facilities.filter((facility) => {
    return !facility.availability.some((avail) =>
      avail.slots.some((slot) => slot.available)
    );
  });

  // ローディング中の表示
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* ヘッダー */}
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            検索結果
          </h1>

          {/* 検索条件の表示 */}
          {searchParams && (
            <div className="mt-4 rounded-lg bg-white p-4 shadow-sm">
              <h2 className="text-sm font-medium text-gray-700">検索条件</h2>
              <div className="mt-2 space-y-1 text-sm text-gray-600">
                <div>
                  <span className="font-medium">日付:</span>{' '}
                  {searchParams.dates.length === 1
                    ? formatDate(searchParams.dates[0])
                    : `${formatDate(searchParams.dates[0])} 〜 ${formatDate(
                        searchParams.dates[searchParams.dates.length - 1]
                      )} (${searchParams.dates.length}日間)`}
                </div>
              </div>
            </div>
          )}

          {/* 新しい検索ボタン */}
          <div className="mt-4">
            <button
              type="button"
              onClick={handleNewSearch}
              className="inline-flex min-h-[44px] items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 active:bg-gray-100"
            >
              <svg
                className="mr-2 h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              新しい検索
            </button>
          </div>
        </header>

        {/* 検索結果の表示 */}
        <main>
        {facilities.length === 0 ? (
          // 施設が見つからない場合
          <div className="rounded-lg bg-white p-8 text-center shadow-sm">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M12 12h.01M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              施設が見つかりませんでした
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              検索条件を変更して、再度お試しください。
            </p>
          </div>
        ) : facilitiesWithAvailability.length === 0 ? (
          // 空きのある施設がない場合
          <div className="space-y-6">
            <div className="rounded-lg bg-yellow-50 p-6 shadow-sm">
              <div className="flex">
                <svg
                  className="h-6 w-6 flex-shrink-0 text-yellow-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-yellow-800">
                    空きがありません
                  </h3>
                  <p className="mt-2 text-sm text-yellow-700">
                    指定された条件では、空きのある施設が見つかりませんでした。
                    <br />
                    日付や時間帯を変更して、再度検索してみてください。
                  </p>
                </div>
              </div>
            </div>

            {/* 空きのない施設も表示（参考情報として） */}
            {facilitiesWithoutAvailability.length > 0 && (
              <div>
                <h2 className="mb-4 text-lg font-medium text-gray-700">
                  検索対象施設（空きなし）
                </h2>
                <div className="space-y-4">
                  {facilitiesWithoutAvailability.map((facility) => (
                    <FacilityCard
                      key={facility.facility.id}
                      facilityAvailability={facility}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          // 空きのある施設がある場合
          <div className="space-y-6">
            {/* 空きのある施設 */}
            <div>
              <h2 className="mb-4 text-lg font-medium text-gray-900">
                空きのある施設（{facilitiesWithAvailability.length}件）
              </h2>
              <div className="space-y-4">
                {facilitiesWithAvailability.map((facility) => (
                  <FacilityCard
                    key={facility.facility.id}
                    facilityAvailability={facility}
                  />
                ))}
              </div>
            </div>

            {/* 空きのない施設（折りたたみ可能） */}
            {facilitiesWithoutAvailability.length > 0 && (
              <details className="group">
                <summary className="cursor-pointer rounded-lg bg-white p-4 shadow-sm hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-medium text-gray-700">
                      空きのない施設（{facilitiesWithoutAvailability.length}件）
                    </h2>
                    <svg
                      className="h-5 w-5 text-gray-400 transition-transform group-open:rotate-180"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </summary>
                <div className="mt-4 space-y-4">
                  {facilitiesWithoutAvailability.map((facility) => (
                    <FacilityCard
                      key={facility.facility.id}
                      facilityAvailability={facility}
                    />
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
        </main>

        {/* フッター */}
        <div className="mt-8 rounded-lg bg-blue-50 p-4 text-sm text-gray-700">
          <h3 className="mb-2 font-medium text-gray-900">ヒント</h3>
          <ul className="list-inside list-disc space-y-1">
            <li>施設名をタップすると、日付ごとの詳細が表示されます</li>
            <li>表の緑色（○）が予約可能なコートです</li>
            <li>表のグレー（×）は既に予約されているコートです</li>
            <li>表形式で時間帯とコートの空き状況を一覧できます</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
