import LoadingSpinner from '@/components/ui/LoadingSpinner';

/**
 * Next.js App Routerのローディング状態
 * ページ遷移時やデータ取得時に表示されます
 */
export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoadingSpinner message="読み込み中..." />
    </div>
  );
}
