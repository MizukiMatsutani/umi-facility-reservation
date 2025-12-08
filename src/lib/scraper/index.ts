/**
 * FacilityScraper - 宇美町施設予約システムのスクレイピングクラス
 *
 * Puppeteerを使用して宇美町のスポーツ施設予約システムから
 * 空き状況データを取得します。
 */

import { format } from 'date-fns';
import type {
  Facility,
  AvailabilityData,
  FacilityAvailability,
  TimeSlot,
} from '@/lib/types';
import { parseFacilities, parseAvailability } from './parser';

/**
 * 宇美町施設予約システムのスクレイピングクラス
 *
 * Puppeteerを使用してブラウザを自動操作し、施設の空き状況を取得します。
 * Render.comなどの本番環境に対応した設定でブラウザを起動します。
 */
export class FacilityScraper {
  private browser: any | null = null;

  /**
   * スクレイピング実行（メインオーケストレーションメソッド）
   *
   * @param dates - 検索対象の日付配列
   * @param timeRange - オプションの時間範囲フィルタ
   * @returns 施設ごとの空き状況データ
   */
  async scrapeFacilities(
    dates: Date[]
  ): Promise<FacilityAvailability[]> {
    try {
      console.log('🚀 スクレイピング開始: 日付ごとの繰り返しフロー');
      console.log(`📅 対象日数: ${dates.length}日`);

      await this.initBrowser();
      const page = await this.browser!.newPage();

      // ダイアログを自動的に受け入れる
      page.on('dialog', async (dialog: any) => {
        console.log('ダイアログ検出:', dialog.message());
        await dialog.accept();
      });

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // Step 1: 検索ページへナビゲート + スポーツ選択 + 検索
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      console.log('\n📍 Step 1: 検索ページへアクセス');
      await this.navigateToSearchPage(page);
      await this.selectSports(page);
      await this.searchFacilities(page);

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // Step 2: 全施設を選択して施設別空き状況ページへ遷移
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      console.log('\n📍 Step 2: 全施設を選択');
      await this.selectAllFacilitiesAndNavigate(page);

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 日付ごとにループして処理（施設×日付が10個までの制限対応）
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      const allResults: FacilityAvailability[] = [];

      for (let i = 0; i < dates.length; i++) {
        const currentDate = dates[i];
        console.log(`\n📍 [${i + 1}/${dates.length}] ${format(currentDate, 'yyyy-MM-dd')} の処理開始`);

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // Step 3: 日付を選択して時間帯別空き状況ページへ遷移
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        console.log('📍 Step 3: 日付を選択');
        await this.selectDatesOnFacilityCalendar(page, [currentDate]);

        // 日付がスキップされた場合（選択可能な施設がない）、次の日付へ
        const currentUrl = page.url();
        if (!currentUrl.includes('WgR_JikantaibetsuAkiJoukyou')) {
          console.log('⏭️  この日付はスキップされました。次の日付へ進みます');
          continue;
        }

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // Step 4: 時間帯別空き状況データを一括取得
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        console.log('📍 Step 4: 時間帯別空き状況を取得');
        const results = await this.scrapeTimeSlots(page, [currentDate]);

        // 結果を蓄積
        allResults.push(...results);

        // 最後の日付でなければ、施設別空き状況ページに戻る
        if (i < dates.length - 1) {
          console.log('📍 施設別空き状況ページに戻る');
          await this.goBackToFacilityCalendar(page);
        }
      }

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 同じ施設の複数日のデータをマージ
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      console.log('\n📍 複数日のデータをマージ中...');
      const mergedResults = this.mergeFacilityData(allResults);

      console.log(`\n✅ スクレイピング完了: ${mergedResults.length}施設`);
      return mergedResults;
    } catch (error) {
      if (error instanceof Error) {
        console.error('❌ スクレイピングエラー:', error.message);
        throw new Error(`スクレイピングに失敗しました: ${error.message}`);
      }
      throw new Error('スクレイピングに失敗しました');
    } finally {
      // ブラウザは必ずクリーンアップ
      console.log('\n🧹 ブラウザをクリーンアップ中...');
      await this.closeBrowser();
      console.log('✅ クリーンアップ完了');
    }
  }

  /**
   * Puppeteerブラウザの初期化
   *
   * 本番環境（Render.comなど）に対応した設定でブラウザを起動します。
   * --no-sandbox と --disable-setuid-sandbox はサーバーレス環境で必要な設定です。
   */
  async initBrowser(): Promise<void> {
    // 本番環境（Render.com等）では@sparticuz/chromiumを使用
    const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

    if (isProduction) {
      const chromium = await import('@sparticuz/chromium');
      const puppeteer = await import('puppeteer-core');

      // Brotli圧縮ファイルの問題を回避するため、リモートからChromiumをダウンロード
      const executablePath = await chromium.default.executablePath();

      this.browser = await puppeteer.default.launch({
        args: [
          ...chromium.default.args,
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--disable-setuid-sandbox',
          '--no-sandbox',
          '--single-process',
        ],
        defaultViewport: chromium.default.defaultViewport,
        executablePath,
        headless: chromium.default.headless,
      });
    } else {
      // ローカル環境では通常のpuppeteerを使用
      const puppeteer = await import('puppeteer');

      this.browser = await puppeteer.default.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });
    }
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
  async navigateToSearchPage(page: any): Promise<void> {
    // User-Agent設定（一般的なブラウザとして認識させる）
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // 検索ページへ移動（リトライ機能付き）
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📍 検索ページへアクセス中... (試行 ${attempt}/${maxRetries})`);

        await page.goto('https://www.11489.jp/Umi/web/Home/WgR_ModeSelect', {
          waitUntil: 'domcontentloaded',
          timeout: 30000,
        });

        console.log('✅ 検索ページへのアクセス成功');
        return; // 成功したら終了
      } catch (error) {
        lastError = error as Error;
        console.log(`⚠️ 試行 ${attempt} 失敗: ${lastError.message}`);

        if (attempt < maxRetries) {
          // リトライ前に2秒待機
          console.log('⏳ 2秒後にリトライします...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    // すべてのリトライが失敗した場合
    throw new Error(`検索ページへのアクセスに失敗しました（${maxRetries}回試行）: ${lastError?.message}`);
  }

  /**
   * スポーツ種目の選択（バスケットボール、ミニバスケットボール）
   *
   * @param page - Puppeteerページインスタンス
   */
  async selectSports(page: any): Promise<void> {
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
        timeout: 30000,
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
        { timeout: 30000 }
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
  async searchFacilities(page: any): Promise<void> {
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
  async selectAllFacilities(page: any): Promise<Facility[]> {
    try {
      // 施設一覧テーブルが表示されるまで待機
      await page.waitForSelector('table#shisetsu', { timeout: 30000 });

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
   * 全施設を選択して施設別空き状況ページへ遷移
   * 
   * Step 2 → Step 3 への遷移を実行します。
   * 
   * @param page Puppeteerページオブジェクト
   * @throws {Error} 施設が見つからない場合、選択に失敗した場合
   * 
   * @design
   * - labelをクリックすることで確実にチェックボックスを選択
   * - checkbox.checked = true は動作しないため使用しない
   * - DOM更新を待機（500ms）
   * - 選択状態を検証
   * 
   * @see docs/design/scraping-flow-design.md (Step 2)
   */
  async selectAllFacilitiesAndNavigate(page: any): Promise<void> {
    try {
      console.log('📍 全施設を選択中...');

      // 施設チェックボックスが表示されるまで待機
      await page.waitForSelector('.shisetsu input[type="checkbox"][name="checkShisetsu"]', {
        timeout: 30000,
      });

      // 全施設のチェックボックスを取得して選択
      await page.evaluate(() => {
        const checkboxes = Array.from(
          document.querySelectorAll(
            '.shisetsu input[type="checkbox"][name="checkShisetsu"]'
          )
        ) as HTMLInputElement[];

        checkboxes.forEach((checkbox) => {
          // labelをクリックすることで確実に選択
          // checkbox.checked = true は動作しないため使用しない
          const label = document.querySelector(
            `label[for="${checkbox.id}"]`
          ) as HTMLElement;

          if (label) {
            label.click();
          }
        });
      });

      // DOM更新を待機
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 選択状態の確認
      const selectedCount = await page.evaluate(() => {
        const checkboxes = Array.from(
          document.querySelectorAll(
            '.shisetsu input[type="checkbox"][name="checkShisetsu"]'
          )
        ) as HTMLInputElement[];

        return checkboxes.filter((cb) => cb.checked).length;
      });

      if (selectedCount === 0) {
        throw new Error('施設の選択に失敗しました');
      }

      console.log(`✅ ${selectedCount}件の施設を選択しました`);

      // 「次へ進む」ボタンをクリック
      console.log('📍 施設別空き状況ページへ遷移中...');

      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }),
        page.click('.navbar .next > a'),
      ]);

      // URLの確認
      const currentUrl = page.url();
      if (!currentUrl.includes('WgR_ShisetsubetsuAkiJoukyou')) {
        throw new Error(`予期しないページに遷移しました: ${currentUrl}`);
      }

      console.log('✅ 施設別空き状況ページへ遷移完了');
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`施設選択とナビゲーションに失敗しました: ${error.message}`);
      }
      throw new Error('施設選択とナビゲーションに失敗しました');
    }
  }

  /**
   * 施設別空き状況ページで日付を選択して時間帯別空き状況ページへ遷移
   *
   * Step 3 → Step 4 への遷移を実行します。
   *
   * @param page Puppeteerページオブジェクト
   * @param dates 取得対象の日付配列（最大10日）
   * @throws {Error} 日付が10日を超える場合、日付選択に失敗した場合
   *
   * @design
   * - 検索日の最初の日から1ヶ月の表示期間に設定
   * - 日付をYYYYMMDD形式に変換
   * - checkbox.valueの最初の8文字でマッチング
   * - ○（空きあり）または△（一部空き）のみ選択
   * - 最大10日までの制限を検証
   * - labelをクリックして選択
   *
   * @see docs/design/scraping-flow-design.md (Step 3)
   */
  async selectDatesOnFacilityCalendar(page: any, dates: Date[]): Promise<void> {
    try {
      console.log('📍 施設別空き状況ページで日付を選択中...');

      // 日付数の検証
      if (dates.length > 10) {
        throw new Error('最大10日まで選択可能です');
      }

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 表示期間を1ヶ月に設定（検索日の最初の日から）
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      console.log('📍 表示期間を1ヶ月に設定中...');

      // 検索日の最初の日を取得
      const firstDate = dates[0];
      const startDateStr = format(firstDate, 'yyyy/MM/dd');

      // 表示開始日を設定
      await page.evaluate((dateStr: string) => {
        const startDateInput = document.querySelector('#dpStartDate') as HTMLInputElement;
        if (startDateInput) {
          startDateInput.value = dateStr;
        }
      }, startDateStr);

      // 表示期間を1ヶ月に設定
      await page.evaluate(() => {
        const radio1Month = document.querySelector('#radioPeriod1month') as HTMLInputElement;
        if (radio1Month) {
          radio1Month.checked = true;
        }
      });

      // 表示ボタンをクリック（AJAXリクエストでページを更新）
      await page.click('#btnHyoji');

      // AJAX更新完了を待機（チェックボックスが再表示されるまで）
      // NOTE: この操作はページ全体の遷移ではなく、AJAX更新のため waitForNavigation は使用しない
      console.log('⏳ AJAX更新を待機中...');

      // 古いチェックボックスが削除され、新しいチェックボックスが表示されるまで待つ
      await page.waitForFunction(
        () => {
          const checkboxes = document.querySelectorAll('input[type="checkbox"][name="checkdate"]');
          return checkboxes.length > 0;
        },
        { timeout: 60000 }
      );

      // さらにDOM更新が完全に終わるまで少し待機
      await new Promise((resolve) => setTimeout(resolve, 2000));

      console.log('✅ 表示期間を1ヶ月に設定完了');

      // デバッグ用スクリーンショットは本番環境では無効化（read-only file system対策）
      // await page.screenshot({ path: 'debug-phase2-calendar.png', fullPage: true });
      // console.log('📸 Phase 2のスクリーンショットを保存しました');

      // 対象日付をYYYYMMDD形式に変換
      const targetDateStrings = dates.map((date) => format(date, 'yyyyMMdd'));
      console.log('🎯 選択対象の日付:', targetDateStrings);

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // 既存の選択をクリア（戻るボタンで戻った場合に前回の選択が残っているため）
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      console.log('📍 既存の日付選択をクリア中...');
      await page.evaluate(() => {
        const checkboxes = Array.from(
          document.querySelectorAll('input[type="checkbox"][name="checkdate"]')
        ) as HTMLInputElement[];

        checkboxes.forEach((checkbox) => {
          // チェックボックスがチェックされている場合、labelをクリックして解除
          if (checkbox.checked) {
            const label = document.querySelector(
              `label[for="${checkbox.id}"]`
            ) as HTMLElement;
            if (label) {
              label.click();
            }
          }
        });
      });

      // DOM更新を待機
      await new Promise((resolve) => setTimeout(resolve, 500));

      console.log('✅ 既存の選択をクリア完了');

      // デバッグ: 利用可能な日付チェックボックスを確認
      const availableDates = await page.evaluate(() => {
        const checkboxes = Array.from(
          document.querySelectorAll('input[type="checkbox"][name="checkdate"]')
        ) as HTMLInputElement[];

        return checkboxes.map((checkbox) => {
          const checkboxDate = checkbox.value.substring(0, 8);
          const label = document.querySelector(`label[for="${checkbox.id}"]`);
          const status = label?.textContent?.trim() || '';

          return {
            date: checkboxDate,
            status: status,
            value: checkbox.value,
            id: checkbox.id,
            checked: checkbox.checked,
          };
        });
      });

      console.log('📅 利用可能な日付チェックボックス:', JSON.stringify(availableDates, null, 2));

      // 日付を選択（全施設×日付の組み合わせを選択）
      const result = await page.evaluate((targetDates: string[]) => {
        const checkboxes = Array.from(
          document.querySelectorAll('input[type="checkbox"][name="checkdate"]')
        ) as HTMLInputElement[];

        let count = 0;
        const selectedDates: string[] = [];

        checkboxes.forEach((checkbox) => {
          // valueの最初の8文字が日付（YYYYMMDD）
          const checkboxDate = checkbox.value.substring(0, 8);

          if (targetDates.includes(checkboxDate)) {
            // 対応するlabelを取得
            const label = document.querySelector(
              `label[for="${checkbox.id}"]`
            ) as HTMLElement;

            if (label) {
              const status = label.textContent?.trim();

              // ○（空きあり）、△（一部空き）、－（当日など）を選択
              // ×（空きなし）、休（休館日）は選択しない
              // 注: －は当日の場合に表示されるが、選択可能で空き状況が見られる
              if (status === '○' || status === '△' || status === '－') {
                // チェックボックスが選択されていない場合のみクリック
                if (!checkbox.checked) {
                  label.click();
                  count++;
                  selectedDates.push(checkboxDate);
                }
              }
            }
          }
        });

        return { count, selectedDates };
      }, targetDateStrings);

      console.log('✅ 選択された日付:', result.selectedDates);
      console.log(`✅ ${result.count}個のチェックボックスを選択しました`);

      if (result.count === 0) {
        console.log('⚠️  この日付は選択可能な施設がありません（全て×、－、または休の可能性があります）');
        console.log('⏭️  この日付をスキップして次の日付へ進みます');
        return; // この日付はスキップして次へ
      }

      // DOM更新を待機
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 「次へ進む」ボタンをクリック
      console.log('📍 時間帯別空き状況ページへ遷移中...');

      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }),
        page.click('.navbar .next > a'),
      ]);

      // URLの確認
      const currentUrl = page.url();
      if (!currentUrl.includes('WgR_JikantaibetsuAkiJoukyou')) {
        throw new Error(`予期しないページに遷移しました: ${currentUrl}`);
      }

      console.log('✅ 時間帯別空き状況ページへ遷移完了');
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`日付選択とナビゲーションに失敗しました: ${error.message}`);
      }
      throw new Error('日付選択とナビゲーションに失敗しました');
    }
  }

  /**
   * 時間帯別空き状況ページから施設別空き状況ページに戻る
   *
   * Step 4 → Step 3 への戻る操作を実行します。
   *
   * @param page Puppeteerページオブジェクト
   * @throws {Error} 戻る操作に失敗した場合
   *
   * @design
   * - 時間帯別空き状況ページの「前に戻る」ボタン（.navbar .prev a）をクリック
   * - 施設別空き状況ページ（WgR_ShisetsubetsuAkiJoukyou）への遷移を待機
   * - URLを検証して正しいページに戻ったことを確認
   *
   * @note
   * ブラウザバックは使用せず、ページ内の「前に戻る」ボタンを使用します。
   * これにより、セッション状態が保持され、次の日付選択が可能になります。
   */
  async goBackToFacilityCalendar(page: any): Promise<void> {
    try {
      console.log('📍 時間帯別空き状況ページから施設別空き状況ページへ戻る...');

      // 「前に戻る」ボタンをクリック
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }),
        page.click('.navbar .prev > a'),
      ]);

      // URLの確認
      const currentUrl = page.url();
      if (!currentUrl.includes('WgR_ShisetsubetsuAkiJoukyou')) {
        throw new Error(`予期しないページに遷移しました: ${currentUrl}`);
      }

      console.log('✅ 施設別空き状況ページへ戻りました');
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`施設別空き状況ページへの戻る操作に失敗しました: ${error.message}`);
      }
      throw new Error('施設別空き状況ページへの戻る操作に失敗しました');
    }
  }

  /**
   * 複数日のスクレイピング結果をマージ
   *
   * 日付ごとに取得した同じ施設のデータを1つにまとめます。
   *
   * @param results 日付ごとのスクレイピング結果
   * @returns マージされた施設ごとの空き状況データ
   *
   * @design
   * - 施設名をキーにして同じ施設のデータをグループ化
   * - 各施設の availability 配列に全日付のデータを結合
   * - 日付順にソート
   */
  private mergeFacilityData(results: FacilityAvailability[]): FacilityAvailability[] {
    const facilityMap = new Map<string, AvailabilityData[]>();

    results.forEach((result) => {
      const facilityName = result.facility.name;

      if (!facilityMap.has(facilityName)) {
        // 初めて見る施設の場合、新しい配列を作成
        facilityMap.set(facilityName, [...result.availability]);
      } else {
        // 既に存在する施設の場合、availability を結合
        const existing = facilityMap.get(facilityName)!;
        existing.push(...result.availability);
      }
    });

    // 各施設の availability を日付順にソートして新しいオブジェクトを作成
    const mergedResults = Array.from(facilityMap.entries()).map(([facilityName, availability]) => {
      // 日付順にソート
      const sortedAvailability = availability.sort((a, b) => a.date.getTime() - b.date.getTime());

      // 元の結果から施設情報を取得
      const originalResult = results.find(r => r.facility.name === facilityName)!;

      return {
        facility: originalResult.facility,
        availability: sortedAvailability,
      };
    });

    return mergedResults;
  }

  /**
   * 時間帯別空き状況ページから全施設の空き状況を一括取得
   * 
   * Step 4 のデータ取得を実行します。
   * 
   * @param page Puppeteerページオブジェクト
   * @param dates 取得対象の日付配列（選択した日付と同じ）
   * @returns 全施設の空き状況データ
   * @throws {Error} データ取得に失敗した場合
   * 
   * @design
   * - 各施設のカレンダーテーブル（.item .calendar）をパース
   * - 施設名は .item h3 から取得
   * - コート名は tr .shisetsu から取得
   * - 時間帯は8:30開始、30分刻みでindex計算
   * - ○ = available: true、その他 = available: false
   * 
   * @see docs/design/scraping-flow-design.md (Step 4)
   */
  async scrapeTimeSlots(page: any, dates: Date[]): Promise<FacilityAvailability[]> {
    try {
      console.log('📍 時間帯別空き状況データを取得中...');

      // カレンダーが表示されるまで待機
      await page.waitForSelector('.item .calendar', { timeout: 30000 });

      // 全施設のデータを取得
      const facilitiesData = await page.evaluate((targetDates: string[]) => {
        const items = Array.from(document.querySelectorAll('.item'));

        return items.map((item) => {
          // 施設名を取得
          const facilityNameElement = item.querySelector('h3');
          const facilityName = facilityNameElement?.textContent?.trim() || '';

          // この施設内のすべてのカレンダーテーブルを取得
          const calendars = Array.from(item.querySelectorAll('.calendar')) as HTMLTableElement[];

          // 各カレンダーからデータを抽出
          const dateAvailability = calendars.map((calendar) => {
            // 日付ヘッダーから日付を取得
            const dateHeader = calendar.querySelector('thead th.shisetsu');
            const dateText = dateHeader?.textContent?.trim() || '';
            
            // "2025年12月10日(水)" のような形式から日付を抽出
            const dateMatch = dateText.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
            if (!dateMatch) {
              return null;
            }

            const [_, year, month, day] = dateMatch;
            const dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

            // この日付が対象日付に含まれているか確認
            if (!targetDates.includes(dateStr)) {
              return null;
            }

            // 時間帯のヘッダーを取得（"8:30～9:00"のような形式）
            const timeHeaders = Array.from(
              calendar.querySelectorAll('thead th')
            ).slice(2); // 最初の2つは「日付」と「定員」なのでスキップ

            // tbody の行を取得（各行が1つのコートまたは区分）
            const rows = Array.from(calendar.querySelectorAll('tbody tr'));

            // 各行のコート名を取得
            const courtNames = rows.map((row) => {
              const firstCell = row.querySelector('td.shisetsu');
              return firstCell?.textContent?.trim() || '';
            });

            // 時間帯データを取得（コートごとの詳細情報を含む）
            const slots = timeHeaders.map((th, timeIndex) => {
              const timeText = th.textContent?.trim() || '';
              // "8:30～9:00" を "8:30-9:00" に変換
              const time = timeText.replace('～', '-').replace(/\s/g, '');

              // 各コートの空き状況を取得
              const courts = rows.map((row, rowIndex) => {
                const cells = Array.from(row.querySelectorAll('td'));
                // 最初の2つは施設名と定員なのでスキップ
                const cell = cells[timeIndex + 2];
                const label = cell?.querySelector('label');
                const status = label?.textContent?.trim() || '';
                
                return {
                  name: courtNames[rowIndex],
                  available: status === '○',
                };
              });

              // 空き状況を判定
              const availableCourts = courts.filter(c => c.available).length;
              const totalCourts = courts.length;
              
              let availabilityStatus: 'all-available' | 'partially-available' | 'unavailable';
              if (availableCourts === 0) {
                availabilityStatus = 'unavailable';
              } else if (availableCourts === totalCourts) {
                availabilityStatus = 'all-available';
              } else {
                availabilityStatus = 'partially-available';
              }

              return {
                time,
                available: availableCourts > 0,
                status: availabilityStatus,
                courts,
              };
            });

            return {
              date: dateStr,
              slots,
            };
          }).filter(Boolean);

          return {
            facilityName,
            dateAvailability,
          };
        }).filter(Boolean);
      }, dates.map((d) => format(d, 'yyyy-MM-dd')));

      // データを FacilityAvailability[] 形式に変換
      // 同じ施設・同じ日付のデータをマージ
      const results: FacilityAvailability[] = facilitiesData
        .filter((data: any): data is NonNullable<typeof data> => data !== null)
        .map((data: any, index: number) => {
          const facility: Facility = {
            id: `facility-${index}`,
            name: data.facilityName,
            type: 'basketball',
          };

          // 日付ごとにデータをグループ化してマージ
          const dateMap = new Map<string, any>();
          
          data.dateAvailability
            .filter((d: any): d is NonNullable<typeof d> => d !== null)
            .forEach((dateData: any) => {
              const dateKey = dateData.date;
              
              if (!dateMap.has(dateKey)) {
                // 初めて見る日付の場合
                dateMap.set(dateKey, dateData);
              } else {
                // 既に存在する日付の場合、コート情報をマージ
                const existing = dateMap.get(dateKey);
                existing.slots = existing.slots.map((slot: any, i: number) => {
                  const newSlot = dateData.slots[i];
                  if (!newSlot) return slot;

                  // 両方のコート配列を結合
                  const mergedCourts = [...slot.courts, ...newSlot.courts];
                  
                  // 空き状況を再計算
                  const availableCourts = mergedCourts.filter((c: any) => c.available).length;
                  const totalCourts = mergedCourts.length;
                  
                  let status: 'all-available' | 'partially-available' | 'unavailable';
                  if (availableCourts === 0) {
                    status = 'unavailable';
                  } else if (availableCourts === totalCourts) {
                    status = 'all-available';
                  } else {
                    status = 'partially-available';
                  }

                  return {
                    time: slot.time,
                    available: availableCourts > 0,
                    status,
                    courts: mergedCourts,
                  };
                });
              }
            });

          // Mapから配列に変換
          const availability: AvailabilityData[] = Array.from(dateMap.values()).map((dateData) => ({
            date: new Date(dateData.date),
            slots: dateData.slots,
          }));

          return {
            facility,
            availability,
          };
        });

      console.log(`✅ ${results.length}施設のデータを取得しました`);

      // 詳細ログ: 各施設のデータ内容を確認
      results.forEach((result, i) => {
        const totalSlots = result.availability.reduce((sum, avail) => sum + avail.slots.length, 0);
        const availableSlots = result.availability.reduce(
          (sum, avail) => sum + avail.slots.filter((s) => s.available).length,
          0
        );
        console.log(
          `📊 施設${i + 1} (${result.facility.name}): 日付数=${result.availability.length}, 総時間帯数=${totalSlots}, 空き=${availableSlots}`
        );
      });

      return results;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`時間帯別空き状況の取得に失敗しました: ${error.message}`);
      }
      throw new Error('時間帯別空き状況の取得に失敗しました');
    }
  }

}
