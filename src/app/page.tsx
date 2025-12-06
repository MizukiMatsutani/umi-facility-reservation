'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SearchForm from '@/components/SearchForm';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorMessage from '@/components/ui/ErrorMessage';
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

  /**
   * 検索フォーム送信ハンドラ
   *
   * 検索パラメータを受け取り、/api/scrapeにPOSTリクエストを送信します。
   * 成功時は結果を含めて/resultsページにナビゲートし、
   * エラー時はエラーメッセージを表示します。
   */
  const handleSubmit = async (params: SearchParams) => {
    setIsLoading(true);
    setError(null);

    try {
      // SearchParamsからScrapeRequestに変換（Date[] → string[]）
      const request: ScrapeRequest = {
        dates: params.dates.map((date) => date.toISOString().split('T')[0]), // YYYY-MM-DD形式
        timeRange: params.timeRange,
      };

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
      }
    } catch (err) {
      // ネットワークエラーなど予期しないエラーの処理
      console.error('検索エラー:', err);
      setError({
        type: 'network',
        message: '施設情報の取得に失敗しました。しばらく経ってから再度お試しください',
      });
    } finally {
      setIsLoading(false);
    }
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
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        {/* ヘッダー */}
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            宇美町施設予約検索
          </h1>
          <p className="mt-3 text-base text-gray-600 sm:text-lg">
            バスケットボール・ミニバスケットボール利用可能施設の空き状況を検索できます
          </p>
        </header>

        {/* メインコンテンツ */}
        <main className="rounded-lg bg-white px-6 py-8 shadow-md sm:px-8">
          {isLoading ? (
            // ローディング状態
            <LoadingSpinner message="施設情報を取得しています..." />
          ) : error ? (
            // エラー状態
            <div className="space-y-4">
              <ErrorMessage
                errorType={error.type}
                message={error.message}
                onRetry={handleRetry}
              />
              {/* エラー後も検索フォームを表示 */}
              <div className="border-t border-gray-200 pt-6">
                <h2 className="mb-4 text-lg font-medium text-gray-900">
                  検索条件を変更して再度お試しください
                </h2>
                <SearchForm onSubmit={handleSubmit} isLoading={isLoading} />
              </div>
            </div>
          ) : (
            // 通常状態: 検索フォーム表示
            <SearchForm onSubmit={handleSubmit} isLoading={isLoading} />
          )}
        </main>

        {/* フッター（使い方ヒント） */}
        <div className="mt-6 rounded-lg bg-blue-50 p-4 text-sm text-gray-700">
          <h3 className="mb-2 font-medium text-gray-900">使い方</h3>
          <ul className="list-inside list-disc space-y-1">
            <li>「本日から1週間」ボタンで簡単に日付を選択できます</li>
            <li>カレンダーから個別の日付を選択することもできます</li>
            <li>時間帯を指定すると、その時間帯の空き状況のみ表示されます</li>
            <li>時間帯を指定しない場合は、全時間帯の空き状況が表示されます</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
