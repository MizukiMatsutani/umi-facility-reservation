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

    // 複数日検索の場合はSSEストリーミングを使用
    const useStreaming = params.dates.length > 1;

    if (useStreaming) {
      try {
        // SSEストリーミングでプログレス情報を受信
        const url = new URL('/api/scrape', window.location.origin);
        url.searchParams.set('stream', 'true');

        // POSTリクエストのデータをクエリパラメータに変換
        url.searchParams.set('dates', request.dates.join(','));

        const eventSource = new EventSource(url.toString());
        eventSourceRef.current = eventSource;

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('[SSE] 受信データ:', data); // デバッグログ

            if (data.type === 'progress') {
              // プログレス更新
              console.log('[SSE] プログレス更新:', data.step, data.progress); // デバッグログ
              setProgressState({
                step: data.step,
                progress: data.progress,
                currentDate: data.currentDate ? new Date(data.currentDate) : undefined,
              });
            } else if (data.type === 'result') {
              // 最終結果を受信
              eventSource.close();
              eventSourceRef.current = null;

              // 成功トーストを表示
              toast.success('施設情報を取得しました！', 3000);

              // 結果データをセッションストレージに保存
              sessionStorage.setItem('searchResults', JSON.stringify(data.facilities));
              sessionStorage.setItem('searchParams', JSON.stringify(params));

              // 結果ページにナビゲート
              router.push('/results');
            } else if (data.type === 'error') {
              // エラー受信
              eventSource.close();
              eventSourceRef.current = null;

              setError({
                type: 'scraping',
                message: data.message,
              });
              toast.error(data.message);
              setIsLoading(false);
            }
          } catch (parseError) {
            console.error('SSEデータのパースエラー:', parseError);
          }
        };

        eventSource.onerror = () => {
          eventSource.close();
          eventSourceRef.current = null;

          const errorMessage = 'リアルタイム通信中にエラーが発生しました';
          setError({
            type: 'network',
            message: errorMessage,
          });
          toast.error(errorMessage);
          setIsLoading(false);
        };
      } catch (err) {
        console.error('SSE接続エラー:', err);
        const errorMessage = '施設情報の取得に失敗しました。しばらく経ってから再度お試しください';
        setError({
          type: 'network',
          message: errorMessage,
        });
        toast.error(errorMessage);
        setIsLoading(false);
      }
    } else {
      // 1日のみの検索の場合は従来通りのJSON API
      try {
        // /api/scrapeにPOSTリクエスト送信
        const response = await fetch('/api/scrape', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        });

        // レスポンス処理
        if (response.ok) {
          // 成功時: 結果ページにナビゲート
          const data: ScrapeResponse = await response.json();

          // 成功トーストを表示
          toast.success('施設情報を取得しました！', 3000);

          // 結果データをセッションストレージに保存
          sessionStorage.setItem('searchResults', JSON.stringify(data.facilities));
          sessionStorage.setItem('searchParams', JSON.stringify(params));

          // 結果ページにナビゲート
          router.push('/results');
        } else {
          // エラー時: エラーメッセージを表示
          const errorData: ErrorResponse = await response.json();
          setError({
            type: errorData.error,
            message: errorData.message,
          });
          toast.error(errorData.message);
        }
      } catch (err) {
        // ネットワークエラーなど予期しないエラーの処理
        console.error('検索エラー:', err);
        const errorMessage = '施設情報の取得に失敗しました。しばらく経ってから再度お試しください';
        setError({
          type: 'network',
          message: errorMessage,
        });
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
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
