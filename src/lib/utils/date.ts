/**
 * 日付ユーティリティ関数
 *
 * date-fnsを使用した日付操作のユーティリティ関数を提供します。
 * すべての関数はイミュータブル（元の日付オブジェクトを変更しない）です。
 */

import { addDays, format } from 'date-fns';
import { ja } from 'date-fns/locale';

/**
 * 指定された開始日から指定日数分の日付配列を生成します
 *
 * @param {Date} startDate - 開始日
 * @param {number} days - 生成する日数
 * @returns {Date[]} 日付の配列
 *
 * @example
 * const dates = generateDateRange(new Date('2025-12-06'), 7);
 * // => [2025-12-06, 2025-12-07, ..., 2025-12-12]
 */
export function generateDateRange(startDate: Date, days: number): Date[] {
  if (days <= 0) {
    return [];
  }

  const dates: Date[] = [];

  for (let i = 0; i < days; i++) {
    // addDaysは新しいDateオブジェクトを返すため、イミュータブル
    dates.push(addDays(startDate, i));
  }

  return dates;
}

/**
 * 日付を日本語ロケールでフォーマットします
 *
 * @param {Date} date - フォーマットする日付
 * @returns {string} フォーマットされた日付文字列（例: "2025年12月5日"）
 *
 * @example
 * formatDate(new Date('2025-12-05'));
 * // => "2025年12月5日"
 */
export function formatDate(date: Date): string {
  // format関数は元のdateオブジェクトを変更しない（イミュータブル）
  return format(date, 'yyyy年M月d日', { locale: ja });
}
