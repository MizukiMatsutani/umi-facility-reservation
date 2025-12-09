/**
 * FacilityCardSkeleton - 施設カードのスケルトン表示
 *
 * データ取得中に表示されるプレースホルダーUI。
 * 実際のFacilityCardと同じレイアウトで、アニメーション付きのグレー枠を表示します。
 */
export default function FacilityCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm animate-pulse">
      {/* 施設情報ヘッダー（スケルトン） */}
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
        <div className="h-6 w-48 bg-gray-300 rounded"></div>
      </div>

      {/* 日付ごとの空き状況セクション（スケルトン） */}
      <div className="divide-y divide-gray-200">
        {/* 3つの日付エントリをスケルトン表示 */}
        {[1, 2, 3].map((index) => (
          <div key={index} className="px-4 py-3">
            <div className="flex w-full min-h-[44px] items-center justify-between gap-2 px-2 py-2">
              <div className="flex-1 space-y-2">
                {/* 日付ラベル */}
                <div className="h-5 w-32 bg-gray-300 rounded"></div>
                {/* 空き時間サマリ */}
                <div className="space-y-1.5">
                  <div className="h-4 w-40 bg-gray-200 rounded"></div>
                  <div className="h-4 w-36 bg-gray-200 rounded ml-4"></div>
                </div>
              </div>
              {/* 矢印アイコン */}
              <div className="flex-shrink-0">
                <div className="h-5 w-5 bg-gray-300 rounded"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
