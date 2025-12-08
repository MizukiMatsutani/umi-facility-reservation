/**
 * DirectApiClient - 宇美町システムの直接API呼び出しクライアント
 *
 * UI操作を一切行わず、HTTPリクエストのみで処理を行う最適化されたクライアント。
 * 調査により発見した4ステップPOSTフローを実装:
 *
 * Step 1: モード選択ページ取得（CSRFトークン取得）
 * Step 2: バスケットボール検索POST（施設リスト取得）
 * Step 3: 施設選択POST（施設別空き状況ページへ遷移）
 * Step 4: 日付選択POST（時間帯別空き状況ページへ遷移）
 */

import type { Page } from 'puppeteer-core';
import type {
  FacilityAvailability,
  Facility,
  AvailabilityData,
} from '@/lib/types';
import { format } from 'date-fns';
import { ENDPOINTS } from './constants';
import * as cheerio from 'cheerio';

/**
 * 直接API呼び出しのエラークラス
 */
export class DirectApiError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'DirectApiError';
  }
}

/**
 * 直接API呼び出しクライアント
 *
 * 宇美町システムのAPIに直接POSTリクエストを送信して、
 * 中間ステップをスキップします。
 */
/**
 * 直接API呼び出しによる高速スクレイピング
 * 
 * ハイブリッドアプローチ:
 * - Step 1-2: レガシーモードのロジックを使用（施設検索まで）
 * - Step 3-4: 既存のメソッドを活用（日付選択と空き状況取得）
 */
export class DirectApiClient {
  private browser: any;
  private page: any;

  constructor() {
    this.browser = null;
    this.page = null;
  }

  /**
   * ブラウザを初期化
   */
  async initBrowser(): Promise<void> {
    const puppeteer = await import('puppeteer');
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    this.page = await this.browser.newPage();

    // ダイアログを自動的に受け入れる
    this.page.on('dialog', async (dialog: any) => {
      console.log('ダイアログ検出:', dialog.message());
      await dialog.accept();
    });

    // User-Agent設定
    await this.page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
  }

  /**
   * ブラウザをクリーンアップ
   */
  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  /**
   * Step 1: 検索ページへナビゲート（レガシーモード）
   */
  private async navigateToSearchPage(): Promise<void> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📍 Step 1: 検索ページへアクセス中... (試行 ${attempt}/${maxRetries})`);

        await this.page.goto('https://www.11489.jp/Umi/web/Home/WgR_ModeSelect', {
          waitUntil: 'domcontentloaded',
          timeout: 30000,
        });

        console.log('✅ 検索ページへのアクセス成功');
        return;
      } catch (error) {
        lastError = error as Error;
        console.log(`⚠️ 試行 ${attempt} 失敗: ${lastError.message}`);

        if (attempt < maxRetries) {
          console.log('⏳ 2秒後にリトライします...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    throw new Error(`検索ページへのアクセスに失敗しました（${maxRetries}回試行）: ${lastError?.message}`);
  }

  /**
   * Step 2a: スポーツ選択（レガシーモード）
   */
  private async selectSports(): Promise<void> {
    try {
      console.log('📍 Step 2a: スポーツ種目を選択中...');

      // 屋内スポーツのラジオボタンを選択
      await this.page.evaluate(() => {
        const radio = document.querySelector('#radioPurposeLarge02') as HTMLInputElement;
        if (radio) {
          radio.checked = true;
          radio.click();
        } else {
          throw new Error('屋内スポーツのラジオボタンが見つかりません');
        }
      });

      // AJAXでスポーツ種目が読み込まれるまで待機
      await this.page.waitForSelector('#checkPurposeMiddle505', {
        timeout: 30000,
      });

      // 要素が実際に表示されるまで待機
      await this.page.waitForFunction(
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
      await this.page.evaluate(() => {
        const checkbox505 = document.querySelector('#checkPurposeMiddle505') as HTMLInputElement;
        const checkbox510 = document.querySelector('#checkPurposeMiddle510') as HTMLInputElement;

        if (!checkbox505 || !checkbox510) {
          throw new Error('バスケットボールのチェックボックスが見つかりません');
        }

        checkbox505.checked = true;
        checkbox510.checked = true;

        // changeイベントを発火
        const changeEvent = new Event('change', { bubbles: true });
        checkbox505.dispatchEvent(changeEvent);
        checkbox510.dispatchEvent(changeEvent);

        // clickイベントも発火
        const clickEvent = new Event('click', { bubbles: true });
        checkbox505.dispatchEvent(clickEvent);
        checkbox510.dispatchEvent(clickEvent);
      });

      // 選択が反映されるまで待機
      await new Promise(resolve => setTimeout(resolve, 500));

      // 選択されたことを確認
      const isSelected = await this.page.evaluate(() => {
        const checkbox505 = document.querySelector('#checkPurposeMiddle505') as HTMLInputElement;
        const checkbox510 = document.querySelector('#checkPurposeMiddle510') as HTMLInputElement;
        return checkbox505?.checked && checkbox510?.checked;
      });

      if (!isSelected) {
        throw new Error('チェックボックスの選択に失敗しました');
      }

      console.log('✅ スポーツ種目の選択完了');
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`スポーツ種目の選択に失敗しました: ${error.message}`);
      }
      throw new Error('スポーツ種目の選択に失敗しました');
    }
  }

  /**
   * Step 2b: 施設検索実行（レガシーモード）
   */
  private async searchFacilities(): Promise<void> {
    try {
      console.log('📍 Step 2b: 施設検索を実行中...');

      // チェックボックスが選択されているか確認
      const checkboxState = await this.page.evaluate(() => {
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

      if (checkboxState.checkboxCount === 0) {
        throw new Error('チェックボックスが選択されていません');
      }

      // ページ遷移の待機をセットアップ
      const navigationPromise = this.page.waitForNavigation({
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      // searchMokuteki()関数を直接呼び出す
      await this.page.evaluate(() => {
        if (typeof (window as any).searchMokuteki === 'function') {
          (window as any).searchMokuteki();
        } else {
          throw new Error('searchMokuteki関数が見つかりません');
        }
      });

      // ページ遷移を待つ
      await navigationPromise;

      // エラーダイアログが表示されていないか確認
      const errorMessage = await this.page.evaluate(() => {
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

      console.log('✅ 施設検索完了');
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`施設検索に失敗しました: ${error.message}`);
      }
      throw new Error('施設検索に失敗しました');
    }
  }

  /**
   * Step 2c: 全施設を選択してナビゲート（レガシーモード）
   */
  /**
   * Step 2c: 全施設を選択してナビゲート（APIモード）
   */
  private async selectAllFacilitiesAndNavigate(): Promise<void> {
    try {
      console.log('📍 Step 2c: 全施設を選択中（APIモード）...');

      // 現在のページからデータを抽出
      const pageData = await this.page.evaluate(() => {
        // CSRFトークンを取得
        const tokenInput = document.querySelector<HTMLInputElement>(
          'input[name="__RequestVerificationToken"]'
        );
        const token = tokenInput?.value || '';

        // map_* フィールドを全て取得
        const mapFields: Record<string, string> = {};
        const mapInputs = document.querySelectorAll<HTMLInputElement>(
          'input[type="hidden"][name^="map_"]'
        );
        mapInputs.forEach((input) => {
          mapFields[input.name] = input.value;
        });

        // 施設IDを全て取得
        const facilityIds: string[] = [];
        const checkboxes = document.querySelectorAll<HTMLInputElement>(
          'input[type="checkbox"][name="checkShisetsu"]'
        );
        checkboxes.forEach((checkbox) => {
          facilityIds.push(checkbox.value);
        });

        return { token, mapFields, facilityIds };
      });

      console.log(`✅ ${pageData.facilityIds.length}件の施設を検出`);

      // POSTパラメータを構築
      const formData = new URLSearchParams();
      formData.append('__RequestVerificationToken', pageData.token);
      formData.append('__EVENTTARGET', 'next');
      formData.append('__EVENTARGUMENT', '');

      // map_* フィールドを全て追加
      Object.entries(pageData.mapFields).forEach(([name, value]) => {
        formData.append(name, value);
      });

      // 全施設IDを追加
      pageData.facilityIds.forEach((id) => {
        formData.append('checkShisetsu', id);
      });

      formData.append('HyojiMode', 'filterAll');

      console.log('📍 施設別空き状況ページへPOST送信中...');

      // page.evaluate内でフォームを作成して送信
      await this.page.evaluate((formDataString: string) => {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = 'https://www.11489.jp/Umi/web/Yoyaku/WgR_ShisetsuKensaku';

        // URLSearchParamsから個々のフィールドを作成
        const params = new URLSearchParams(formDataString);
        params.forEach((value, key) => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = value;
          form.appendChild(input);
        });

        document.body.appendChild(form);
        form.submit();
      }, formData.toString());

      // ナビゲーション完了を待機
      await this.page.waitForNavigation({ 
        waitUntil: 'domcontentloaded', 
        timeout: 60000 
      });

      // URLの確認
      const currentUrl = this.page.url();
      if (!currentUrl.includes('WgR_ShisetsubetsuAkiJoukyou')) {
        throw new Error(`予期しないページに遷移しました: ${currentUrl}`);
      }

      console.log('✅ 施設別空き状況ページへ遷移完了（APIモード）');
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`施設選択とナビゲーションに失敗しました: ${error.message}`);
      }
      throw new Error('施設選択とナビゲーションに失敗しました');
    }
  }

  /**
   * メインフロー実行
   * ハイブリッドアプローチ: レガシーモードで施設検索まで実行し、
   * その後は既存のメソッドを使用
   */
  async execute(): Promise<any> {
    try {
      await this.initBrowser();

      // Step 1: 検索ページへナビゲート（レガシーモード）
      await this.navigateToSearchPage();

      // Step 2a: スポーツ選択（レガシーモード）
      await this.selectSports();

      // Step 2b: 施設検索（レガシーモード）
      await this.searchFacilities();

      // Step 2c: 全施設を選択してナビゲート（APIモード - 直接POST）
      await this.selectAllFacilitiesAndNavigate();

      // この時点で施設別空き状況ページにいる
      // pageオブジェクトを返してFacilityScraperの既存メソッドで処理を続ける
      return {
        page: this.page,
        browser: this.browser,
      };
    } catch (error) {
      await this.closeBrowser();
      throw error;
    }
  }

  /**
   * Step 3: 日付を選択して時間帯別空き状況ページへ遷移（APIモード）
   * @param targetDate 選択したい日付
   */
  async selectDateAndNavigate(targetDate: Date): Promise<void> {
    try {
      const { format } = await import('date-fns');
      const dateStr = format(targetDate, 'yyyyMMdd');
      
      console.log(`📍 Step 3: 日付を選択中（APIモード - ${format(targetDate, 'yyyy-MM-dd')}）...`);

      // 現在のページからデータを抽出
      const pageData = await this.page.evaluate((targetDateStr: string) => {
        // CSRFトークンを取得
        const tokenInput = document.querySelector<HTMLInputElement>(
          'input[name="__RequestVerificationToken"]'
        );
        const token = tokenInput?.value || '';

        // textDate（表示期間の開始日）を取得
        const textDateInput = document.querySelector<HTMLInputElement>(
          'input[name="textDate"]'
        );
        const textDate = textDateInput?.value || '';

        // 対象日付のcheckdateを全て取得
        const checkdates: string[] = [];
        const checkboxes = document.querySelectorAll<HTMLInputElement>(
          'input[type="checkbox"][name="checkdate"]'
        );
        
        checkboxes.forEach((checkbox) => {
          // value形式: "YYYYMMDD施設コード   フラグ"
          // 例: "2025120900701   0"
          if (checkbox.value.startsWith(targetDateStr)) {
            checkdates.push(checkbox.value);
          }
        });

        return { token, textDate, checkdates };
      }, dateStr);

      if (pageData.checkdates.length === 0) {
        throw new Error(`日付 ${dateStr} に対応するチェックボックスが見つかりません`);
      }

      console.log(`✅ ${pageData.checkdates.length}個の日付チェックボックスを検出`);

      // POSTパラメータを構築
      const formData = new URLSearchParams();
      formData.append('__RequestVerificationToken', pageData.token);
      formData.append('__EVENTTARGET', 'next');
      formData.append('__EVENTARGUMENT', '');
      formData.append('textDate', pageData.textDate);
      formData.append('radioPeriod', '2週間');
      formData.append('radioDisplay', 'false');
      formData.append('radioJikan', 'all');
      
      // 選択した日付のチェックボックスを全て追加
      pageData.checkdates.forEach((checkdate) => {
        formData.append('checkdate', checkdate);
      });
      
      formData.append('staydate', '');
      formData.append('hyoujiOpenCloseFlg', 'close');

      console.log('📍 時間帯別空き状況ページへPOST送信中...');

      // page.evaluate内でフォームを作成して送信
      await this.page.evaluate((formDataString: string) => {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = 'https://www.11489.jp/Umi/web/Yoyaku/WgR_ShisetsubetsuAkiJoukyou';

        // URLSearchParamsから個々のフィールドを作成
        const params = new URLSearchParams(formDataString);
        params.forEach((value, key) => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = value;
          form.appendChild(input);
        });

        document.body.appendChild(form);
        form.submit();
      }, formData.toString());

      // ナビゲーション完了を待機
      await this.page.waitForNavigation({ 
        waitUntil: 'domcontentloaded', 
        timeout: 60000 
      });

      // URLの確認
      const currentUrl = this.page.url();
      if (!currentUrl.includes('WgR_JikantaibetsuAkiJoukyou')) {
        throw new Error(`予期しないページに遷移しました: ${currentUrl}`);
      }

      console.log('✅ 時間帯別空き状況ページへ遷移完了（APIモード）');
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`日付選択とナビゲーションに失敗しました: ${error.message}`);
      }
      throw new Error('日付選択とナビゲーションに失敗しました');
    }
  }

  /**
   * ブラウザを外部から取得するためのgetter
   */
  getPage() {
    return this.page;
  }

  getBrowser() {
    return this.browser;
  }
}
