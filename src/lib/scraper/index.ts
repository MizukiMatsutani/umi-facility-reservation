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
  TimeSlot,
} from '@/lib/types';
import { parseFacilities, parseAvailability } from './parser';

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
            id: checkbox.value,  // 施設ID（例: "341007"）
            name: label,         // 施設名（例: "宇美勤労者体育センター"）
            type: 'basketball' as const, // TODO: 施設タイプの判別ロジック
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
   * 施設を選択して日付選択ページへ遷移
   * Phase 2: 施設一覧ページ → 日付選択ページ
   *
   * @param page - Puppeteerページインスタンス
   * @param facilityId - 施設ID (例: "341007")
   */
  private async selectFacilityAndNavigate(
    page: Page,
    facilityId: string
  ): Promise<void> {
    try {
      console.log(`施設選択: ID=${facilityId}`);

      // 施設のチェックボックスを選択
      await page.evaluate((id) => {
        const checkbox = document.querySelector(
          `#checkShisetsu${id}`
        ) as HTMLInputElement;
        if (!checkbox) {
          throw new Error(`施設チェックボックスが見つかりません: checkShisetsu${id}`);
        }
        checkbox.checked = true;
        checkbox.click(); // onclickイベントを発火
      }, facilityId);

      console.log('✅ 施設を選択しました');

      // 少し待機（UIの更新を待つ）
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 「次へ進む」ボタンの存在確認
      const nextButtonExists = await page.evaluate(() => {
        const btn = document.querySelector('#btnNext') as HTMLElement;
        return {
          exists: !!btn,
          visible: btn ? window.getComputedStyle(btn).display !== 'none' : false,
        };
      });

      if (!nextButtonExists.exists) {
        throw new Error('「次へ進む」ボタンが見つかりません');
      }

      if (!nextButtonExists.visible) {
        throw new Error('「次へ進む」ボタンが表示されていません');
      }

      console.log('「次へ進む」ボタンをクリックします...');

      // ページ遷移を待機しながら「次へ進む」ボタンをクリック
      await Promise.all([
        page.waitForNavigation({
          waitUntil: 'networkidle0',
          timeout: 10000,
        }),
        page.click('#btnNext'),
      ]);

      console.log('✅ 日付選択ページへ遷移しました');
      console.log('現在のURL:', page.url());
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `施設選択とナビゲーションに失敗: ${error.message}`
        );
      }
      throw new Error('施設選択とナビゲーションに失敗しました');
    }
  }

  /**
   * 日付を選択して空き状況ページへ遷移
   * Phase 2: 日付選択ページ → 空き状況ページ
   *
   * @param page - Puppeteerページインスタンス
   * @param targetDate - 選択する日付
   */
  private async selectDateAndNavigate(
    page: Page,
    targetDate: Date
  ): Promise<void> {
    try {
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth(); // 0-indexed
      const day = targetDate.getDate();

      console.log(`日付選択: ${year}年${month + 1}月${day}日`);

      // 複数のセレクタパターンを試す
      const dateSelected = await page.evaluate(
        (y, m, d) => {
          // パターン1: data-date属性 (yyyy-mm-dd形式)
          const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          let dateElement = document.querySelector(
            `[data-date="${dateStr}"]`
          ) as HTMLElement;

          if (dateElement) {
            console.log(`日付要素を発見 (data-date): ${dateStr}`);
            dateElement.click();
            return true;
          }

          // パターン2: jQuery UI Datepicker
          dateElement = document.querySelector(
            `td[data-year="${y}"][data-month="${m}"] a[data-date="${d}"]`
          ) as HTMLElement;

          if (dateElement) {
            console.log(`日付要素を発見 (jQuery UI)`);
            dateElement.click();
            return true;
          }

          // パターン3: カスタムカレンダー (data-dateにdd形式)
          const dayStr = String(d).padStart(2, '0');
          dateElement = document.querySelector(
            `td[data-date="${dayStr}"], a[data-date="${dayStr}"]`
          ) as HTMLElement;

          if (dateElement) {
            console.log(`日付要素を発見 (day only): ${dayStr}`);
            dateElement.click();
            return true;
          }

          // パターン4: クリック可能な日付セル (textContentで検索)
          const dateCells = Array.from(
            document.querySelectorAll('td.date-cell, td.calendar-day, td[class*="day"]')
          );
          for (const cell of dateCells) {
            if (cell.textContent?.trim() === String(d)) {
              console.log(`日付要素を発見 (textContent): ${d}`);
              (cell as HTMLElement).click();
              return true;
            }
          }

          return false;
        },
        year,
        month,
        day
      );

      if (!dateSelected) {
        throw new Error(
          `日付要素が見つかりません: ${year}-${month + 1}-${day}`
        );
      }

      console.log('✅ 日付を選択しました');

      // 少し待機（UIの更新を待つ）
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 検索/次へボタンを探してクリック
      const buttonClicked = await page.evaluate(() => {
        // ボタンのパターン
        const selectors = [
          '#btnSearch',
          '#btnNext',
          'input[type="button"][value*="検索"]',
          'button[type="submit"]',
          'a.btnBlue',
        ];

        for (const selector of selectors) {
          const btn = document.querySelector(selector) as HTMLElement;
          if (btn && window.getComputedStyle(btn).display !== 'none') {
            console.log(`ボタンをクリック: ${selector}`);
            btn.click();
            return true;
          }
        }

        return false;
      });

      if (!buttonClicked) {
        // ボタンがない場合、自動遷移を待つ
        console.log('検索ボタンが見つからないため、自動遷移を待機します...');
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } else {
        // ページ遷移を待機
        await page.waitForNavigation({
          waitUntil: 'networkidle0',
          timeout: 10000,
        });
      }

      console.log('✅ 空き状況ページへ遷移しました');
      console.log('現在のURL:', page.url());
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`日付選択とナビゲーションに失敗: ${error.message}`);
      }
      throw new Error('日付選択とナビゲーションに失敗しました');
    }
  }

  /**
   * 空き状況ページから時間帯データを取得
   * Phase 2: 空き状況ページでのデータ抽出
   *
   * @param page - Puppeteerページインスタンス
   * @param targetDate - 対象日付
   * @returns 時間帯ごとの空き状況
   */
  private async scrapeAvailabilityFromPage(
    page: Page,
    targetDate: Date
  ): Promise<TimeSlot[]> {
    try {
      console.log('空き状況ページからデータを取得中...');

      // テーブルが表示されるまで待機（複数のパターンを試す）
      const tableFound = await page
        .waitForSelector('table.availability-table, table#availability, table tbody tr', {
          timeout: 5000,
        })
        .then(() => true)
        .catch(() => false);

      if (!tableFound) {
        console.log('⚠️ 時間帯テーブルが見つかりません（空きデータなし）');
        return [];
      }

      // 時間帯データをパース
      const timeSlots = await page.evaluate(() => {
        // テーブル行を取得（複数のセレクタパターンを試す）
        const rows = Array.from(
          document.querySelectorAll(
            'table.availability-table tbody tr, table#availability tbody tr, table tbody tr'
          )
        );

        if (rows.length === 0) {
          console.log('テーブル行が見つかりません');
          return [];
        }

        const slots: Array<{ time: string; available: boolean }> = [];

        for (const row of rows) {
          // 時刻セルを探す（複数のパターン）
          const timeCellSelectors = ['td.time', 'td:first-child', 'th.time'];
          let timeText = '';
          for (const selector of timeCellSelectors) {
            const cell = row.querySelector(selector);
            if (cell) {
              timeText = cell.textContent?.trim() || '';
              if (timeText) break;
            }
          }

          // ステータスセルを探す
          const statusCellSelectors = ['td.status', 'td:nth-child(2)', 'td:last-child'];
          let statusText = '';
          for (const selector of statusCellSelectors) {
            const cell = row.querySelector(selector);
            if (cell) {
              statusText = cell.textContent?.trim() || '';
              if (statusText) break;
            }
          }

          // 時刻のパース
          if (!timeText) continue;

          // "8:30 - 9:00" 形式から開始時刻を抽出
          let startTime = timeText.split('-')[0]?.trim() || '';

          // "HH:MM" 形式に正規化
          if (startTime.match(/^\d{1,2}:\d{2}$/)) {
            const [h, m] = startTime.split(':');
            startTime = `${h.padStart(2, '0')}:${m}`;
          }

          if (!startTime) continue;

          // ステータスの判定
          // ○ = 空き, △ = 一部空き (空きとして扱う), × = 空いていない, - = 対象外
          const available = statusText === '○' || statusText === '△';

          slots.push({
            time: startTime,
            available,
          });
        }

        console.log(`${slots.length}件の時間帯を取得しました`);
        return slots;
      });

      if (timeSlots.length === 0) {
        console.log('⚠️ 時間帯データが取得できませんでした');
        return [];
      }

      console.log(`✅ ${timeSlots.length}件の時間帯データを取得しました`);

      return timeSlots;
    } catch (error) {
      // エラーでも空配列を返す（施設によってはデータがない可能性）
      console.error('空き状況の取得中にエラーが発生:', error);
      return [];
    }
  }

  /**
   * ブラウザの戻るボタンで前のページに戻る
   * Phase 2: 空き状況ページ → 日付選択ページ
   *
   * @param page - Puppeteerページインスタンス
   */
  private async navigateBack(page: Page): Promise<void> {
    try {
      console.log('前のページに戻ります...');

      // ブラウザの戻るボタンを使用してナビゲーション
      await Promise.all([
        page.waitForNavigation({
          waitUntil: 'networkidle0',
          timeout: 10000,
        }),
        page.goBack(),
      ]);

      console.log('✅ 前のページに戻りました');
      console.log('現在のURL:', page.url());
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`戻るナビゲーションに失敗: ${error.message}`);
      }
      throw new Error('戻るナビゲーションに失敗しました');
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
  /**
   * Phase 2: 完全な空き状況スクレイピングフロー
   * 施設選択 → 日付選択 → 空き状況取得 → 複数日対応
   *
   * @param page - Puppeteerページインスタンス
   * @param facility - 施設情報
   * @param dates - 検索対象の日付配列
   * @param timeRange - 時間範囲フィルタ（オプション）
   * @returns 日付ごとの空き状況データ
   */
  async scrapeAvailability(
    page: Page,
    facility: Facility,
    dates: Date[],
    timeRange?: TimeRange
  ): Promise<AvailabilityData[]> {
    const results: AvailabilityData[] = [];

    try {
      console.log(`\n📋 施設「${facility.name}」の空き状況を取得します`);
      console.log(`対象日数: ${dates.length}日`);

      // Step 1: 施設を選択して日付選択ページへ遷移
      await this.selectFacilityAndNavigate(page, facility.id);

      // Step 2: 各日付に対して空き状況を取得
      for (let i = 0; i < dates.length; i++) {
        const targetDate = dates[i];
        console.log(`\n📅 日付 ${i + 1}/${dates.length}: ${targetDate.toISOString().split('T')[0]}`);

        try {
          // 日付を選択して空き状況ページへ遷移
          await this.selectDateAndNavigate(page, targetDate);

          // 空き状況データを取得
          const slots = await this.scrapeAvailabilityFromPage(page, targetDate);

          // 時間範囲でフィルタリング
          let filteredSlots = slots;
          if (timeRange) {
            console.log(`⏰ 時間範囲フィルタを適用: ${timeRange.from} 〜 ${timeRange.to}`);
            filteredSlots = slots.filter((slot) => {
              return slot.time >= timeRange.from && slot.time <= timeRange.to;
            });
            console.log(`フィルタ後: ${filteredSlots.length}件`);
          }

          // 結果を追加
          const dateObj = new Date(targetDate);
          dateObj.setHours(0, 0, 0, 0);

          results.push({
            date: dateObj,
            slots: filteredSlots,
          });

          // 最後の日付以外は日付選択ページに戻る
          if (i < dates.length - 1) {
            await this.navigateBack(page);
          }
        } catch (dateError) {
          console.error(
            `日付 ${targetDate.toISOString().split('T')[0]} の処理中にエラー:`,
            dateError
          );
          // エラーが発生しても次の日付の処理は続行
          // 空のデータを追加
          const dateObj = new Date(targetDate);
          dateObj.setHours(0, 0, 0, 0);
          results.push({
            date: dateObj,
            slots: [],
          });
        }
      }

      console.log(`\n✅ 施設「${facility.name}」の取得完了: ${results.length}日分`);
      return results;
    } catch (error) {
      console.error(
        `❌ 施設「${facility.name}」の空き状況取得に失敗:`,
        error
      );
      return [];
    }
  }

}
