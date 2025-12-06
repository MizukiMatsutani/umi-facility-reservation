/**
 * バリデーションユーティリティ関数のテスト
 *
 * TDDアプローチに従い、検索パラメータと時間範囲のバリデーション関数のテストを定義します。
 * - validateSearchParams: 検索パラメータのバリデーション
 * - validateTimeRange: 時間範囲のバリデーション
 */

import { describe, it, expect } from 'vitest';
import { validateSearchParams, validateTimeRange } from '../validation';

describe('validateSearchParams', () => {
  it('正常な検索パラメータの場合、エラーを投げない', () => {
    const dates = [new Date('2025-12-06'), new Date('2025-12-07')];

    expect(() => validateSearchParams(dates)).not.toThrow();
  });

  it('空の日付配列の場合、エラーを投げる', () => {
    const dates: Date[] = [];

    expect(() => validateSearchParams(dates)).toThrow(
      '検索する日付を1つ以上選択してください'
    );
  });

  it('過去の日付が含まれる場合、警告を投げる（エラーではなく警告）', () => {
    // 注: 実装では警告はconsole.warnで出力し、エラーは投げないことにします
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // 過去の日付でもエラーは投げない（警告のみ）
    expect(() => validateSearchParams([yesterday, today])).not.toThrow();
  });

  it('1つの日付のみの場合も正常', () => {
    const dates = [new Date('2025-12-06')];

    expect(() => validateSearchParams(dates)).not.toThrow();
  });

  it('複数の日付の場合も正常', () => {
    const dates = [
      new Date('2025-12-06'),
      new Date('2025-12-07'),
      new Date('2025-12-08'),
    ];

    expect(() => validateSearchParams(dates)).not.toThrow();
  });
});

describe('validateTimeRange', () => {
  it('正常な時間範囲（FromがToより前）の場合、エラーを投げない', () => {
    const timeRange = { from: '9:00', to: '12:00' };

    expect(() => validateTimeRange(timeRange)).not.toThrow();
  });

  it('FromとToが同じ時刻の場合、エラーを投げる', () => {
    const timeRange = { from: '9:00', to: '9:00' };

    expect(() => validateTimeRange(timeRange)).toThrow(
      '終了時刻は開始時刻より後の時刻を指定してください'
    );
  });

  it('FromがToより後の場合、エラーを投げる', () => {
    const timeRange = { from: '12:00', to: '9:00' };

    expect(() => validateTimeRange(timeRange)).toThrow(
      '終了時刻は開始時刻より後の時刻を指定してください'
    );
  });

  it('午前から午後にまたがる時間範囲は正常', () => {
    const timeRange = { from: '10:30', to: '14:00' };

    expect(() => validateTimeRange(timeRange)).not.toThrow();
  });

  it('30分刻みの時間範囲は正常', () => {
    const timeRange = { from: '8:30', to: '9:00' };

    expect(() => validateTimeRange(timeRange)).not.toThrow();
  });

  it('時刻が21:30までの範囲で正常', () => {
    const timeRange = { from: '20:00', to: '21:30' };

    expect(() => validateTimeRange(timeRange)).not.toThrow();
  });

  it('無効な時刻フォーマットの場合、エラーを投げる', () => {
    const timeRange = { from: '25:00', to: '26:00' };

    expect(() => validateTimeRange(timeRange)).toThrow();
  });

  it('時刻フォーマットが不正（文字列形式が違う）の場合、エラーを投げる', () => {
    const timeRange = { from: '9時', to: '12時' };

    expect(() => validateTimeRange(timeRange)).toThrow();
  });

  it('undefinedの時間範囲（全時間帯）の場合、エラーを投げない', () => {
    expect(() => validateTimeRange(undefined)).not.toThrow();
  });
});
