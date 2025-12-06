/**
 * 日付ユーティリティ関数のテスト
 *
 * TDDアプローチに従い、日付操作に関するユーティリティ関数のテストを定義します。
 * - generateDateRange: 指定日数分の日付配列生成
 * - formatDate: 日本語ロケールでの日付フォーマット
 */

import { describe, it, expect } from 'vitest';
import { generateDateRange, formatDate } from '../date';

describe('generateDateRange', () => {
  it('本日から7日分の日付配列を生成する', () => {
    const today = new Date();
    const result = generateDateRange(today, 7);

    expect(result).toHaveLength(7);
    expect(result[0]).toEqual(today);

    // 2日目が本日の翌日であることを確認
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const resultDay2 = new Date(result[1]);
    resultDay2.setHours(0, 0, 0, 0);

    expect(resultDay2.getTime()).toBe(tomorrow.getTime());
  });

  it('1日分の日付配列を生成する', () => {
    const startDate = new Date('2025-12-06');
    const result = generateDateRange(startDate, 1);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(startDate);
  });

  it('連続する日付が正しい順序で生成される', () => {
    const startDate = new Date('2025-12-01');
    const result = generateDateRange(startDate, 5);

    expect(result).toHaveLength(5);

    // 各日付が連続していることを確認
    for (let i = 1; i < result.length; i++) {
      const prev = new Date(result[i - 1]);
      const curr = new Date(result[i]);

      prev.setHours(0, 0, 0, 0);
      curr.setHours(0, 0, 0, 0);

      const diffInMs = curr.getTime() - prev.getTime();
      const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

      expect(diffInDays).toBe(1);
    }
  });

  it('月をまたぐ日付範囲を正しく生成する', () => {
    const startDate = new Date('2025-01-30');
    const result = generateDateRange(startDate, 5);

    expect(result).toHaveLength(5);
    expect(result[0].getDate()).toBe(30);
    expect(result[1].getDate()).toBe(31);
    expect(result[2].getDate()).toBe(1); // 2月1日
    expect(result[2].getMonth()).toBe(1); // 2月（0始まりなので1）
  });

  it('うるう年を正しく処理する', () => {
    const startDate = new Date('2024-02-28');
    const result = generateDateRange(startDate, 3);

    expect(result).toHaveLength(3);
    expect(result[0].getDate()).toBe(28);
    expect(result[1].getDate()).toBe(29); // うるう日
    expect(result[2].getDate()).toBe(1); // 3月1日
    expect(result[2].getMonth()).toBe(2); // 3月
  });

  it('0日を指定した場合は空配列を返す', () => {
    const startDate = new Date('2025-12-06');
    const result = generateDateRange(startDate, 0);

    expect(result).toHaveLength(0);
  });

  it('生成された日付は元の日付を変更しない（イミュータビリティ）', () => {
    const originalDate = new Date('2025-12-06');
    const originalTime = originalDate.getTime();

    generateDateRange(originalDate, 7);

    expect(originalDate.getTime()).toBe(originalTime);
  });
});

describe('formatDate', () => {
  it('日本語ロケールで日付をフォーマットする（2025年12月5日）', () => {
    const date = new Date('2025-12-05');
    const result = formatDate(date);

    expect(result).toBe('2025年12月5日');
  });

  it('月と日が1桁の場合も正しくフォーマットする', () => {
    const date = new Date('2025-01-01');
    const result = formatDate(date);

    expect(result).toBe('2025年1月1日');
  });

  it('異なる年月日を正しくフォーマットする', () => {
    const date = new Date('2024-07-15');
    const result = formatDate(date);

    expect(result).toBe('2024年7月15日');
  });

  it('月末の日付を正しくフォーマットする', () => {
    const date = new Date('2025-02-28');
    const result = formatDate(date);

    expect(result).toBe('2025年2月28日');
  });

  it('うるう年の2月29日を正しくフォーマットする', () => {
    const date = new Date('2024-02-29');
    const result = formatDate(date);

    expect(result).toBe('2024年2月29日');
  });

  it('元の日付オブジェクトを変更しない（イミュータビリティ）', () => {
    const originalDate = new Date('2025-12-05');
    const originalTime = originalDate.getTime();

    formatDate(originalDate);

    expect(originalDate.getTime()).toBe(originalTime);
  });
});
