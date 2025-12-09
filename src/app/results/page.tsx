'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import FacilityCard from '@/components/FacilityCard';
import FacilityCardSkeleton from '@/components/FacilityCardSkeleton';
import { ToastContainer } from '@/components/ui/Toast';
import { useToast } from '@/hooks/useToast';
import type { FacilityAvailability, SearchParams } from '@/lib/types';
import { formatDate } from '@/lib/utils/date';
import { ArrowLeft, Calendar, Building2, AlertTriangle, CheckCircle2, ChevronDown, Loader2 } from 'lucide-react';

/**
 * 検索結果ページ（段階的レンダリング対応）
 *
 * SSEストリーミングで段階的にデータを受信し、リアルタイムで表示します。
 */
export default function ResultsPage() {
  const router = useRouter();
  const toast = useToast();
  const [facilities, setFacilities] = useState<FacilityAvailability[]>([]);
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [progressState, setProgressState] = useState<{ step: string; progress: number; receivedDates: number; totalDates: number }>({
    step: '初期化中...',
    progress: 0,
    receivedDates: 0,
    totalDates: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // セッションストレージから検索パラメータを取得
    const paramsJson = sessionStorage.getItem('searchParams');
    const datesParam = sessionStorage.getItem('searchDates');

    if (!paramsJson || !datesParam) {
      // データがない場合はホームページにリダイレクト
      router.push('/');
      return;
    }

    try {
      const parsedParams: SearchParams = JSON.parse(paramsJson);
      const paramsWithDates = {
        ...parsedParams,
        dates: parsedParams.dates.map((date) => new Date(date)),
      };
      setSearchParams(paramsWithDates);
      setProgressState((prev) => ({ ...prev, totalDates: paramsWithDates.dates.length }));

      // SSE接続を確立
      const url = new URL('/api/scrape', window.location.origin);
      url.searchParams.set('stream', 'true');
      url.searchParams.set('dates', datesParam);

      console.log('[SSE] EventSource接続開始:', url.toString());
      const eventSource = new EventSource(url.toString());
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('[SSE] 接続確立');
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[SSE] 受信データ:', data);

          if (data.type === 'progress') {
            // プログレス更新
            setProgressState((prev) => ({
              ...prev,
              step: data.step,
              progress: data.progress,
            }));
          } else if (data.type === 'partial-result') {
            // 部分結果を受信（段階的レンダリング）
            console.log('[SSE] 部分結果受信:', data.date, data.facilities.length);

            // データをDate型に変換してマージ
            const newFacilities: FacilityAvailability[] = data.facilities.map((facility: any) => ({
              ...facility,
              availability: facility.availability.map((avail: any) => ({
                ...avail,
                date: new Date(avail.date),
              })),
            }));

            setFacilities((prev) => {
              // 既存データとマージ（同じ施設IDのデータを統合）
              const merged = [...prev];
              newFacilities.forEach((newFacility) => {
                const existingIndex = merged.findIndex((f) => f.facility.id === newFacility.facility.id);
                if (existingIndex >= 0) {
                  // 既存施設のavailabilityをマージ
                  merged[existingIndex] = {
                    ...merged[existingIndex],
                    availability: [...merged[existingIndex].availability, ...newFacility.availability],
                  };
                } else {
                  // 新規施設を追加
                  merged.push(newFacility);
                }
              });
              return merged;
            });

            // 受信済み日付数を更新
            setProgressState((prev) => ({
              ...prev,
              receivedDates: prev.receivedDates + 1,
            }));
          } else if (data.type === 'result') {
            // 最終結果を受信
            console.log('[SSE] 最終結果受信');
            eventSource.close();
            eventSourceRef.current = null;
            setIsLoading(false);

            // 完了トーストを表示
            toast.success('すべての施設の取得が完了しました');
          } else if (data.type === 'error') {
            // エラー受信
            console.error('[SSE] エラー受信:', data.message);
            eventSource.close();
            eventSourceRef.current = null;
            setError(data.message);
            setIsLoading(false);
          }
        } catch (parseError) {
          console.error('SSEデータのパースエラー:', parseError);
        }
      };

      eventSource.onerror = () => {
        console.error('[SSE] 接続エラー');
        eventSource.close();
        eventSourceRef.current = null;
        setError('リアルタイム通信中にエラーが発生しました');
        setIsLoading(false);
      };
    } catch (error) {
      console.error('検索結果のパースエラー:', error);
      router.push('/');
    }

    // クリーンアップ
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [router]);

  /**
   * 新しい検索ボタンのハンドラ
   */
  const handleNewSearch = () => {
    // SSE接続をクローズ
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    // セッションストレージをクリアしてホームページに戻る
    sessionStorage.removeItem('searchResults');
    sessionStorage.removeItem('searchParams');
    sessionStorage.removeItem('searchDates');
    sessionStorage.removeItem('searchStartTime');
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

  // エラー表示
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-xl bg-red-50 p-6 shadow-lg border border-red-200">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 rounded-full bg-red-100 p-3">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-900">エラーが発生しました</h3>
                <p className="mt-2 text-sm text-red-800">{error}</p>
                <button
                  onClick={handleNewSearch}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  <ArrowLeft className="h-4 w-4" />
                  新しい検索
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ローディング中またはデータ受信中、または完了後の表示（UIを統一）
  return (
    <>
      {/* トースト通知コンテナ */}
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
        {/* ヘッダー */}
        <header className="mb-8 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent sm:text-4xl">
              検索結果
            </h1>
            <button
              type="button"
              onClick={handleNewSearch}
              className="group inline-flex items-center gap-2 rounded-lg bg-white border-2 border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-all duration-300 hover:border-gray-400"
            >
              <ArrowLeft className="h-4 w-4" />
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

        {/* プログレス表示（画面上部に固定、ローディング中のみ表示） */}
        {isLoading && (
          <div className="sticky top-0 z-10 mb-8">
            <div className="rounded-xl bg-white/95 backdrop-blur-md p-6 shadow-xl border border-blue-100">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                <div className="w-full max-w-md space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">{progressState.step}</span>
                      <span className="text-sm font-medium text-blue-600">{Math.round(progressState.progress)}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500 ease-out"
                        style={{ width: `${progressState.progress}%` }}
                      />
                    </div>
                  </div>
                  {progressState.totalDates > 0 && (
                    <div className="text-center">
                      <span className="text-sm text-gray-600">
                        取得済み: <span className="font-semibold text-blue-600">{progressState.receivedDates}</span> / {progressState.totalDates} 日
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 施設カード表示エリア */}
        <div className="space-y-4">
          {/* ローディング中でデータがまだ0件の場合はスケルトンを表示 */}
          {isLoading && facilities.length === 0 && (
            <>
              <div className="flex items-center gap-3 mb-5">
                <div className="flex items-center justify-center rounded-full bg-gray-100 p-2">
                  <Building2 className="h-5 w-5 text-gray-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  施設を取得中...
                </h2>
              </div>
              {/* スケルトンカードを5枚表示 */}
              {[1, 2, 3, 4, 5].map((index) => (
                <div key={`skeleton-${index}`}>
                  <FacilityCardSkeleton />
                </div>
              ))}
            </>
          )}

          {/* データが1件以上ある場合は実際のカードを表示 */}
          {facilities.length > 0 && (
            <>
              <div className="flex items-center gap-3 mb-5">
                <div className="flex items-center justify-center rounded-full bg-green-100 p-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {isLoading ? '取得済み施設' : '検索結果'}
                  <span className="ml-3 inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                    {facilities.length}件
                  </span>
                </h2>
              </div>
              {facilities.map((facility, index) => (
                <div
                  key={facility.facility.id}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <FacilityCard facilityAvailability={facility} />
                </div>
              ))}
            </>
          )}
        </div>

        {/* フッター：下部に固定された「新しい検索」ボタン */}
        {!isLoading && facilities.length > 0 && (
          <div className="mt-8 pb-4">
            <button
              type="button"
              onClick={handleNewSearch}
              className="w-full group inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105"
            >
              <ArrowLeft className="h-5 w-5" />
              新しい検索
            </button>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
