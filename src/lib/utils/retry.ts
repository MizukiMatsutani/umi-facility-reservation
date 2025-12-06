/**
 * 再試行ユーティリティ
 *
 * ネットワークエラーなどの一時的な失敗に対する自動再試行機能を提供します。
 */

/**
 * 指定されたミリ秒間待機する
 *
 * @param ms - 待機時間（ミリ秒）
 * @returns Promise（待機完了後に解決される）
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 非同期関数を自動再試行付きで実行する
 *
 * 関数が失敗した場合、指定された回数まで自動的に再試行します。
 * 各再試行の間には2秒の遅延が入ります。
 *
 * @template T - 関数の戻り値の型
 * @param fn - 実行する非同期関数
 * @param retryCount - 再試行回数（デフォルト: 1）。0の場合は再試行なし
 * @returns 関数の実行結果
 * @throws 全ての試行が失敗した場合、最後のエラーを投げる
 *
 * @example
 * ```typescript
 * const result = await fetchWithRetry(
 *   async () => {
 *     const response = await fetch('https://example.com/api');
 *     return response.json();
 *   },
 *   2 // 最大3回試行（初回 + 2回の再試行）
 * );
 * ```
 */
export async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  retryCount: number = 1
): Promise<T> {
  const RETRY_DELAY_MS = 2000;
  let lastError: Error | unknown;

  // 初回 + retryCount 回の試行
  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      const result = await fn();
      return result;
    } catch (error) {
      lastError = error;

      // 最後の試行の場合はエラーを投げる
      if (attempt === retryCount) {
        break;
      }

      // 次の試行までの遅延
      await sleep(RETRY_DELAY_MS);
    }
  }

  // すべての試行が失敗した場合、最後のエラーを投げる
  throw lastError;
}
