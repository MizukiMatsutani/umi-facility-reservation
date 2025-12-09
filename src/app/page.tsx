'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import SearchForm, { ProgressState } from '@/components/SearchForm';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorMessage from '@/components/ui/ErrorMessage';
import { ToastContainer } from '@/components/ui/Toast';
import { useToast } from '@/hooks/useToast';
import { SearchParams } from '@/lib/types';
import { ScrapeRequest, ScrapeResponse, ErrorResponse, ErrorType } from '@/lib/types/api';

/**
 * トップページ（検索フォーム）
 *
 * ユーザーのエントリーポイントとなる検索フォームを表示します。
 * フォーム送信時に/api/scrapeを呼び出し、結果ページにナビゲートします。
 */
export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ type: ErrorType; message: string } | null>(null);
  const [lastSearchParams, setLastSearchParams] = useState<SearchParams | null>(null);
  const [progressState, setProgressState] = useState<ProgressState | null>(null);
  const toast = useToast();
  const eventSourceRef = useRef<EventSource | null>(null);

  // ブラウザのウォームアップ（バックグラウンドで事前起動）
  useEffect(() => {
    // バックグラウンドでブラウザを起動（エラーは無視）
    fetch('/api/warmup', { method: 'POST' }).catch((error) => {
      console.log('ブラウザウォームアップをリクエストしました（完了を待たずに処理を続行）');
    });
  }, []);

  // コンポーネントのクリーンアップ時にEventSourceを閉じる
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  /**
   * 検索フォーム送信ハンドラ
   *
   * 検索パラメータを受け取り、/api/scrapeにPOSTリクエストを送信します。
   * 複数日検索の場合はSSEストリーミングを使用してプログレスを表示します。
   * 成功時は結果を含めて/resultsページにナビゲートし、
   * エラー時はエラーメッセージを表示します。
   */
  const handleSubmit = async (params: SearchParams) => {
    setIsLoading(true);
    setError(null);
    setProgressState(null);
    setLastSearchParams(params); // 検索パラメータを保存

    // SearchParamsからScrapeRequestに変換（Date[] → string[]）
    const request: ScrapeRequest = {
      dates: params.dates.map((date) => format(date, 'yyyy-MM-dd')), // YYYY-MM-DD形式（ローカル時刻）
    };

    // すべての検索でSSEストリーミングを使用し、/resultsページへ遷移
    try {
      // 検索パラメータをsessionStorageに保存
      sessionStorage.setItem('searchParams', JSON.stringify(params));
      sessionStorage.setItem('searchDates', request.dates.join(','));
      sessionStorage.setItem('searchStartTime', new Date().toISOString());

      // 結果ページにすぐに遷移
      router.push('/results');
    } catch (err) {
      console.error('検索開始エラー:', err);
      const errorMessage = '検索の開始に失敗しました';
      setError({
        type: 'network',
        message: errorMessage,
      });
      toast.error(errorMessage);
      setIsLoading(false);
    }
  };


  /**
   * バリデーションエラーハンドラ
   */
  const handleValidationError = (errorMessage: string) => {
    toast.error(errorMessage);
  };

  /**
   * 再試行ハンドラ
   *
   * エラー状態をクリアして、ユーザーが再度検索フォームを送信できるようにします。
   */
  const handleRetry = () => {
    setError(null);
  };

  return (
    <>
      {/* トースト通知コンテナ */}
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          {/* ヘッダー */}
          <header className="mb-8 text-center animate-fade-in">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent sm:text-4xl">
              宇美町施設予約検索
            </h1>
            <p className="mt-3 text-base text-gray-600 sm:text-lg">
              バスケットボール・ミニバスケットボール利用可能施設の空き状況を検索できます
            </p>
          </header>

          {/* メインコンテンツ */}
          <main className="rounded-2xl bg-white/80 backdrop-blur-sm px-6 py-8 shadow-xl border border-gray-100 sm:px-8 animate-slide-up">
            {error ? (
              // エラー状態
              <div className="space-y-4">
                <ErrorMessage
                  errorType={error.type}
                  message={error.message}
                  onRetry={handleRetry}
                />
                {/* エラー後も検索フォームを表示（入力状態を保持） */}
                <div className="border-t border-gray-200 pt-6">
                  <h2 className="mb-4 text-lg font-medium text-gray-900">
                    検索条件を変更して再度お試しください
                  </h2>
                  <SearchForm
                    onSubmit={handleSubmit}
                    onValidationError={handleValidationError}
                    isLoading={isLoading}
                    initialDates={lastSearchParams?.dates ? [...lastSearchParams.dates] : undefined}
                    progressState={progressState}
                  />
                </div>
              </div>
            ) : (
              // 通常状態: 検索フォーム表示
              <SearchForm
                onSubmit={handleSubmit}
                onValidationError={handleValidationError}
                isLoading={isLoading}
                progressState={progressState}
              />
            )}
          </main>

          {/* フッター（使い方ヒント） */}
          <div className="mt-6 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 p-6 text-sm text-gray-700 shadow-md border border-blue-100 animate-fade-in">
            <h3 className="mb-3 font-semibold text-gray-900 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white text-xs">
                i
              </span>
              使い方
            </h3>
            <ul className="list-inside space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>「本日から1週間」ボタンで簡単に日付を選択できます</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>カレンダーから個別の日付を選択することもできます</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>検索結果では各施設の全時間帯の空き状況が表形式で表示されます</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
