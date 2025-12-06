/**
 * 再試行ロジックのテスト
 *
 * fetchWithRetry関数のテストケースを定義します。
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWithRetry, sleep } from '../retry';

describe('再試行ロジック', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('fetchWithRetry', () => {
    it('成功時は即座に結果を返す', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');

      const promise = fetchWithRetry(mockFn);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('1回失敗後、2秒後に再試行して成功する（デフォルトretryCount=1）', async () => {
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('success');

      const promise = fetchWithRetry(mockFn);

      // 1回目の失敗
      await vi.advanceTimersByTimeAsync(0);
      expect(mockFn).toHaveBeenCalledTimes(1);

      // 2秒待機後、2回目の試行
      await vi.advanceTimersByTimeAsync(2000);
      const result = await promise;

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('retryCount=2の場合、最大3回試行する', async () => {
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValueOnce('success');

      const promise = fetchWithRetry(mockFn, 2);

      // 1回目
      await vi.advanceTimersByTimeAsync(0);
      expect(mockFn).toHaveBeenCalledTimes(1);

      // 2秒待機 → 2回目
      await vi.advanceTimersByTimeAsync(2000);
      expect(mockFn).toHaveBeenCalledTimes(2);

      // 2秒待機 → 3回目
      await vi.advanceTimersByTimeAsync(2000);
      const result = await promise;

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('すべての試行が失敗した場合は最後のエラーを投げる', async () => {
      const error = new Error('Final error');
      const mockFn = vi.fn().mockRejectedValue(error);

      const promise = fetchWithRetry(mockFn, 1);

      // プロミスを明示的に処理してunhandled rejectionを防ぐ
      promise.catch(() => {});

      // 1回目
      await vi.advanceTimersByTimeAsync(0);

      // 2秒待機 → 2回目
      await vi.advanceTimersByTimeAsync(2000);

      await expect(promise).rejects.toThrow('Final error');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('retryCount=0の場合、再試行せず1回のみ実行', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Error'));

      const promise = fetchWithRetry(mockFn, 0);

      // プロミスを明示的に処理してunhandled rejectionを防ぐ
      promise.catch(() => {});

      await vi.advanceTimersByTimeAsync(0);

      await expect(promise).rejects.toThrow('Error');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('遅延時間は正確に2秒である', async () => {
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('Error'))
        .mockResolvedValueOnce('success');

      const promise = fetchWithRetry(mockFn);

      // 1回目失敗
      await vi.advanceTimersByTimeAsync(0);

      // 1.9秒後（まだ2秒経過していない）
      await vi.advanceTimersByTimeAsync(1900);
      expect(mockFn).toHaveBeenCalledTimes(1);

      // さらに100ms経過（合計2秒）
      await vi.advanceTimersByTimeAsync(100);
      await promise;

      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('ジェネリック型が正しく機能する', async () => {
      const mockFn = vi.fn().mockResolvedValue({ data: 'test', count: 42 });

      const promise = fetchWithRetry(mockFn);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual({ data: 'test', count: 42 });
    });
  });

  describe('sleep', () => {
    it('指定されたミリ秒間待機する', async () => {
      const promise = sleep(1000);

      await vi.advanceTimersByTimeAsync(999);
      // まだ完了していない

      await vi.advanceTimersByTimeAsync(1);
      await promise;
      // 完了
    });

    it('0ミリ秒の待機も可能', async () => {
      const promise = sleep(0);
      await vi.advanceTimersByTimeAsync(0);
      await promise;
    });
  });
});
