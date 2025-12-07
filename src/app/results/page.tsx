'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import FacilityCard from '@/components/FacilityCard';
import type { FacilityAvailability, SearchParams } from '@/lib/types';
import { formatDate } from '@/lib/utils/date';
import { ArrowLeft, Calendar, Building2, AlertTriangle, CheckCircle2, ChevronDown } from 'lucide-react';

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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-lg font-medium text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* ヘッダー */}
        <header className="mb-8 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent sm:text-4xl">
              検索結果
            </h1>
            {/* 新しい検索ボタン */}
            <button
              type="button"
              onClick={handleNewSearch}
              className="
                group inline-flex items-center gap-2 rounded-lg
                bg-white border-2 border-gray-300
                px-5 py-2.5 text-sm font-semibold text-gray-700
                shadow-sm
                transition-all duration-300 ease-out
                hover:border-gray-400 hover:shadow-md
                hover:scale-[1.02]
                active:scale-[0.98]
              "
            >
              <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
              新しい検索
            </button>
          </div>

          {/* 検索条件の表示 */}
          {searchParams && (
            <div className="rounded-xl bg-white/80 backdrop-blur-sm p-5 shadow-lg border border-blue-100 animate-slide-up">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-5 w-5 text-blue-600" />
                <h2 className="text-sm font-semibold text-gray-900">検索条件</h2>
              </div>
              <div className="space-y-1 text-sm text-gray-700">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">日付:</span>
                  <span className="px-3 py-1 bg-blue-50 rounded-md text-blue-700 font-medium">
                    {searchParams.dates.length === 1
                      ? formatDate(searchParams.dates[0])
                      : `${formatDate(searchParams.dates[0])} 〜 ${formatDate(
                          searchParams.dates[searchParams.dates.length - 1]
                        )} (${searchParams.dates.length}日間)`}
                  </span>
                </div>
              </div>
            </div>
          )}
        </header>

        {/* 検索結果の表示 */}
        <main className="animate-slide-up-delayed">
        {facilities.length === 0 ? (
          // 施設が見つからない場合
          <div className="rounded-xl bg-white/80 backdrop-blur-sm p-10 text-center shadow-xl border border-gray-100">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <Building2 className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="mt-6 text-xl font-semibold text-gray-900">
              施設が見つかりませんでした
            </h3>
            <p className="mt-3 text-sm text-gray-600">
              検索条件を変更して、再度お試しください。
            </p>
          </div>
        ) : facilitiesWithAvailability.length === 0 ? (
          // 空きのある施設がない場合
          <div className="space-y-6">
            <div className="rounded-xl bg-gradient-to-r from-yellow-50 to-orange-50 p-6 shadow-lg border border-yellow-200">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 rounded-full bg-yellow-100 p-3">
                  <AlertTriangle className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-yellow-900">
                    空きがありません
                  </h3>
                  <p className="mt-2 text-sm text-yellow-800 leading-relaxed">
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
                <div className="mb-4 flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-gray-600" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    検索対象施設（空きなし）
                  </h2>
                </div>
                <div className="space-y-4">
                  {facilitiesWithoutAvailability.map((facility, index) => (
                    <div
                      key={facility.facility.id}
                      className="animate-fade-in"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <FacilityCard facilityAvailability={facility} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          // 空きのある施設がある場合
          <div className="space-y-8">
            {/* 空きのある施設 */}
            <div>
              <div className="mb-5 flex items-center gap-3">
                <div className="flex items-center justify-center rounded-full bg-green-100 p-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  空きのある施設
                  <span className="ml-3 inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                    {facilitiesWithAvailability.length}件
                  </span>
                </h2>
              </div>
              <div className="space-y-4">
                {facilitiesWithAvailability.map((facility, index) => (
                  <div
                    key={facility.facility.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <FacilityCard facilityAvailability={facility} />
                  </div>
                ))}
              </div>
            </div>

            {/* 空きのない施設（折りたたみ可能） */}
            {facilitiesWithoutAvailability.length > 0 && (
              <details className="group">
                <summary className="cursor-pointer rounded-xl bg-white/80 backdrop-blur-sm p-5 shadow-lg border border-gray-200 transition-all duration-300 hover:shadow-xl hover:border-gray-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-gray-600" />
                      <h2 className="text-lg font-semibold text-gray-700">
                        空きのない施設
                        <span className="ml-3 inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
                          {facilitiesWithoutAvailability.length}件
                        </span>
                      </h2>
                    </div>
                    <ChevronDown className="h-5 w-5 text-gray-400 transition-transform duration-300 group-open:rotate-180" />
                  </div>
                </summary>
                <div className="mt-4 space-y-4">
                  {facilitiesWithoutAvailability.map((facility, index) => (
                    <div
                      key={facility.facility.id}
                      className="animate-fade-in"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <FacilityCard facilityAvailability={facility} />
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
        </main>

        {/* フッター */}
        <div className="mt-8 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 p-6 text-sm text-gray-700 shadow-md border border-blue-100 animate-fade-in">
          <h3 className="mb-3 font-semibold text-gray-900 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white text-xs">
              i
            </span>
            ヒント
          </h3>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>施設名をタップすると、日付ごとの詳細が表示されます</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>表の緑色（○）が予約可能なコートです</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>表のグレー（×）は既に予約されているコートです</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>表形式で時間帯とコートの空き状況を一覧できます</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
