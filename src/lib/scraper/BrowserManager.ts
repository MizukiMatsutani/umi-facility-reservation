/**
 * グローバルブラウザインスタンス管理
 *
 * シングルトンパターンでPuppeteerブラウザを管理し、
 * リクエスト間でブラウザインスタンスを再利用します。
 */

type BrowserState = 'uninitialized' | 'initializing' | 'ready' | 'error';

interface BrowserInstance {
  browser: any;
  state: BrowserState;
  error?: Error;
  initPromise?: Promise<void>;
  lastUsed: number;
}

class BrowserManager {
  private static instance: BrowserManager;
  private browserInstance: BrowserInstance = {
    browser: null,
    state: 'uninitialized',
    lastUsed: Date.now(),
  };

  // ブラウザの自動クローズタイムアウト（10分）
  private readonly BROWSER_TIMEOUT = 10 * 60 * 1000;
  private timeoutId?: NodeJS.Timeout;

  private constructor() {
    // シングルトンなのでprivate
  }

  static getInstance(): BrowserManager {
    if (!BrowserManager.instance) {
      BrowserManager.instance = new BrowserManager();
    }
    return BrowserManager.instance;
  }

  /**
   * ブラウザの初期化状態を取得
   */
  getState(): BrowserState {
    return this.browserInstance.state;
  }

  /**
   * ブラウザを初期化（既に初期化済みの場合は既存のインスタンスを返す）
   */
  async initializeBrowser(): Promise<any> {
    // 既にready状態なら既存のブラウザを返す
    if (this.browserInstance.state === 'ready' && this.browserInstance.browser) {
      console.log('♻️  既存のブラウザインスタンスを再利用');
      this.browserInstance.lastUsed = Date.now();
      this.resetTimeout();
      return this.browserInstance.browser;
    }

    // 初期化中の場合は、その初期化処理の完了を待つ
    if (this.browserInstance.state === 'initializing' && this.browserInstance.initPromise) {
      console.log('⏳ ブラウザ初期化中... 完了を待機');
      await this.browserInstance.initPromise;
      return this.browserInstance.browser;
    }

    // エラー状態の場合は再初期化を試みる
    if (this.browserInstance.state === 'error') {
      console.log('🔄 エラー状態から再初期化を試みます');
    }

    // 新規初期化を開始
    this.browserInstance.state = 'initializing';

    const initPromise = this._initializeBrowser();
    this.browserInstance.initPromise = initPromise;

    try {
      await initPromise;
      return this.browserInstance.browser;
    } catch (error) {
      throw error;
    } finally {
      this.browserInstance.initPromise = undefined;
    }
  }

  /**
   * ブラウザの実際の初期化処理
   */
  private async _initializeBrowser(): Promise<void> {
    try {
      console.log('🚀 グローバルブラウザインスタンスを初期化中...');
      const startTime = Date.now();

      const isProduction = process.env.NODE_ENV === 'production' ||
                          process.env.RENDER === 'true' ||
                          process.env.VERCEL === '1';

      if (isProduction) {
        const chromium = await import('@sparticuz/chromium');
        const puppeteer = await import('puppeteer-core');

        const executablePath = await chromium.default.executablePath();

        this.browserInstance.browser = await puppeteer.default.launch({
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
        const puppeteer = await import('puppeteer');

        this.browserInstance.browser = await puppeteer.default.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
          ],
        });
      }

      // ブラウザのクラッシュやdisconnectを監視
      this.browserInstance.browser.on('disconnected', () => {
        console.log('⚠️  ブラウザが切断されました。次回リクエスト時に再起動します。');
        this.browserInstance.state = 'uninitialized';
        this.browserInstance.browser = null;
      });

      this.browserInstance.state = 'ready';
      this.browserInstance.lastUsed = Date.now();

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`✅ グローバルブラウザ初期化完了 (${duration}秒)`);

      // タイムアウトタイマーを設定
      this.resetTimeout();
    } catch (error) {
      console.error('❌ ブラウザ初期化エラー:', error);
      this.browserInstance.state = 'error';
      this.browserInstance.error = error as Error;
      throw error;
    }
  }

  /**
   * 新しいページ（タブ）を作成
   */
  async createPage(): Promise<any> {
    const browser = await this.initializeBrowser();
    const page = await browser.newPage();

    // ダイアログを自動的に受け入れる
    page.on('dialog', async (dialog: any) => {
      console.log('ダイアログ検出:', dialog.message());
      await dialog.accept();
    });

    // User-Agent設定
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    this.browserInstance.lastUsed = Date.now();
    this.resetTimeout();

    return page;
  }

  /**
   * バックグラウンドでブラウザを事前起動
   * エラーが発生しても無視（次回リクエスト時に再試行）
   */
  async warmup(): Promise<void> {
    if (this.browserInstance.state !== 'uninitialized') {
      console.log('ℹ️  ブラウザは既に起動済みまたは起動中です');
      return;
    }

    console.log('🔥 バックグラウンドでブラウザをウォームアップ中...');

    // エラーを無視してバックグラウンドで実行
    this.initializeBrowser().catch((error) => {
      console.error('⚠️  バックグラウンドブラウザ起動に失敗（次回リクエスト時に再試行）:', error.message);
    });
  }

  /**
   * タイムアウトタイマーをリセット
   * 一定時間使われていないブラウザは自動的にクローズ
   */
  private resetTimeout(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(async () => {
      const idleTime = Date.now() - this.browserInstance.lastUsed;
      if (idleTime >= this.BROWSER_TIMEOUT) {
        console.log('⏰ ブラウザが10分間使用されていないため、クローズします');
        await this.closeBrowser();
      }
    }, this.BROWSER_TIMEOUT);
  }

  /**
   * ブラウザを明示的にクローズ
   */
  async closeBrowser(): Promise<void> {
    if (this.browserInstance.browser) {
      try {
        await this.browserInstance.browser.close();
        console.log('✅ グローバルブラウザをクローズしました');
      } catch (error) {
        console.error('⚠️  ブラウザクローズエラー:', error);
      }
      this.browserInstance.browser = null;
      this.browserInstance.state = 'uninitialized';
    }

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }
  }

  /**
   * ブラウザの健全性チェック
   */
  async healthCheck(): Promise<boolean> {
    if (this.browserInstance.state !== 'ready' || !this.browserInstance.browser) {
      return false;
    }

    try {
      // ブラウザが応答するかテスト
      const pages = await this.browserInstance.browser.pages();
      return true;
    } catch (error) {
      console.error('⚠️  ブラウザヘルスチェック失敗:', error);
      this.browserInstance.state = 'error';
      return false;
    }
  }
}

// シングルトンインスタンスをエクスポート
export const browserManager = BrowserManager.getInstance();
