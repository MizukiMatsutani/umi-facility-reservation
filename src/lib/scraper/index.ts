/**
 * FacilityScraper - 宇美町施設予約システムのスクレイピングクラス
 *
 * Puppeteerを使用して宇美町のスポーツ施設予約システムから
 * 空き状況データを取得します。
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import type {
  Facility,
  AvailabilityData,
  TimeRange,
  FacilityAvailability,
} from '@/lib/types';
import { parseFacilities, parseAvailability } from './parser';
import { filterTimeSlots } from '@/lib/utils/timeFilter';

/**
 * 宇美町施設予約システムのスクレイピングクラス
 *
 * Puppeteerを使用してブラウザを自動操作し、施設の空き状況を取得します。
 * Vercelのサーバーレス環境に対応した設定でブラウザを起動します。
 */
export class FacilityScraper {
  private browser: Browser | null = null;

  /**
   * スクレイピング実行（メインオーケストレーションメソッド）
   *
   * @param dates - 検索対象の日付配列
   * @param timeRange - オプションの時間範囲フィルタ
   * @returns 施設ごとの空き状況データ
   */
  async scrapeFacilities(
    dates: Date[],
    timeRange?: TimeRange
  ): Promise<FacilityAvailability[]> {
    try {
      await this.initBrowser();
      const page = await this.browser!.newPage();

      // ページナビゲーション
      await this.navigateToSearchPage(page);

      // スポーツ種目選択（バスケットボール、ミニバスケットボール）
      await this.selectSports(page);

      // 施設一覧取得
      const facilities = await this.selectAllFacilities(page);

      // 各施設の空き状況をスクレイピング
      const results: FacilityAvailability[] = [];

      for (const facility of facilities) {
        const availability = await this.scrapeAvailability(
          page,
          facility,
          dates,
          timeRange
        );
        results.push({ facility, availability });
      }

      return results;
    } finally {
      // ブラウザは必ずクリーンアップ
      await this.closeBrowser();
    }
  }

  /**
   * Puppeteerブラウザの初期化
   *
   * Vercelのサーバーレス環境に対応した設定でブラウザを起動します。
   * --no-sandbox と --disable-setuid-sandbox はVercelで必要な設定です。
   */
  async initBrowser(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    });
  }

  /**
   * ブラウザのクローズ
   *
   * ブラウザインスタンスが存在する場合にクローズし、nullに設定します。
   */
  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * 宇美町システムの検索ページへナビゲート
   *
   * @param page - Puppeteerページインスタンス
   */
  async navigateToSearchPage(page: Page): Promise<void> {
    // User-Agent設定（スクレイピングであることを明示）
    await page.setUserAgent(
      'Mozilla/5.0 (compatible; UmiFacilitySearch/1.0)'
    );

    // 検索ページへ移動
    await page.goto('https://www.11489.jp/Umi/web/Home/WgR_ModeSelect', {
      waitUntil: 'networkidle0',
      timeout: 10000,
    });
  }

  /**
   * スポーツ種目の選択（バスケットボール、ミニバスケットボール）
   *
   * @param page - Puppeteerページインスタンス
   */
  async selectSports(page: Page): Promise<void> {
    // TODO: 実際のHTML構造に合わせてセレクタを調整
    // バスケットボールとミニバスケットボールのチェックボックスを選択
    try {
      await page.waitForSelector('.sport-selection', { timeout: 10000 });
      await page.click('input[value="basketball"]');
      await page.click('input[value="mini-basketball"]');
    } catch (error) {
      throw new Error('スポーツ種目の選択に失敗しました');
    }
  }

  /**
   * 施設一覧の取得
   *
   * @param page - Puppeteerページインスタンス
   * @returns 施設情報の配列
   */
  async selectAllFacilities(page: Page): Promise<Facility[]> {
    try {
      // 施設一覧が表示されるまで待機
      await page.waitForSelector('.facilities-table', { timeout: 10000 });

      // ページのHTMLを取得
      const html = await page.content();

      // HTMLパーサーを使用して施設一覧を抽出
      // バスケットボールとミニバスケットボールの両方を含むため、
      // ここでは仮に 'basketball' として扱う（実際のHTML構造による）
      const facilities = parseFacilities(html, 'basketball');

      return facilities;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`施設一覧の取得に失敗しました: ${error.message}`);
      }
      throw new Error('施設一覧の取得に失敗しました');
    }
  }

  /**
   * 空き状況のスクレイピング
   *
   * @param page - Puppeteerページインスタンス
   * @param facility - 施設情報
   * @param dates - 検索対象の日付配列
   * @param timeRange - オプションの時間範囲フィルタ
   * @returns 日付ごとの空き状況データ
   */
  async scrapeAvailability(
    page: Page,
    facility: Facility,
    dates: Date[],
    timeRange?: TimeRange
  ): Promise<AvailabilityData[]> {
    const availabilityData: AvailabilityData[] = [];

    for (const date of dates) {
      try {
        // 日付選択と施設選択（実際のHTML構造に応じて調整）
        await this.selectDateAndFacility(page, facility, date);

        // 空き状況ページのHTMLを取得
        const html = await page.content();

        // HTMLパーサーを使用して時間帯の空き情報を抽出
        const slots = parseAvailability(html);

        // 時間範囲でフィルタリング
        const filteredSlots = filterTimeSlots(slots, timeRange);

        availabilityData.push({
          date,
          slots: filteredSlots,
        });
      } catch (error) {
        // 特定日付の取得に失敗してもスキップして続行
        console.error(
          `Failed to scrape availability for ${facility.name} on ${date}:`,
          error
        );
      }
    }

    return availabilityData;
  }

  /**
   * 日付と施設を選択するヘルパーメソッド
   *
   * @param page - Puppeteerページインスタンス
   * @param facility - 施設情報
   * @param date - 検索対象日付
   */
  private async selectDateAndFacility(
    page: Page,
    facility: Facility,
    date: Date
  ): Promise<void> {
    // TODO: 実際のHTML構造に合わせてセレクタを調整
    try {
      // 日付選択（実際のUIに応じて実装）
      const dateString = date.toISOString().split('T')[0];
      await page.click(`input[data-date="${dateString}"]`);

      // 施設選択（実際のUIに応じて実装）
      await page.click(`input[data-facility-id="${facility.id}"]`);

      // 検索実行ボタンクリック
      await page.click('.search-button');

      // 結果が読み込まれるまで待機
      await page.waitForSelector('.timeslot-table', { timeout: 10000 });
    } catch (error) {
      throw new Error(
        `日付と施設の選択に失敗しました: facility=${facility.id}, date=${date}`
      );
    }
  }
}
