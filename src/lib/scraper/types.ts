/**
 * スクレイパーの動作を制御するオプション
 */
export interface ScraperOptions {
  /**
   * 直接API呼び出しモードを使用するかどうか
   *
   * - true: 直接API呼び出しモードを使用（デフォルト）
   * - false: レガシーモード（従来の画面遷移方式）を使用
   *
   * @default true
   */
  useDirectApi?: boolean;

  /**
   * 不要なリソース（画像、CSS、フォント）の読み込みをブロックするかどうか
   *
   * ページ遷移を高速化しますが、一部のページ機能に影響する可能性があります
   *
   * @default false
   */
  enableResourceBlocking?: boolean;

  /**
   * プログレス報告を有効にするかどうか
   *
   * 有効にすると、各処理ステップの進捗情報をコンソールに出力します
   *
   * @default false
   */
  reportProgress?: boolean;

  /**
   * 直接APIモード失敗時にレガシーモードへフォールバックするかどうか
   *
   * - true: 直接APIモードでエラーが発生した場合、レガシーモードを試行
   * - false: 直接APIモードでエラーが発生した場合、エラーをそのまま返す
   *
   * @default true
   */
  fallbackOnError?: boolean;
}
