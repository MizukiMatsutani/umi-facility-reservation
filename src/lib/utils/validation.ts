/**
 * バリデーションユーティリティ関数
 *
 * 検索パラメータと時間範囲のバリデーションを提供します。
 * エラーが発生した場合は、日本語のエラーメッセージをthrowします。
 */

import type { TimeRange } from '@/lib/types';

/**
 * 検索パラメータ（日付配列）をバリデーションします
 *
 * @param {Date[]} dates - バリデーション対象の日付配列
 * @throws {Error} 日付配列が空の場合
 *
 * @example
 * validateSearchParams([new Date('2025-12-06')]);
 * // エラーなし
 *
 * validateSearchParams([]);
 * // Error: 検索する日付を1つ以上選択してください
 */
export function validateSearchParams(dates: Date[]): void {
  // 日付配列が空の場合はエラー
  if (dates.length === 0) {
    throw new Error('検索する日付を1つ以上選択してください');
  }

  // 過去の日付が含まれている場合は警告（エラーではない）
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const hasPastDates = dates.some((date) => {
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
  });

  if (hasPastDates) {
    console.warn('警告: 過去の日付が含まれています');
  }
}

/**
 * 時間範囲をバリデーションします
 *
 * @param {TimeRange | undefined} timeRange - バリデーション対象の時間範囲（undefinedの場合は全時間帯）
 * @throws {Error} 終了時刻が開始時刻以前の場合、または時刻フォーマットが不正な場合
 *
 * @example
 * validateTimeRange({ from: '9:00', to: '12:00' });
 * // エラーなし
 *
 * validateTimeRange({ from: '12:00', to: '9:00' });
 * // Error: 終了時刻は開始時刻より後の時刻を指定してください
 *
 * validateTimeRange(undefined);
 * // エラーなし（全時間帯）
 */
export function validateTimeRange(timeRange: TimeRange | undefined): void {
  // undefinedの場合は全時間帯なのでバリデーション不要
  if (!timeRange) {
    return;
  }

  const { from, to } = timeRange;

  // 時刻フォーマットのバリデーション（HH:mmまたはH:mm形式）
  const timeFormatRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

  if (!timeFormatRegex.test(from)) {
    throw new Error('開始時刻のフォーマットが不正です');
  }

  if (!timeFormatRegex.test(to)) {
    throw new Error('終了時刻のフォーマットが不正です');
  }

  // 時刻を分単位に変換して比較
  const fromMinutes = parseTimeToMinutes(from);
  const toMinutes = parseTimeToMinutes(to);

  // 終了時刻が開始時刻以前の場合はエラー
  if (toMinutes <= fromMinutes) {
    throw new Error('終了時刻は開始時刻より後の時刻を指定してください');
  }
}

/**
 * 時刻文字列を分単位の数値に変換します
 *
 * @param {string} time - 時刻文字列（例: "9:30"）
 * @returns {number} 0時0分からの経過分数
 *
 * @example
 * parseTimeToMinutes('9:30');
 * // => 570 (9 * 60 + 30)
 */
function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}
