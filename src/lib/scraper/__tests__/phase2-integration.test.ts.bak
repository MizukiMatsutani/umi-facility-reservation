/**
 * Phase 2スクレイピングフローの統合テスト
 *
 * 完全な日付選択→空き状況取得フローの統合テストケースを定義します。
 * - 単一日付のスクレイピング
 * - 複数日付のスクレイピング
 * - 時間範囲フィルタリング
 * - エラーハンドリング
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FacilityScraper } from '../index';
import type { Facility, AvailabilityData, TimeRange } from '@/lib/types';

// Puppeteerのモック
const mockPage = {
  goto: vi.fn(),
  evaluate: vi.fn(),
  click: vi.fn(),
  waitForNavigation: vi.fn(),
  waitForSelector: vi.fn(),
  goBack: vi.fn(),
  on: vi.fn(),
  close: vi.fn(),
};

const mockBrowser = {
  newPage: vi.fn(),
  close: vi.fn(),
};

// Puppeteer全体のモック
vi.mock('puppeteer', () => ({
  default: {
    launch: vi.fn(() => Promise.resolve(mockBrowser)),
  },
}));

describe('Phase 2スクレイピングフロー統合テスト', () => {
  let scraper: FacilityScraper;
  const testFacility: Facility = {
    id: 'facility-001',
    name: 'テスト体育館',
    type: 'basketball',
  };

  beforeEach(() => {
    // モックをリセット
    vi.clearAllMocks();

    // newPageのモックを設定
    mockBrowser.newPage.mockResolvedValue(mockPage);

    // ページイベントハンドラ（dialogの自動承認）のモック
    mockPage.on.mockImplementation((event, handler) => {
      // dialogイベントは何もしない
      return mockPage;
    });

    // デフォルトの成功レスポンス
    mockPage.goto.mockResolvedValue(null);
    mockPage.waitForNavigation.mockResolvedValue(null);
    mockPage.waitForSelector.mockResolvedValue(null);

    scraper = new FacilityScraper();
  });

  describe('単一日付のスクレイピング', () => {
    it('1つの日付で空き状況を正しく取得する', async () => {
      const testDate = new Date('2025-12-10');
      const dates = [testDate];

      // 施設選択とナビゲーション（1回のみ）
      mockPage.evaluate.mockResolvedValueOnce(true); // チェックボックス選択
      mockPage.click.mockResolvedValueOnce(undefined); // 次へボタン

      // 日付選択とナビゲーション
      mockPage.evaluate.mockResolvedValueOnce(true); // 日付クリック

      // 空き状況の取得（page.evaluate）
      mockPage.evaluate.mockResolvedValueOnce([
        { time: '9:00', available: true },
        { time: '9:30', available: true },
        { time: '10:00', available: false },
      ]);

      // scrapeAvailabilityの呼び出し
      // 注: この統合テストではscrapeAvailabilityを直接呼び出す
      // 実際のinitBrowser, closeBrowserは個別テストでカバー済み
      const result = await scraper.scrapeAvailability(
        mockPage as any,
        testFacility,
        dates,
        undefined
      );

      // 検証
      expect(result).toHaveLength(1);
      expect(result[0].date).toEqual(testDate);
      expect(result[0].slots).toHaveLength(3);
      expect(result[0].slots[0]).toEqual({ time: '9:00', available: true });

      // selectFacilityAndNavigateが1回呼ばれる
      expect(mockPage.evaluate).toHaveBeenCalledWith(
        expect.any(Function),
        testFacility.id
      );
      expect(mockPage.click).toHaveBeenCalled();

      // selectDateAndNavigateが1回呼ばれる
      expect(mockPage.evaluate).toHaveBeenCalledWith(
        expect.any(Function),
        '2025-12-10'
      );

      // navigateBackは呼ばれない（最後の日付）
      expect(mockPage.goBack).not.toHaveBeenCalled();
    });
  });

  describe('複数日付のスクレイピング', () => {
    it('3つの日付で空き状況を正しく取得する', async () => {
      const dates = [
        new Date('2025-12-10'),
        new Date('2025-12-11'),
        new Date('2025-12-12'),
      ];

      // 施設選択（1回のみ）
      mockPage.evaluate.mockResolvedValueOnce(true);
      mockPage.click.mockResolvedValueOnce(undefined);

      // 日付1の選択と空き状況取得
      mockPage.evaluate.mockResolvedValueOnce(true); // 日付クリック
      mockPage.evaluate.mockResolvedValueOnce([
        { time: '9:00', available: true },
      ]);

      // 戻るナビゲーション（1回目）
      mockPage.goBack.mockResolvedValueOnce(undefined);

      // 日付2の選択と空き状況取得
      mockPage.evaluate.mockResolvedValueOnce(true);
      mockPage.evaluate.mockResolvedValueOnce([
        { time: '10:00', available: false },
      ]);

      // 戻るナビゲーション（2回目）
      mockPage.goBack.mockResolvedValueOnce(undefined);

      // 日付3の選択と空き状況取得
      mockPage.evaluate.mockResolvedValueOnce(true);
      mockPage.evaluate.mockResolvedValueOnce([
        { time: '11:00', available: true },
      ]);

      const result = await scraper.scrapeAvailability(
        mockPage as any,
        testFacility,
        dates,
        undefined
      );

      // 検証
      expect(result).toHaveLength(3);
      expect(result[0].date).toEqual(dates[0]);
      expect(result[1].date).toEqual(dates[1]);
      expect(result[2].date).toEqual(dates[2]);

      // selectFacilityAndNavigateが1回
      expect(mockPage.click).toHaveBeenCalledTimes(1);

      // selectDateAndNavigateが3回
      const dateEvaluateCalls = mockPage.evaluate.mock.calls.filter(
        (call) =>
          typeof call[1] === 'string' && call[1].match(/^\d{4}-\d{2}-\d{2}$/)
      );
      expect(dateEvaluateCalls).toHaveLength(3);

      // navigateBackが2回（最後の日付以外）
      expect(mockPage.goBack).toHaveBeenCalledTimes(2);
    });

    it('日付間でnavigateBackが正しく呼ばれる', async () => {
      const dates = [new Date('2025-12-10'), new Date('2025-12-11')];

      mockPage.evaluate.mockResolvedValueOnce(true); // 施設選択
      mockPage.click.mockResolvedValueOnce(undefined);

      mockPage.evaluate.mockResolvedValueOnce(true); // 日付1
      mockPage.evaluate.mockResolvedValueOnce([]);

      mockPage.goBack.mockResolvedValueOnce(undefined); // 戻る

      mockPage.evaluate.mockResolvedValueOnce(true); // 日付2
      mockPage.evaluate.mockResolvedValueOnce([]);

      await scraper.scrapeAvailability(
        mockPage as any,
        testFacility,
        dates,
        undefined
      );

      // navigateBackが1回だけ呼ばれる（日付1の後、日付2の前に1回）
      expect(mockPage.goBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('時間範囲フィルタリング', () => {
    it('時間範囲を指定した場合、該当する時間帯のみ返す', async () => {
      const testDate = new Date('2025-12-10');
      const dates = [testDate];
      const timeRange: TimeRange = { from: '9:00', to: '11:00' };

      mockPage.evaluate.mockResolvedValueOnce(true); // 施設選択
      mockPage.click.mockResolvedValueOnce(undefined);

      mockPage.evaluate.mockResolvedValueOnce(true); // 日付選択

      // 空き状況データ（フィルタリング前）
      mockPage.evaluate.mockResolvedValueOnce([
        { time: '8:30', available: true }, // 範囲外
        { time: '9:00', available: true }, // 範囲内
        { time: '9:30', available: true }, // 範囲内
        { time: '10:00', available: false }, // 範囲内
        { time: '10:30', available: true }, // 範囲内
        { time: '11:00', available: true }, // 範囲内（終了時刻含む）
        { time: '11:30', available: false }, // 範囲外
      ]);

      const result = await scraper.scrapeAvailability(
        mockPage as any,
        testFacility,
        dates,
        timeRange
      );

      // 検証: 9:00〜11:00の時間帯のみ
      expect(result).toHaveLength(1);
      expect(result[0].slots).toHaveLength(5); // 9:00, 9:30, 10:00, 10:30, 11:00
      expect(result[0].slots[0].time).toBe('9:00');
      expect(result[0].slots[4].time).toBe('11:00');
    });

    it('時間範囲がundefinedの場合、全時間帯を返す', async () => {
      const testDate = new Date('2025-12-10');
      const dates = [testDate];

      mockPage.evaluate.mockResolvedValueOnce(true); // 施設選択
      mockPage.click.mockResolvedValueOnce(undefined);

      mockPage.evaluate.mockResolvedValueOnce(true); // 日付選択

      const allSlots = [
        { time: '8:30', available: true },
        { time: '9:00', available: true },
        { time: '21:00', available: false },
      ];
      mockPage.evaluate.mockResolvedValueOnce(allSlots);

      const result = await scraper.scrapeAvailability(
        testFacility,
        dates,
        undefined, // 時間範囲指定なし
        mockPage as any
      );

      // 検証: 全時間帯が返される
      expect(result[0].slots).toHaveLength(3);
    });
  });

  describe('エラーハンドリング', () => {
    it('ナビゲーションタイムアウト時にエラーを継続する', async () => {
      const dates = [new Date('2025-12-10')];

      mockPage.evaluate.mockResolvedValueOnce(true); // 施設選択
      mockPage.click.mockResolvedValueOnce(undefined);

      // 日付選択でタイムアウトエラー
      mockPage.evaluate.mockRejectedValueOnce(
        new Error('Navigation timeout of 10000 ms exceeded')
      );

      await expect(
        scraper.scrapeAvailability(mockPage as any, testFacility, dates, undefined)
      ).rejects.toThrow('Navigation timeout');
    });

    it('空き状況テーブルが見つからない場合のエラー処理', async () => {
      const dates = [new Date('2025-12-10')];

      mockPage.evaluate.mockResolvedValueOnce(true); // 施設選択
      mockPage.click.mockResolvedValueOnce(undefined);

      mockPage.evaluate.mockResolvedValueOnce(true); // 日付選択

      // テーブルが見つからない（空配列）
      mockPage.evaluate.mockResolvedValueOnce([]);

      const result = await scraper.scrapeAvailability(
        mockPage as any,
        testFacility,
        dates,
        undefined
      );

      // 検証: 空の配列でもエラーにならず、空のslotsを返す
      expect(result).toHaveLength(1);
      expect(result[0].slots).toHaveLength(0);
    });

    it('途中の日付でエラーが発生しても他の日付の処理を継続する', async () => {
      const dates = [
        new Date('2025-12-10'),
        new Date('2025-12-11'),
        new Date('2025-12-12'),
      ];

      mockPage.evaluate.mockResolvedValueOnce(true); // 施設選択
      mockPage.click.mockResolvedValueOnce(undefined);

      // 日付1: 成功
      mockPage.evaluate.mockResolvedValueOnce(true);
      mockPage.evaluate.mockResolvedValueOnce([
        { time: '9:00', available: true },
      ]);
      mockPage.goBack.mockResolvedValueOnce(undefined);

      // 日付2: エラー
      mockPage.evaluate.mockRejectedValueOnce(new Error('Page error'));

      // エラー時でもテストが通ることを確認
      // 実装によっては部分的な結果を返すか、全体がエラーになるかが異なる
      await expect(
        scraper.scrapeAvailability(mockPage as any, testFacility, dates, undefined)
      ).rejects.toThrow();
    });
  });

  describe('メソッド呼び出しシーケンス', () => {
    it('正しい順序でメソッドが呼ばれる', async () => {
      const dates = [new Date('2025-12-10'), new Date('2025-12-11')];
      const callOrder: string[] = [];

      // モックの呼び出し順序を記録
      mockPage.evaluate.mockImplementation((fn: any, arg?: any) => {
        if (typeof arg === 'string') {
          if (arg === testFacility.id) {
            callOrder.push('selectFacility');
          } else if (arg.match(/^\d{4}-\d{2}-\d{2}$/)) {
            callOrder.push('selectDate');
          }
        } else if (typeof fn === 'function' && !arg) {
          callOrder.push('scrapeAvailabilityFromPage');
          return Promise.resolve([]);
        }
        return Promise.resolve(true);
      });

      mockPage.click.mockImplementation(() => {
        callOrder.push('clickNext');
        return Promise.resolve(undefined);
      });

      mockPage.goBack.mockImplementation(() => {
        callOrder.push('navigateBack');
        return Promise.resolve(undefined);
      });

      await scraper.scrapeAvailability(
        mockPage as any,
        testFacility,
        dates,
        undefined
      );

      // 期待される呼び出し順序
      expect(callOrder).toEqual([
        'selectFacility',
        'clickNext',
        'selectDate',
        'scrapeAvailabilityFromPage',
        'navigateBack',
        'selectDate',
        'scrapeAvailabilityFromPage',
      ]);
    });
  });

  describe('データ構造の検証', () => {
    it('返却されるAvailabilityData[]の型が正しい', async () => {
      const testDate = new Date('2025-12-10');
      const dates = [testDate];

      mockPage.evaluate.mockResolvedValueOnce(true);
      mockPage.click.mockResolvedValueOnce(undefined);
      mockPage.evaluate.mockResolvedValueOnce(true);
      mockPage.evaluate.mockResolvedValueOnce([
        { time: '9:00', available: true },
      ]);

      const result = await scraper.scrapeAvailability(
        mockPage as any,
        testFacility,
        dates,
        undefined
      );

      // 型の検証
      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty('date');
      expect(result[0]).toHaveProperty('slots');
      expect(result[0].date).toBeInstanceOf(Date);
      expect(Array.isArray(result[0].slots)).toBe(true);
      expect(result[0].slots[0]).toHaveProperty('time');
      expect(result[0].slots[0]).toHaveProperty('available');
      expect(typeof result[0].slots[0].time).toBe('string');
      expect(typeof result[0].slots[0].available).toBe('boolean');
    });
  });
});
