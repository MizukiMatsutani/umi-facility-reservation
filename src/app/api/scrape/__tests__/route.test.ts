/**
 * /api/scrape エンドポイントの統合テスト
 *
 * このテストは、APIルートのリクエストバリデーション、レート制限、
 * エラーハンドリング、および正常系の動作を検証します。
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '../route';
import type { ScrapeRequest, ScrapeResponse, ErrorResponse } from '@/lib/types/api';
import { rateLimiter } from '@/lib/scraper/rateLimiter';
import { FacilityScraper } from '@/lib/scraper';

// FacilityScraperをモック化
const mockScrapeFacilities = vi.fn();

vi.mock('@/lib/scraper', () => {
  return {
    FacilityScraper: class MockFacilityScraper {
      async scrapeFacilities(...args: unknown[]) {
        return mockScrapeFacilities(...args);
      }
    },
  };
});

// rateLimiterもモック化して制御可能にする
vi.mock('@/lib/scraper/rateLimiter', () => {
  let lastRequestTime = 0;
  let isRequestInProgress = false;

  return {
    rateLimiter: {
      async checkRateLimit() {
        const now = Date.now();
        if (isRequestInProgress) {
          throw new Error('別のリクエストが処理中です');
        }
        if (now - lastRequestTime < 5000) {
          throw new Error('前回の検索から5秒以上経過してから再度お試しください');
        }
        isRequestInProgress = true;
        lastRequestTime = now;
      },
      releaseRequest() {
        isRequestInProgress = false;
      },
      reset() {
        lastRequestTime = 0;
        isRequestInProgress = false;
      },
    },
  };
});

describe('/api/scrape POST エンドポイント', () => {
  beforeEach(() => {
    // タイマーをリセット
    vi.clearAllTimers();
    vi.useFakeTimers();

    // モックをリセット
    vi.clearAllMocks();

    // rateLimiterの状態をリセット
    (rateLimiter as { reset: () => void }).reset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * ヘルパー関数: リクエストオブジェクトを作成
   */
  const createRequest = (body: ScrapeRequest): Request => {
    return new Request('http://localhost:3000/api/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  };

  describe('正常系', () => {
    it('有効なリクエストで200とScrapeResponseを返す', async () => {
      // モックデータの準備
      const mockFacilities = [
        {
          facility: {
            id: '1',
            name: 'テスト施設',
          },
          availability: [
            {
              date: new Date('2025-12-06'),
              timeSlots: [
                {
                  time: '09:00',
                  available: true,
                },
              ],
            },
          ],
        },
      ];

      mockScrapeFacilities.mockResolvedValue(mockFacilities);

      // リクエストを作成
      const requestBody: ScrapeRequest = {
        dates: ['2025-12-06', '2025-12-07'],
        timeRange: {
          from: '09:00',
          to: '12:00',
        },
      };

      const request = createRequest(requestBody);

      // APIを呼び出し
      const response = await POST(request);
      const data = (await response.json()) as ScrapeResponse;

      // レスポンスを検証
      expect(response.status).toBe(200);
      expect(data.facilities).toHaveLength(1);
      expect(data.facilities[0].facility.id).toBe('1');
      expect(data.facilities[0].facility.name).toBe('テスト施設');
      expect(data.facilities[0].availability).toHaveLength(1);
      expect(data.facilities[0].availability[0].timeSlots).toHaveLength(1);

      expect(mockScrapeFacilities).toHaveBeenCalledTimes(1);
      expect(mockScrapeFacilities).toHaveBeenCalledWith(
        [new Date('2025-12-06'), new Date('2025-12-07')]
      );
    });

    it('timeRangeがundefinedでも正常に動作する', async () => {
      const mockFacilities = [];
      mockScrapeFacilities.mockResolvedValue(mockFacilities);

      const requestBody: ScrapeRequest = {
        dates: ['2025-12-06'],
      };

      const request = createRequest(requestBody);
      const response = await POST(request);
      const data = (await response.json()) as ScrapeResponse;

      expect(response.status).toBe(200);
      expect(data.facilities).toEqual(mockFacilities);
      expect(mockScrapeFacilities).toHaveBeenCalledWith([new Date('2025-12-06')]);
    });
  });

  describe('バリデーションエラー', () => {
    it('不正な日付フォーマットで400エラーを返す', async () => {
      const requestBody = {
        dates: ['invalid-date'],
      };

      const request = createRequest(requestBody as ScrapeRequest);
      const response = await POST(request);
      const data = (await response.json()) as ErrorResponse;

      expect(response.status).toBe(400);
      expect(data.error).toBe('validation');
      expect(data.message).toContain('不正な日付フォーマット');
      expect(data.retryable).toBe(false);
    });

    it('空の日付配列で400エラーを返す', async () => {
      const requestBody: ScrapeRequest = {
        dates: [],
      };

      const request = createRequest(requestBody);
      const response = await POST(request);
      const data = (await response.json()) as ErrorResponse;

      expect(response.status).toBe(400);
      expect(data.error).toBe('validation');
      expect(data.message).toContain('日付');
      expect(data.retryable).toBe(false);
    });

    // timeRange機能は最適化により削除されました
    it.skip('不正な時間範囲（To < From）で400エラーを返す', async () => {
      const requestBody: ScrapeRequest = {
        dates: ['2025-12-06'],
        timeRange: {
          from: '18:00',
          to: '09:00', // Fromより前
        },
      };

      const request = createRequest(requestBody);
      const response = await POST(request);
      const data = (await response.json()) as ErrorResponse;

      expect(response.status).toBe(400);
      expect(data.error).toBe('validation');
      expect(data.retryable).toBe(false);
    });

    it('不正なJSONで400エラーを返す', async () => {
      const request = new Request('http://localhost:3000/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json',
      });

      const response = await POST(request);
      const data = (await response.json()) as ErrorResponse;

      expect(response.status).toBe(400);
      expect(data.error).toBe('validation');
      expect(data.message).toContain('リクエストの形式が不正');
      expect(data.retryable).toBe(false);
    });
  });

  describe('レート制限', () => {
    it('5秒以内の連続リクエストで429エラーを返す', async () => {
      const mockFacilities = [];
      mockScrapeFacilities.mockResolvedValue(mockFacilities);

      const requestBody: ScrapeRequest = {
        dates: ['2025-12-06'],
      };

      // 1回目のリクエスト（成功）
      const request1 = createRequest(requestBody);
      const response1 = await POST(request1);
      expect(response1.status).toBe(200);

      // 2回目のリクエスト（5秒以内なので失敗）
      const request2 = createRequest(requestBody);
      const response2 = await POST(request2);
      const data2 = (await response2.json()) as ErrorResponse;

      expect(response2.status).toBe(429);
      expect(data2.error).toBe('rate_limit');
      expect(data2.message).toContain('5秒以上経過');
      expect(data2.retryable).toBe(true);
    });

    it('5秒経過後のリクエストは成功する', async () => {
      const mockFacilities = [];
      mockScrapeFacilities.mockResolvedValue(mockFacilities);

      const requestBody: ScrapeRequest = {
        dates: ['2025-12-06'],
      };

      // 1回目のリクエスト
      const request1 = createRequest(requestBody);
      await POST(request1);

      // 5秒経過
      vi.advanceTimersByTime(5000);

      // 2回目のリクエスト（成功）
      const request2 = createRequest(requestBody);
      const response2 = await POST(request2);

      expect(response2.status).toBe(200);
    });
  });

  describe('スクレイピングエラー', () => {
    it('タイムアウトエラーで500エラーとtimeoutタイプを返す', async () => {
      mockScrapeFacilities.mockRejectedValue(new Error('Navigation timeout of 10000 ms exceeded'));

      const requestBody: ScrapeRequest = {
        dates: ['2025-12-06'],
      };

      const request = createRequest(requestBody);
      const response = await POST(request);
      const data = (await response.json()) as ErrorResponse;

      expect(response.status).toBe(500);
      expect(data.error).toBe('timeout');
      expect(data.message).toContain('タイムアウト');
      expect(data.retryable).toBe(true);
    });

    it('ネットワークエラーで500エラーとnetworkタイプを返す', async () => {
      mockScrapeFacilities.mockRejectedValue(new Error('net::ERR_CONNECTION_REFUSED'));

      const requestBody: ScrapeRequest = {
        dates: ['2025-12-06'],
      };

      const request = createRequest(requestBody);
      const response = await POST(request);
      const data = (await response.json()) as ErrorResponse;

      expect(response.status).toBe(500);
      expect(data.error).toBe('network');
      expect(data.message).toContain('取得に失敗');
      expect(data.retryable).toBe(true);
    });

    it('一般的なスクレイピングエラーで500エラーとscrapingタイプを返す', async () => {
      mockScrapeFacilities.mockRejectedValue(new Error('HTMLの構造が変更されています'));

      const requestBody: ScrapeRequest = {
        dates: ['2025-12-06'],
      };

      const request = createRequest(requestBody);
      const response = await POST(request);
      const data = (await response.json()) as ErrorResponse;

      expect(response.status).toBe(500);
      expect(data.error).toBe('scraping');
      expect(data.message).toContain('エラーが発生');
      expect(data.retryable).toBe(true);
    });

    it('スクレイピングエラー後もrateLimiterはreleaseされる', async () => {
      mockScrapeFacilities.mockRejectedValue(new Error('Scraping failed'));

      const requestBody: ScrapeRequest = {
        dates: ['2025-12-06'],
      };

      // エラーになるリクエスト
      const request1 = createRequest(requestBody);
      await POST(request1);

      // 5秒経過
      vi.advanceTimersByTime(5000);

      // 次のリクエストが可能（releaseされている証拠）
      mockScrapeFacilities.mockResolvedValue([]);
      const request2 = createRequest(requestBody);
      const response2 = await POST(request2);

      expect(response2.status).toBe(200);
    });
  });

  describe('予期しないエラー', () => {
    it('その他のエラーで500エラーとscrapingタイプを返す', async () => {
      // 予期しないエラーをスローするケースをシミュレート
      mockScrapeFacilities.mockRejectedValue(new Error('Unexpected error'));

      const requestBody: ScrapeRequest = {
        dates: ['2025-12-06'],
      };

      const request = createRequest(requestBody);
      const response = await POST(request);
      const data = (await response.json()) as ErrorResponse;

      expect(response.status).toBe(500);
      expect(data.error).toBe('scraping');
      expect(data.message).toContain('エラーが発生');
      expect(data.retryable).toBe(true);
    });
  });
});
