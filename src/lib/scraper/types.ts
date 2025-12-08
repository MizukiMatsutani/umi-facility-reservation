/**
 * プログレス報告のコールバック関数型
 *
 * @param step - 現在のステップ名（例: "トークン取得", "施設検索"）
 * @param progress - 進捗率（0〜100）
 * @param currentDate - 現在処理中の日付（オプション）
 */
export type ProgressCallback = (
  step: string,
  progress: number,
  currentDate?: Date
) => void;

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

  /**
   * プログレス報告用のコールバック関数
   *
   * 各処理ステップの進捗を外部に通知するために使用します
   * コールバック内でエラーが発生してもスクレイピング処理は中断されません
   *
   * @default undefined
   */
  progressCallback?: ProgressCallback;

  /**
   * 並列処理モードを使用するかどうか
   *
   * - true: 複数のブラウザコンテキストを使用して日付を並列処理
   * - false: 日付を順次処理（デフォルト）
   *
   * 注意: useDirectApi=trueの場合のみ有効です
   * 推奨並列度: 2-3（parallelDegreeで設定）
   *
   * @default false
   */
  parallelMode?: boolean;

  /**
   * 並列処理の並列度（同時実行するコンテキスト数）
   *
   * - 1: 順次実行（並列化なし）
   * - 2: 推奨設定（バランスの取れた高速化）
   * - 3: 最大推奨値（さらなる高速化、サーバー負荷に注意）
   * - 4以上: 非推奨（サーバー過負荷のリスク）
   *
   * @default 2
   */
  parallelDegree?: number;

  /**
   * バッチ間の遅延時間（ミリ秒）
   *
   * 並列処理時、各バッチの実行間に挿入する待機時間です。
   * サーバー負荷を軽減するために使用します。
   *
   * - 0: 遅延なし（非推奨、サーバー負荷が高い）
   * - 2000: 推奨設定（2秒）
   * - 5000以上: 高速化のメリットが減少
   *
   * @default 2000
   */
  batchDelay?: number;
}
