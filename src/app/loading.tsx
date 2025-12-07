import LoadingSpinner from '@/components/ui/LoadingSpinner';

/**
 * Next.js App Routerのローディング状態
 * ページ遷移時やデータ取得時に表示されます
 */
export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="flex flex-col items-center gap-6 px-4">
        {/* ロゴ画像 */}
        <div className="relative h-32 w-32 animate-bounce">
          <img
            src="/images/MITCHELL.png"
            alt="MITCHELL"
            className="h-full w-full object-contain drop-shadow-2xl"
          />
        </div>

        {/* アプリ名 */}
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent animate-fade-in">
          宇美町施設予約検索
        </h1>

        {/* ローディングスピナー */}
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="text-sm text-gray-600 animate-pulse">起動中...</p>
        </div>
      </div>
    </div>
  );
}
