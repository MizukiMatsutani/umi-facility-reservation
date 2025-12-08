/**
 * 並列処理用ブラウザコンテキスト管理
 *
 * 複数のIncognitoブラウザコンテキストを作成・管理し、
 * 並列スクレイピング処理を実現します。
 */

import type { Browser, BrowserContext, Page } from 'puppeteer';
import { browserManager } from './BrowserManager';

interface ContextInstance {
  context: BrowserContext;
  page: Page;
  isActive: boolean;
  lastUsed: number;
}

export class ParallelBrowserManager {
  private browser: Browser | null = null;
  private contexts: ContextInstance[] = [];
  private readonly enableResourceBlocking: boolean;

  constructor(options: { enableResourceBlocking?: boolean } = {}) {
    this.enableResourceBlocking = options.enableResourceBlocking ?? true;
  }

  /**
   * ブラウザを初期化
   */
  async initBrowser(): Promise<void> {
    if (this.browser) {
      console.log('♻️  並列処理用ブラウザは既に初期化済み');
      return;
    }

    console.log('🚀 並列処理用ブラウザを初期化中...');
    this.browser = await browserManager.initializeBrowser();
    console.log('✅ 並列処理用ブラウザの初期化完了');
  }

  /**
   * 指定数のブラウザコンテキストを作成
   */
  async createContexts(count: number): Promise<void> {
    if (!this.browser) {
      throw new Error('ブラウザが初期化されていません。先にinitBrowser()を呼び出してください。');
    }

    if (count < 1 || count > 5) {
      throw new Error(`並列度は1〜5の範囲で指定してください（指定値: ${count}）`);
    }

    console.log(`🔧 ${count}個のブラウザコンテキストを作成中...`);

    const startTime = Date.now();

    for (let i = 0; i < count; i++) {
      try {
        // ブラウザコンテキストを作成（各コンテキストは独立したセッション）
        const context = await this.browser.createBrowserContext();

        // 新しいページを作成
        const page = await context.newPage();

        // リソースブロッキングを適用
        if (this.enableResourceBlocking) {
          await page.setRequestInterception(true);
          page.on('request', (request: any) => {
            const resourceType = request.resourceType();
            if (['image', 'stylesheet', 'font'].includes(resourceType)) {
              request.abort();
            } else {
              request.continue();
            }
          });
        }

        // ダイアログを自動的に受け入れる
        page.on('dialog', async (dialog: any) => {
          console.log(`[Context ${i}] ダイアログ検出:`, dialog.message());
          await dialog.accept();
        });

        // User-Agent設定
        await page.setUserAgent(
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );

        this.contexts.push({
          context,
          page,
          isActive: false,
          lastUsed: Date.now(),
        });

        console.log(`  ✓ Context ${i + 1}/${count} 作成完了`);
      } catch (error) {
        console.error(`  ✗ Context ${i + 1}/${count} 作成失敗:`, error);
        // 既に作成したコンテキストをクリーンアップ
        await this.closeAllContexts();
        throw new Error(`コンテキスト${i + 1}の作成に失敗しました: ${error}`);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ ${count}個のコンテキスト作成完了 (${duration}秒)`);
  }

  /**
   * 指定インデックスのページを取得
   */
  getPage(index: number): Page {
    if (index < 0 || index >= this.contexts.length) {
      throw new Error(
        `無効なコンテキストインデックス: ${index}（有効範囲: 0〜${this.contexts.length - 1}）`
      );
    }

    const contextInstance = this.contexts[index];
    contextInstance.isActive = true;
    contextInstance.lastUsed = Date.now();

    return contextInstance.page;
  }

  /**
   * 指定インデックスのコンテキストを取得
   */
  getContext(index: number): BrowserContext {
    if (index < 0 || index >= this.contexts.length) {
      throw new Error(
        `無効なコンテキストインデックス: ${index}（有効範囲: 0〜${this.contexts.length - 1}）`
      );
    }

    const contextInstance = this.contexts[index];
    contextInstance.isActive = true;
    contextInstance.lastUsed = Date.now();

    return contextInstance.context;
  }

  /**
   * 作成されたコンテキスト数を取得
   */
  getContextCount(): number {
    return this.contexts.length;
  }

  /**
   * すべてのコンテキストをクローズ
   */
  async closeAllContexts(): Promise<void> {
    console.log('🧹 すべてのブラウザコンテキストをクローズ中...');

    for (let i = 0; i < this.contexts.length; i++) {
      const { context, page } = this.contexts[i];
      try {
        if (page && !page.isClosed()) {
          await page.close();
        }
        await context.close();
        console.log(`  ✓ Context ${i + 1}/${this.contexts.length} クローズ完了`);
      } catch (error) {
        console.error(`  ✗ Context ${i + 1}/${this.contexts.length} クローズ失敗:`, error);
      }
    }

    this.contexts = [];
    console.log('✅ すべてのコンテキストをクローズしました');
  }

  /**
   * ブラウザをクローズ
   * 注意: browserManagerが管理するブラウザはクローズしない（他の処理で使用中の可能性があるため）
   */
  async closeBrowser(): Promise<void> {
    await this.closeAllContexts();
    this.browser = null;
    console.log('✅ 並列処理用ブラウザマネージャーをクリーンアップしました');
  }

  /**
   * すべてのコンテキストの状態をログ出力（デバッグ用）
   */
  logContextStatus(): void {
    console.log('📊 コンテキスト状態:');
    this.contexts.forEach((ctx, index) => {
      const idleTime = ((Date.now() - ctx.lastUsed) / 1000).toFixed(1);
      const status = ctx.isActive ? '🟢 アクティブ' : '⚪ 待機中';
      console.log(`  Context ${index}: ${status} (最終使用: ${idleTime}秒前)`);
    });
  }
}
