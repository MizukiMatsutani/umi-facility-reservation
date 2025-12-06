/**
 * RateLimiterクラスのテスト
 *
 * レート制限機能のテストケースを定義します。
 * - 5秒間隔のレート制限
 * - 同時リクエストの制限
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RateLimiter } from '../rateLimiter';

describe('RateLimiter', () => {
  beforeEach(() => {
    // 各テストの前にタイマーとシングルトンインスタンスをリセット
    vi.useFakeTimers();
    RateLimiter.resetInstance();
  });

  afterEach(() => {
    // 各テストの後にタイマーをリストア
    vi.useRealTimers();
  });

  describe('checkRateLimit', () => {
    it('初回リクエストは即座に許可される', async () => {
      const rateLimiter = new RateLimiter();

      await expect(rateLimiter.checkRateLimit()).resolves.toBeUndefined();
    });

    it('5秒経過していないリクエストはエラーを投げる', async () => {
      const rateLimiter = new RateLimiter();

      // 1回目のリクエスト
      await rateLimiter.checkRateLimit();
      rateLimiter.releaseRequest();

      // 3秒後に2回目のリクエスト（5秒経過していない）
      vi.advanceTimersByTime(3000);

      await expect(rateLimiter.checkRateLimit()).rejects.toThrow(
        '前回のリクエストから5秒経過していません'
      );
    });

    it('5秒経過したリクエストは許可される', async () => {
      const rateLimiter = new RateLimiter();

      // 1回目のリクエスト
      await rateLimiter.checkRateLimit();
      rateLimiter.releaseRequest();

      // 5秒後に2回目のリクエスト
      vi.advanceTimersByTime(5000);

      await expect(rateLimiter.checkRateLimit()).resolves.toBeUndefined();
    });

    it('5秒以上経過したリクエストは許可される', async () => {
      const rateLimiter = new RateLimiter();

      // 1回目のリクエスト
      await rateLimiter.checkRateLimit();
      rateLimiter.releaseRequest();

      // 6秒後に2回目のリクエスト
      vi.advanceTimersByTime(6000);

      await expect(rateLimiter.checkRateLimit()).resolves.toBeUndefined();
    });

    it('同時リクエストはエラーを投げる', async () => {
      const rateLimiter = new RateLimiter();

      // 1回目のリクエスト（releaseRequestを呼ばない）
      await rateLimiter.checkRateLimit();

      // 2回目のリクエスト（同時リクエスト）
      await expect(rateLimiter.checkRateLimit()).rejects.toThrow(
        '既にリクエストが実行中です'
      );
    });

    it('releaseRequest後、十分な時間経過すれば次のリクエストが許可される', async () => {
      const rateLimiter = new RateLimiter();

      // 1回目のリクエスト
      await rateLimiter.checkRateLimit();
      rateLimiter.releaseRequest();

      // 5秒経過
      vi.advanceTimersByTime(5000);

      // 2回目のリクエスト
      await expect(rateLimiter.checkRateLimit()).resolves.toBeUndefined();
    });
  });

  describe('releaseRequest', () => {
    it('リクエスト完了後にreleaseRequestを呼べる', () => {
      const rateLimiter = new RateLimiter();

      expect(() => rateLimiter.releaseRequest()).not.toThrow();
    });

    it('複数回releaseRequestを呼んでもエラーにならない', () => {
      const rateLimiter = new RateLimiter();

      rateLimiter.releaseRequest();
      expect(() => rateLimiter.releaseRequest()).not.toThrow();
    });
  });

  describe('シングルトンパターン', () => {
    it('RateLimiterはシングルトンとして機能する', () => {
      const instance1 = new RateLimiter();
      const instance2 = new RateLimiter();

      // 同じインスタンスを参照
      expect(instance1).toBe(instance2);
    });
  });

  describe('タイミングの精度', () => {
    it('レート制限の時間間隔は正確である（±100ms許容）', async () => {
      const rateLimiter = new RateLimiter();

      // 1回目のリクエスト
      await rateLimiter.checkRateLimit();
      rateLimiter.releaseRequest();

      // 4.9秒後（まだ5秒経過していない）
      vi.advanceTimersByTime(4900);
      await expect(rateLimiter.checkRateLimit()).rejects.toThrow();

      // さらに100ms経過（合計5秒）
      vi.advanceTimersByTime(100);
      await expect(rateLimiter.checkRateLimit()).resolves.toBeUndefined();
    });
  });
});
