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

      // ダイアログを自動的に受け入れる（「ページから離れますか？」を自動でOK）
      page.on('dialog', async dialog => {
        console.log('ダイアログ検出:', dialog.message());
        await dialog.accept();
      });

      // ページナビゲーション
      await this.navigateToSearchPage(page);

      // スポーツ種目選択（バスケットボール、ミニバスケットボール）
      await this.selectSports(page);

      // 検索ボタンをクリックして施設一覧ページへ遷移
      await this.searchFacilities(page);

      // 施設一覧取得
      const facilities = await this.selectAllFacilities(page);

      // 各施設の空き状況をスクレイピング
      // 施設一覧ページには既に各施設の「本日の予定」が表示されているため、
      // このページから直接スクレイピングする
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
      // 重要: .checked プロパティを直接設定する
      await page.evaluate(() => {
        const checkbox505 = document.querySelector('#checkPurposeMiddle505') as HTMLInputElement;
        const checkbox510 = document.querySelector('#checkPurposeMiddle510') as HTMLInputElement;

        if (!checkbox505 || !checkbox510) {
          throw new Error('バスケットボールのチェックボックスが見つかりません');
        }

        // チェックボックスの .checked プロパティを直接設定
        checkbox505.checked = true;
        checkbox510.checked = true;

        // changeイベントを発火（サイトのJavaScriptが依存している可能性があるため）
        const changeEvent = new Event('change', { bubbles: true });
        checkbox505.dispatchEvent(changeEvent);
        checkbox510.dispatchEvent(changeEvent);

        // clickイベントも発火（念のため）
        const clickEvent = new Event('click', { bubbles: true });
        checkbox505.dispatchEvent(clickEvent);
        checkbox510.dispatchEvent(clickEvent);
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
      // チェックボックスが選択されているか確認
      const checkboxState = await page.evaluate(() => {
        const middleList = document.getElementsByName('checkPurposeMiddle');
        const checkedValues: string[] = [];
        for (let i = 0; i < middleList.length; i++) {
          if ((middleList[i] as HTMLInputElement).checked) {
            checkedValues.push((middleList[i] as HTMLInputElement).value);
          }
        }
        return {
          radioSelected: (document.querySelector('input[name="radioPurposeLarge"]:checked') as HTMLInputElement)?.value,
          checkboxCount: checkedValues.length,
          checkboxValues: checkedValues,
        };
      });

      console.log('検索前のバリデーション状態:', checkboxState);

      if (checkboxState.checkboxCount === 0) {
        throw new Error('チェックボックスが選択されていません');
      }

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

      console.log('searchMokuteki()を呼び出しました。ページ遷移を待機中...');

      // ページ遷移を待つ
      await navigationPromise;

      console.log('ページ遷移完了。現在のURL:', page.url());

      // エラーダイアログが表示されていないか確認
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
    // 施設一覧ページから直接、本日の予定をスクレイピング
    // このページには既に各施設の「本日の予定」が表示されている
    
    try {
      // 施設名を含む見出しを探す（例: "宇美勤労者体育センターの本日の予定"）
      const facilitySchedule = await page.evaluate((facilityName) => {
        // 施設名を含むh2要素を探す
        const headings = Array.from(document.querySelectorAll('h2'));
        const facilityHeading = headings.find(h => 
          h.textContent?.includes(facilityName) && h.textContent?.includes('の本日の予定')
        );

        if (!facilityHeading) {
          return null;
        }

        // この見出しの次にある .item_wrap を取得
        const itemWrap = facilityHeading.nextElementSibling;
        if (!itemWrap || !itemWrap.classList.contains('item_wrap')) {
          return null;
        }

        // 各 .item（施設の部屋/エリア）を処理
        const items = Array.from(itemWrap.querySelectorAll('.item'));
        
        return items.map(item => {
          const areaName = item.querySelector('h3')?.textContent?.trim() || '';
          const table = item.querySelector('table');
          
          if (!table) {
            return { areaName, slots: [] };
          }

          // テーブルの各行（時間帯）を処理
          const rows = Array.from(table.querySelectorAll('tbody tr'));
          const slots = rows.slice(1).map(row => { // 最初の行はヘッダーなのでスキップ
            const cells = Array.from(row.querySelectorAll('td'));
            return {
              timeRange: cells[0]?.textContent?.trim() || '',
              user: cells[1]?.textContent?.trim() || '',
              purpose: cells[2]?.textContent?.trim() || '',
            };
          });

          return { areaName, slots };
        });
      }, facility.name);

      if (!facilitySchedule) {
        console.error(`施設「${facility.name}」の予定が見つかりませんでした`);
        return [];
      }

      // 本日の日付のデータとして返す
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // facilityScheduleを AvailabilityData 形式に変換
      const slots: TimeSlot[] = [];
      
      for (const area of facilitySchedule) {
        for (const slot of area.slots) {
          // 時間範囲をパース（例: "9:00～13:00"）
          const timeMatch = slot.timeRange.match(/(\d+):(\d+)～(\d+):(\d+)/);
          if (!timeMatch) continue;

          const startHour = parseInt(timeMatch[1]);
          const startMinute = parseInt(timeMatch[2]);
          const endHour = parseInt(timeMatch[3]);
          const endMinute = parseInt(timeMatch[4]);

          const startTime = new Date(today);
          startTime.setHours(startHour, startMinute, 0, 0);

          const endTime = new Date(today);
          endTime.setHours(endHour, endMinute, 0, 0);

          // 利用者が「」または空の場合は空きとみなす
          const isAvailable = !slot.user || slot.user === '';

          slots.push({
            startTime,
            endTime,
            isAvailable,
            area: area.areaName,
            user: slot.user || undefined,
            purpose: slot.purpose || undefined,
          });
        }
      }

      // 時間範囲でフィルタリング
      const filteredSlots = timeRange ? filterTimeSlots(slots, timeRange) : slots;

      return [{
        date: today,
        slots: filteredSlots,
      }];

    } catch (error) {
      console.error(
        `Failed to scrape availability for ${facility.name}:`,
        error
      );
      return [];
    }
  }

}
