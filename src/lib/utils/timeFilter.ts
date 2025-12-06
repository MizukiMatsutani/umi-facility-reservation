/**
 * 時間範囲フィルタリングユーティリティ関数
 *
 * 時間帯（TimeSlot）を時間範囲でフィルタリングする機能を提供します。
 */

import type { TimeSlot, TimeRange } from '@/lib/types';

/**
 * TimeSlot配列を時間範囲でフィルタリングします
 *
 * @param {TimeSlot[]} slots - フィルタリング対象のTimeSlot配列
 * @param {TimeRange | undefined} timeRange - フィルタリング条件の時間範囲（undefinedの場合は全て返す）
 * @returns {TimeSlot[]} フィルタリングされたTimeSlot配列
 *
 * @example
 * const slots = [
 *   { time: '9:00', available: true },
 *   { time: '10:00', available: false },
 *   { time: '11:00', available: true },
 * ];
 * filterTimeSlots(slots, { from: '9:00', to: '11:00' });
 * // => [{ time: '9:00', available: true }, { time: '10:00', available: false }]
 *
 * filterTimeSlots(slots, undefined);
 * // => すべてのスロットを返す
 */
export function filterTimeSlots(
  slots: readonly TimeSlot[],
  timeRange: TimeRange | undefined
): TimeSlot[] {
  // 時間範囲が指定されていない場合は、すべてのスロットを返す
  if (!timeRange) {
    return [...slots]; // イミュータブルにするため配列をコピー
  }

  // 時間範囲内のスロットのみをフィルタリング
  return slots.filter((slot) => isTimeInRange(slot.time, timeRange));
}

/**
 * 指定された時刻が時間範囲内かどうかをチェックします
 *
 * @param {string} time - チェック対象の時刻（例: "9:30"）
 * @param {TimeRange | undefined} timeRange - 時間範囲（undefinedの場合は常にtrueを返す）
 * @returns {boolean} 時刻が範囲内の場合true、範囲外の場合false
 *
 * @example
 * isTimeInRange('10:00', { from: '9:00', to: '12:00' });
 * // => true
 *
 * isTimeInRange('8:30', { from: '9:00', to: '12:00' });
 * // => false
 *
 * isTimeInRange('10:00', undefined);
 * // => true（時間範囲指定なし）
 */
export function isTimeInRange(
  time: string,
  timeRange: TimeRange | undefined
): boolean {
  // 時間範囲が指定されていない場合は常にtrue
  if (!timeRange) {
    return true;
  }

  const { from, to } = timeRange;

  // 時刻を分単位に変換
  const timeMinutes = parseTimeToMinutes(time);
  const fromMinutes = parseTimeToMinutes(from);
  const toMinutes = parseTimeToMinutes(to);

  // 開始時刻以上、終了時刻未満（終了時刻は含まない）
  return timeMinutes >= fromMinutes && timeMinutes < toMinutes;
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
