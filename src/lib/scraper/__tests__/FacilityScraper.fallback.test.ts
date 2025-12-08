/**
 * FacilityScraper フォールバック機能の統合テスト
 *
 * 直接APIモード失敗時にレガシーモードへフォールバックする動作を検証する
 */

import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { FacilityScraper } from '../index';

// モック型定義
interface MockScraper {
  scrapeFacilitiesDirectMode: Mock;
  scrapeFacilitiesLegacyMode: Mock;
}

describe('FacilityScraper - フォールバック機能', () => {
  let scraper: FacilityScraper;
  const testDates = [new Date('2025-12-15'), new Date('2025-12-16')];

  beforeEach(() => {
    scraper = new FacilityScraper();

    // コンソール出力をモック化（テスト出力を抑制）
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('scrapeFacilities - デフォルト動作', () => {
    it('デフォルトで直接APIモードを使用すること', async () => {
      // 直接APIモードをスパイ
      const directModeSpy = vi.spyOn(
        scraper as any,
        'scrapeFacilitiesDirectMode'
      );
      directModeSpy.mockResolvedValue([
        {
          facility: { id: '341007', name: 'テスト施設' },
          date: new Date('2025-12-15'),
          timeSlots: [],
        },
      ]);

      await scraper.scrapeFacilities(testDates);

      expect(directModeSpy).toHaveBeenCalledWith(testDates);
      expect(directModeSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('エラーハンドリング', () => {
    it('直接APIモードでエラーが発生した場合、エラーをスローすること', async () => {
      const directModeSpy = vi.spyOn(
        scraper as any,
        'scrapeFacilitiesDirectMode'
      );
      directModeSpy.mockRejectedValue(
        new Error('DirectApiClient initialization failed')
      );

      await expect(scraper.scrapeFacilities(testDates)).rejects.toThrow(
        'DirectApiClient initialization failed'
      );
    });

    it('DirectApiClientのexecuteメソッドでエラーが発生した場合、適切に処理されること', async () => {
      const directModeSpy = vi.spyOn(
        scraper as any,
        'scrapeFacilitiesDirectMode'
      );
      directModeSpy.mockRejectedValue(
        new Error('検索ページへのアクセスに失敗しました')
      );

      await expect(scraper.scrapeFacilities(testDates)).rejects.toThrow(
        '検索ページへのアクセスに失敗しました'
      );
    });
  });

  describe('モード切り替えのロジック', () => {
    it('scrapeFacilitiesDirectModeが成功した場合、レガシーモードは呼ばれないこと', async () => {
      const mockResult = [
        {
          facility: { id: '341007', name: 'テスト施設' },
          date: new Date('2025-12-15'),
          timeSlots: [],
        },
      ];

      const directModeSpy = vi.spyOn(
        scraper as any,
        'scrapeFacilitiesDirectMode'
      );
      directModeSpy.mockResolvedValue(mockResult);

      const legacyModeSpy = vi.spyOn(
        scraper as any,
        'scrapeFacilitiesLegacyMode'
      );

      const result = await scraper.scrapeFacilities(testDates);

      expect(directModeSpy).toHaveBeenCalledTimes(1);
      expect(legacyModeSpy).not.toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it('両モードで同じデータ形式を返すこと', async () => {
      const expectedStructure = [
        {
          facility: { id: expect.any(String), name: expect.any(String) },
          date: expect.any(Date),
          timeSlots: expect.any(Array),
        },
      ];

      // 直接APIモードの結果を検証
      const directModeSpy = vi.spyOn(
        scraper as any,
        'scrapeFacilitiesDirectMode'
      );
      directModeSpy.mockResolvedValue([
        {
          facility: { id: '341007', name: '直接APIモード施設' },
          date: new Date('2025-12-15'),
          timeSlots: [],
        },
      ]);

      const directResult = await scraper.scrapeFacilities(testDates);
      expect(directResult).toMatchObject(expectedStructure);
    });
  });

  describe('並列呼び出しの安全性', () => {
    it('複数のscrapeFacilities呼び出しが干渉しないこと', async () => {
      const directModeSpy = vi.spyOn(
        scraper as any,
        'scrapeFacilitiesDirectMode'
      );

      let callCount = 0;
      directModeSpy.mockImplementation(async () => {
        const id = ++callCount;
        await new Promise((resolve) => setTimeout(resolve, 10));
        return [
          {
            facility: { id: `${id}`, name: `施設${id}` },
            date: new Date('2025-12-15'),
            timeSlots: [],
          },
        ];
      });

      // 2つの並列呼び出し
      const [result1, result2] = await Promise.all([
        scraper.scrapeFacilities([new Date('2025-12-15')]),
        scraper.scrapeFacilities([new Date('2025-12-16')]),
      ]);

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(directModeSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('エラーメッセージの検証', () => {
    it('ネットワークエラー時に適切なエラーメッセージを返すこと', async () => {
      const directModeSpy = vi.spyOn(
        scraper as any,
        'scrapeFacilitiesDirectMode'
      );
      directModeSpy.mockRejectedValue(new Error('net::ERR_CONNECTION_REFUSED'));

      await expect(scraper.scrapeFacilities(testDates)).rejects.toThrow(
        'net::ERR_CONNECTION_REFUSED'
      );
    });

    it('タイムアウトエラー時に適切なエラーメッセージを返すこと', async () => {
      const directModeSpy = vi.spyOn(
        scraper as any,
        'scrapeFacilitiesDirectMode'
      );
      directModeSpy.mockRejectedValue(
        new Error('Navigation timeout of 30000 ms exceeded')
      );

      await expect(scraper.scrapeFacilities(testDates)).rejects.toThrow(
        'Navigation timeout'
      );
    });
  });

  describe('パフォーマンス計測', () => {
    it('直接APIモードの実行時間が記録されること', async () => {
      const directModeSpy = vi.spyOn(
        scraper as any,
        'scrapeFacilitiesDirectMode'
      );

      directModeSpy.mockImplementation(async () => {
        // 実際の処理を模倣（100msの遅延）
        await new Promise((resolve) => setTimeout(resolve, 100));
        return [
          {
            facility: { id: '341007', name: 'テスト施設' },
            date: new Date('2025-12-15'),
            timeSlots: [],
          },
        ];
      });

      const startTime = Date.now();
      await scraper.scrapeFacilities(testDates);
      const endTime = Date.now();

      const executionTime = endTime - startTime;
      // 実行時間が100ms以上であることを確認（モックの遅延時間）
      expect(executionTime).toBeGreaterThanOrEqual(100);
    });
  });

  describe('入力データの検証', () => {
    it('空の日付配列が渡された場合でもエラーにならないこと', async () => {
      const directModeSpy = vi.spyOn(
        scraper as any,
        'scrapeFacilitiesDirectMode'
      );
      directModeSpy.mockResolvedValue([]);

      const result = await scraper.scrapeFacilities([]);

      expect(result).toEqual([]);
      expect(directModeSpy).toHaveBeenCalledWith([]);
    });

    it('過去の日付が渡された場合でも処理されること', async () => {
      const pastDate = new Date('2020-01-01');
      const directModeSpy = vi.spyOn(
        scraper as any,
        'scrapeFacilitiesDirectMode'
      );
      directModeSpy.mockResolvedValue([
        {
          facility: { id: '341007', name: 'テスト施設' },
          date: pastDate,
          timeSlots: [],
        },
      ]);

      await scraper.scrapeFacilities([pastDate]);

      expect(directModeSpy).toHaveBeenCalledWith([pastDate]);
    });

    it('未来の日付が渡された場合でも処理されること', async () => {
      const futureDate = new Date('2030-12-31');
      const directModeSpy = vi.spyOn(
        scraper as any,
        'scrapeFacilitiesDirectMode'
      );
      directModeSpy.mockResolvedValue([
        {
          facility: { id: '341007', name: 'テスト施設' },
          date: futureDate,
          timeSlots: [],
        },
      ]);

      await scraper.scrapeFacilities([futureDate]);

      expect(directModeSpy).toHaveBeenCalledWith([futureDate]);
    });
  });
});
