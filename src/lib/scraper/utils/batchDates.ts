/**
 * 日付配列をバッチに分割するユーティリティ関数
 *
 * 並列処理用に日付配列を指定されたバッチサイズで分割します。
 * 各バッチは並列実行される単位となります。
 */

/**
 * 日付配列をバッチに分割
 *
 * @param dates - 分割する日付配列
 * @param batchSize - 各バッチに含める日付の数
 * @returns バッチに分割された日付の二次元配列
 *
 * @example
 * ```typescript
 * const dates = [date1, date2, date3, date4, date5, date6, date7];
 * const batches = batchDates(dates, 2);
 * // => [[date1, date2], [date3, date4], [date5, date6], [date7]]
 * ```
 */
export function batchDates(dates: Date[], batchSize: number): Date[][] {
  // 入力検証
  if (!Array.isArray(dates)) {
    throw new TypeError('dates must be an array');
  }

  if (dates.length === 0) {
    return [];
  }

  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new RangeError('batchSize must be a positive integer');
  }

  // バッチサイズが日付数より大きい場合は、全体を1つのバッチにまとめる
  if (batchSize >= dates.length) {
    return [dates];
  }

  const batches: Date[][] = [];

  for (let i = 0; i < dates.length; i += batchSize) {
    // スライスで各バッチを作成
    const batch = dates.slice(i, i + batchSize);
    batches.push(batch);
  }

  return batches;
}

/**
 * バッチの統計情報を取得
 *
 * @param batches - バッチの二次元配列
 * @returns バッチの統計情報
 */
export function getBatchStats(batches: Date[][]): {
  totalBatches: number;
  totalDates: number;
  averageBatchSize: number;
  minBatchSize: number;
  maxBatchSize: number;
} {
  if (batches.length === 0) {
    return {
      totalBatches: 0,
      totalDates: 0,
      averageBatchSize: 0,
      minBatchSize: 0,
      maxBatchSize: 0,
    };
  }

  const batchSizes = batches.map((batch) => batch.length);
  const totalDates = batchSizes.reduce((sum, size) => sum + size, 0);

  return {
    totalBatches: batches.length,
    totalDates,
    averageBatchSize: totalDates / batches.length,
    minBatchSize: Math.min(...batchSizes),
    maxBatchSize: Math.max(...batchSizes),
  };
}
