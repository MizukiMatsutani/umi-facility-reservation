/**
 * DirectApiClient 単体テスト
 *
 * Puppeteerをモック化して、各メソッドの動作を検証する
 */

import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { DirectApiClient } from '../DirectApiClient';

// Puppeteer Pageのモック型定義
interface MockPage {
  goto: Mock;
  waitForSelector: Mock;
  waitForNavigation: Mock;
  waitForFunction: Mock;
  evaluate: Mock;
  url: Mock;
  close: Mock;
}

// BrowserManagerのモック
vi.mock('../BrowserManager', () => ({
  browserManager: {
    createPage: vi.fn(),
    initializeBrowser: vi.fn(),
  },
}));

import { browserManager } from '../BrowserManager';

describe('DirectApiClient', () => {
  let client: DirectApiClient;
  let mockPage: MockPage;

  beforeEach(() => {
    // モックページオブジェクトを作成
    mockPage = {
      goto: vi.fn().mockResolvedValue(undefined),
      waitForSelector: vi.fn().mockResolvedValue(undefined),
      waitForNavigation: vi.fn().mockResolvedValue(undefined),
      waitForFunction: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn(),
      url: vi.fn().mockReturnValue(''),
      close: vi.fn().mockResolvedValue(undefined),
    };

    client = new DirectApiClient();

    // BrowserManagerのcreatePageがモックページを返すように設定
    vi.mocked(browserManager.createPage).mockResolvedValue(mockPage as any);
    vi.mocked(browserManager.initializeBrowser).mockResolvedValue({} as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initBrowser', () => {
    it('BrowserManagerからページを取得できること', async () => {
      await client.initBrowser();

      expect(browserManager.createPage).toHaveBeenCalledTimes(1);
      expect(client.getPage()).toBe(mockPage);
    });
  });

  describe('closeBrowser', () => {
    it('ページを正常にクローズできること', async () => {
      await client.initBrowser();
      await client.closeBrowser();

      expect(mockPage.close).toHaveBeenCalledTimes(1);
      expect(client.getPage()).toBeNull();
    });

    it('ページが存在しない場合でもエラーにならないこと', async () => {
      // ページを初期化せずにクローズを試みる
      await expect(client.closeBrowser()).resolves.not.toThrow();
    });

    it('ページクローズ時のエラーをキャッチすること', async () => {
      await client.initBrowser();
      mockPage.close.mockRejectedValueOnce(new Error('Close failed'));

      // エラーをキャッチして処理が継続すること
      await expect(client.closeBrowser()).resolves.not.toThrow();
      expect(client.getPage()).toBeNull();
    });
  });

  describe('execute', () => {
    it('正常なフローでページとブラウザを返すこと', async () => {
      // Step 1: 検索ページへのアクセス
      mockPage.evaluate.mockImplementation((fn: Function) => {
        // ラジオボタン選択のシミュレーション
        if (fn.toString().includes('radioPurposeLarge02')) {
          return Promise.resolve();
        }
        // チェックボックス選択のシミュレーション
        if (fn.toString().includes('checkPurposeMiddle505')) {
          return Promise.resolve();
        }
        // 選択状態確認のシミュレーション
        if (fn.toString().includes('checked')) {
          return Promise.resolve(true);
        }
        // searchMokuteki呼び出しのシミュレーション
        if (fn.toString().includes('searchMokuteki')) {
          return Promise.resolve();
        }
        // エラーダイアログチェックのシミュレーション
        if (fn.toString().includes('messageDlg')) {
          return Promise.resolve(null);
        }
        // 施設選択のデータ抽出
        if (fn.toString().includes('__RequestVerificationToken')) {
          return Promise.resolve({
            token: 'mock-token',
            mapFields: { map_test: 'value' },
            facilityIds: ['341007', '341009'],
          });
        }
        // フォーム送信
        if (fn.toString().includes('form.submit')) {
          return Promise.resolve();
        }
        return Promise.resolve({});
      });

      mockPage.url.mockReturnValue('https://www.11489.jp/Umi/web/Yoyaku/WgR_ShisetsubetsuAkiJoukyou');

      const result = await client.execute();

      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('browser');
      expect(result.page).toBe(mockPage);
    });

    it('検索ページへのアクセス失敗時にエラーをスローすること', async () => {
      mockPage.goto.mockRejectedValue(new Error('Navigation failed'));

      await expect(client.execute()).rejects.toThrow();
    });

    it('エラー発生時にブラウザをクローズすること', async () => {
      mockPage.waitForSelector.mockRejectedValue(new Error('Selector not found'));

      await expect(client.execute()).rejects.toThrow();
      expect(mockPage.close).toHaveBeenCalled();
    });
  });

  describe('selectDateAndNavigate', () => {
    beforeEach(async () => {
      await client.initBrowser();
    });

    it('指定した日付のチェックボックスを選択してナビゲートできること', async () => {
      const targetDate = new Date('2025-12-15');

      // ページデータ抽出のモック
      mockPage.evaluate.mockImplementation((fn: Function, ...args: any[]) => {
        if (fn.toString().includes('__RequestVerificationToken')) {
          return Promise.resolve({
            token: 'mock-token',
            textDate: '20251201',
            checkdates: ['2025121534100700', '2025121534100900'],
          });
        }
        // フォーム送信
        if (fn.toString().includes('form.submit')) {
          return Promise.resolve();
        }
        return Promise.resolve();
      });

      mockPage.url.mockReturnValue('https://www.11489.jp/Umi/web/Yoyaku/WgR_JikantaibetsuAkiJoukyou');

      await client.selectDateAndNavigate(targetDate);

      // waitForFunctionが呼ばれていることを確認（カレンダー表示待機）
      expect(mockPage.waitForFunction).toHaveBeenCalled();
    });

    it('対応する日付のチェックボックスがない場合にエラーをスローすること', async () => {
      const targetDate = new Date('2025-12-15');

      mockPage.evaluate.mockImplementation((fn: Function) => {
        if (fn.toString().includes('__RequestVerificationToken')) {
          // checkdatesが空の場合
          return Promise.resolve({
            token: 'mock-token',
            textDate: '20251201',
            checkdates: [],
          });
        }
        return Promise.resolve();
      });

      await expect(client.selectDateAndNavigate(targetDate)).rejects.toThrow(
        '日付 20251215 に対応するチェックボックスが見つかりません'
      );
    });

    it('予期しないページに遷移した場合にエラーをスローすること', async () => {
      const targetDate = new Date('2025-12-15');

      mockPage.evaluate.mockImplementation((fn: Function) => {
        if (fn.toString().includes('__RequestVerificationToken')) {
          return Promise.resolve({
            token: 'mock-token',
            textDate: '20251201',
            checkdates: ['2025121534100700'],
          });
        }
        if (fn.toString().includes('form.submit')) {
          return Promise.resolve();
        }
        return Promise.resolve();
      });

      // 正しくないURLを返す
      mockPage.url.mockReturnValue('https://www.11489.jp/Umi/web/Error');

      await expect(client.selectDateAndNavigate(targetDate)).rejects.toThrow(
        '予期しないページに遷移しました'
      );
    });
  });

  describe('getBrowser', () => {
    it('BrowserManagerからブラウザインスタンスを取得できること', async () => {
      const mockBrowser = { close: vi.fn() };
      vi.mocked(browserManager.initializeBrowser).mockResolvedValue(mockBrowser as any);

      const browser = await client.getBrowser();

      expect(browserManager.initializeBrowser).toHaveBeenCalled();
      expect(browser).toBe(mockBrowser);
    });
  });

  describe('エッジケース', () => {
    it('複数回initBrowserを呼び出しても問題ないこと', async () => {
      await client.initBrowser();
      await client.initBrowser();

      expect(browserManager.createPage).toHaveBeenCalledTimes(2);
    });

    it('タイムアウト時に適切なエラーをスローすること', async () => {
      mockPage.waitForSelector.mockRejectedValue(new Error('Timeout exceeded'));

      await client.initBrowser();

      // navigateToSearchPageを直接テストすることはできないため、
      // executeを通してタイムアウトエラーが発生することを確認
      await expect(client.execute()).rejects.toThrow();
    });
  });
});
