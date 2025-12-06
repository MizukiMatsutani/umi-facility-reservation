/**
 * 時間範囲フィルタリングユーティリティ関数のテスト
 *
 * TDDアプローチに従い、時間帯のフィルタリング関数のテストを定義します。
 * - filterTimeSlots: TimeSlot配列を時間範囲でフィルタリング
 * - isTimeInRange: 時刻が範囲内かチェック
 */

import { describe, it, expect } from 'vitest';
import { filterTimeSlots, isTimeInRange } from '../timeFilter';
import type { TimeSlot, TimeRange } from '@/lib/types';

describe('filterTimeSlots', () => {
  const sampleSlots: TimeSlot[] = [
    { time: '8:30', available: true },
    { time: '9:00', available: false },
    { time: '9:30', available: true },
    { time: '10:00', available: true },
    { time: '10:30', available: false },
    { time: '11:00', available: true },
    { time: '11:30', available: true },
    { time: '12:00', available: false },
  ];

  it('時間範囲が指定されていない場合、すべてのスロットを返す', () => {
    const result = filterTimeSlots(sampleSlots, undefined);

    expect(result).toEqual(sampleSlots);
    expect(result).toHaveLength(8);
  });

  it('時間範囲内のスロットのみを返す', () => {
    const timeRange: TimeRange = { from: '9:00', to: '11:00' };
    const result = filterTimeSlots(sampleSlots, timeRange);

    expect(result).toHaveLength(4);
    expect(result[0].time).toBe('9:00');
    expect(result[1].time).toBe('9:30');
    expect(result[2].time).toBe('10:00');
    expect(result[3].time).toBe('10:30');
  });

  it('開始時刻と終了時刻を含む範囲でフィルタリングする', () => {
    const timeRange: TimeRange = { from: '9:00', to: '10:00' };
    const result = filterTimeSlots(sampleSlots, timeRange);

    expect(result).toHaveLength(2);
    expect(result[0].time).toBe('9:00');
    expect(result[1].time).toBe('9:30');
  });

  it('範囲外のスロットはフィルタリングされる', () => {
    const timeRange: TimeRange = { from: '12:30', to: '13:30' };
    const result = filterTimeSlots(sampleSlots, timeRange);

    expect(result).toHaveLength(0);
  });

  it('30分刻みの時間範囲で正しくフィルタリングする', () => {
    const timeRange: TimeRange = { from: '8:30', to: '9:30' };
    const result = filterTimeSlots(sampleSlots, timeRange);

    expect(result).toHaveLength(2);
    expect(result[0].time).toBe('8:30');
    expect(result[1].time).toBe('9:00');
  });

  it('単一のスロットのみマッチする場合', () => {
    const timeRange: TimeRange = { from: '10:00', to: '10:30' };
    const result = filterTimeSlots(sampleSlots, timeRange);

    expect(result).toHaveLength(1);
    expect(result[0].time).toBe('10:00');
  });

  it('空のスロット配列の場合、空配列を返す', () => {
    const timeRange: TimeRange = { from: '9:00', to: '12:00' };
    const result = filterTimeSlots([], timeRange);

    expect(result).toHaveLength(0);
  });

  it('フィルタリングしても元の配列は変更されない（イミュータビリティ）', () => {
    const timeRange: TimeRange = { from: '9:00', to: '11:00' };
    const originalLength = sampleSlots.length;

    filterTimeSlots(sampleSlots, timeRange);

    expect(sampleSlots).toHaveLength(originalLength);
  });
});

describe('isTimeInRange', () => {
  it('時刻が範囲内の場合、trueを返す', () => {
    const result = isTimeInRange('10:00', { from: '9:00', to: '12:00' });

    expect(result).toBe(true);
  });

  it('開始時刻と同じ時刻の場合、trueを返す（境界含む）', () => {
    const result = isTimeInRange('9:00', { from: '9:00', to: '12:00' });

    expect(result).toBe(true);
  });

  it('終了時刻と同じ時刻の場合、falseを返す（終了時刻は含まない）', () => {
    const result = isTimeInRange('12:00', { from: '9:00', to: '12:00' });

    expect(result).toBe(false);
  });

  it('開始時刻より前の時刻の場合、falseを返す', () => {
    const result = isTimeInRange('8:30', { from: '9:00', to: '12:00' });

    expect(result).toBe(false);
  });

  it('終了時刻より後の時刻の場合、falseを返す', () => {
    const result = isTimeInRange('13:00', { from: '9:00', to: '12:00' });

    expect(result).toBe(false);
  });

  it('30分刻みの時刻で正しく判定する', () => {
    const result1 = isTimeInRange('9:30', { from: '9:00', to: '10:00' });
    const result2 = isTimeInRange('10:30', { from: '9:00', to: '10:00' });

    expect(result1).toBe(true);
    expect(result2).toBe(false);
  });

  it('午前から午後にまたがる範囲で正しく判定する', () => {
    const result1 = isTimeInRange('11:30', { from: '10:00', to: '14:00' });
    const result2 = isTimeInRange('14:30', { from: '10:00', to: '14:00' });

    expect(result1).toBe(true);
    expect(result2).toBe(false);
  });

  it('時間範囲が指定されていない場合、常にtrueを返す', () => {
    const result = isTimeInRange('10:00', undefined);

    expect(result).toBe(true);
  });
});
