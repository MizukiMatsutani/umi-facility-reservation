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

      // 検索ボタンをクリックして施設一覧ページへ遷移
      await this.searchFacilities(page);

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
    try {
      // 屋内スポーツのラジオボタンを選択（JavaScriptで操作）
      await page.evaluate(() => {
        const radio = document.querySelector('#radioPurposeLarge02') as HTMLInputElement;
        if (radio) {
          radio.checked = true;
          // onclickイベントを発火させる（radioMokutekiSubmit関数が呼ばれる）
          radio.click();
        } else {
          throw new Error('屋内スポーツのラジオボタンが見つかりません');
        }
      });

      // AJAXでスポーツ種目が読み込まれるまで待機
      await page.waitForSelector('#checkPurposeMiddle505', {
        timeout: 15000,
      });

      // さらに、要素が実際に表示されるまで待機
      await page.waitForFunction(
        () => {
          const checkbox = document.querySelector('#checkPurposeMiddle505');
          if (!checkbox) return false;
          const parent = checkbox.parentElement;
          if (!parent) return false;
          const display = window.getComputedStyle(parent).display;
          return display !== 'none';
        },
        { timeout: 15000 }
      );

      // DOMが完全に更新されるまで追加で待機
      await new Promise(resolve => setTimeout(resolve, 2000));

      // バスケットボールとミニバスケットボールを選択
      // 重要: input要素ではなくlabel要素をクリックする必要がある
      await page.evaluate(() => {
        const label505 = document.querySelector('label[for="checkPurposeMiddle505"]') as HTMLElement;
        const label510 = document.querySelector('label[for="checkPurposeMiddle510"]') as HTMLElement;

        if (!label505 || !label510) {
          throw new Error('バスケットボールのラベルが見つかりません');
        }

        // labelをクリックすることでチェックボックスが選択される
        label505.click();
        label510.click();
      });

      // 選択が反映されるまで少し待機
      await new Promise(resolve => setTimeout(resolve, 500));

      // 選択されたことを確認
      const isSelected = await page.evaluate(() => {
        const checkbox505 = document.querySelector('#checkPurposeMiddle505') as HTMLInputElement;
        const checkbox510 = document.querySelector('#checkPurposeMiddle510') as HTMLInputElement;
        return checkbox505?.checked && checkbox510?.checked;
      });

      if (!isSelected) {
        throw new Error('チェックボックスの選択に失敗しました');
      }

    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`スポーツ種目の選択に失敗しました: ${error.message}`);
      }
      throw new Error('スポーツ種目の選択に失敗しました');
    }
  }

  /**
   * 検索ボタンをクリックして施設一覧ページへ遷移
   *
   * @param page - Puppeteerページインスタンス
   */
  async searchFacilities(page: Page): Promise<void> {
    try {
      // ページ遷移の待機をセットアップ（クリック前に設定）
      const navigationPromise = page.waitForNavigation({
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      // searchMokuteki()関数を直接呼び出す
      // この関数はAJAXでバリデーションを行い、成功すれば__doPostBackでフォーム送信する
      await page.evaluate(() => {
        // searchMokuteki関数が存在するか確認
        if (typeof (window as any).searchMokuteki === 'function') {
          (window as any).searchMokuteki();
        } else {
          throw new Error('searchMokuteki関数が見つかりません');
        }
      });

      // ページ遷移を待つ
      await navigationPromise;

      // エラーダイアログが表示されていないか確認
      // （検索成功の場合はページ遷移するのでこのコードは実行されない）
      const errorMessage = await page.evaluate(() => {
        const dlg = document.querySelector('#messageDlg');
        if (dlg && window.getComputedStyle(dlg).display !== 'none') {
          const messageEl = dlg.querySelector('div p');
          return messageEl?.textContent || '';
        }
        return null;
      });

      if (errorMessage) {
        throw new Error(`検索に失敗しました: ${errorMessage}`);
      }

    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`施設検索に失敗しました: ${error.message}`);
      }
      throw new Error('施設検索に失敗しました');
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
      // 施設一覧テーブルが表示されるまで待機
      await page.waitForSelector('table#shisetsu', { timeout: 10000 });

      // 施設のチェックボックスから施設情報を取得
      const facilities = await page.evaluate(() => {
        const checkboxes = Array.from(
          document.querySelectorAll('input[name="checkShisetsu"]')
        ) as HTMLInputElement[];

        return checkboxes.map((checkbox) => {
          // チェックボックスのラベルから施設名を取得
          const label = checkbox.parentElement?.textContent?.trim() || '';

          return {
            id: checkbox.value, // 施設ID（例: "341007"）
            name: label,        // 施設名（例: "宇美勤労者体育センター"）
          };
        });
      });

      if (facilities.length === 0) {
        throw new Error('施設が見つかりませんでした');
      }

      console.log(`✅ ${facilities.length}件の施設を取得しました`);

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
