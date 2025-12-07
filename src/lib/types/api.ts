/**
 * API型定義
 *
 * /api/scrape エンドポイントで使用するリクエスト/レスポンス型を定義します。
 * すべての型はdesign.mdのAPI Route定義に準拠しています。
 */

import { TimeRange, FacilityAvailability } from './index';

/**
 * スクレイピングAPIリクエスト
 *
 * POST /api/scrape のリクエストボディ形式を定義します。
 *
 * @property {string[]} dates - ISO 8601形式の日付配列（例: ["2025-12-06", "2025-12-07"]）
 */
export interface ScrapeRequest {
  dates: string[];
}

/**
 * スクレイピングAPI成功レスポンス
 *
 * POST /api/scrape の成功レスポンス（200 OK）形式を定義します。
 *
 * @property {FacilityAvailability[]} facilities - 施設ごとの空き状況データ
 */
export interface ScrapeResponse {
  facilities: FacilityAvailability[];
}

/**
 * エラータイプ
 *
 * APIで発生する可能性のあるエラーの種類を定義します。
 *
 * - `validation`: 入力バリデーションエラー（400 Bad Request）
 * - `rate_limit`: レート制限超過エラー（429 Too Many Requests）
 * - `network`: ネットワークエラー（500 Internal Server Error）
 * - `timeout`: タイムアウトエラー（500 Internal Server Error）
 * - `scraping`: スクレイピング処理エラー（500 Internal Server Error）
 * - `unknown`: 不明なエラー（500 Internal Server Error）
 */
export type ErrorType =
  | 'validation'
  | 'rate_limit'
  | 'network'
  | 'timeout'
  | 'scraping'
  | 'unknown';

/**
 * APIエラーレスポンス
 *
 * エラー発生時に返却されるレスポンス形式を定義します。
 * HTTPステータスコードと併せて使用します。
 *
 * @property {ErrorType} error - エラーの種類
 * @property {string} message - ユーザー向けエラーメッセージ（日本語）
 * @property {boolean} retryable - 再試行が可能かどうか（true = 再試行推奨）
 *
 * @example
 * // バリデーションエラーの例（400 Bad Request）
 * {
 *   error: 'validation',
 *   message: '検索対象の日付を選択してください',
 *   retryable: false
 * }
 *
 * @example
 * // レート制限エラーの例（429 Too Many Requests）
 * {
 *   error: 'rate_limit',
 *   message: '前回の検索から5秒以上経過してから再度お試しください',
 *   retryable: true
 * }
 *
 * @example
 * // ネットワークエラーの例（500 Internal Server Error）
 * {
 *   error: 'network',
 *   message: '施設情報の取得に失敗しました。しばらく経ってから再度お試しください',
 *   retryable: true
 * }
 */
export interface ErrorResponse {
  error: ErrorType;
  message: string;
  retryable: boolean;
}

/**
 * HTTPステータスコードとエラータイプのマッピング
 *
 * 各エラータイプに対応する適切なHTTPステータスコードを定義します。
 */
export const ERROR_STATUS_CODES: Record<ErrorType, number> = {
  validation: 400,      // Bad Request
  rate_limit: 429,      // Too Many Requests
  network: 500,         // Internal Server Error
  timeout: 500,         // Internal Server Error
  scraping: 500,        // Internal Server Error
  unknown: 500,         // Internal Server Error
} as const;

/**
 * エラーメッセージテンプレート
 *
 * 各エラータイプに対応するデフォルトの日本語エラーメッセージを定義します。
 */
export const ERROR_MESSAGES: Record<ErrorType, string> = {
  validation: '入力内容に誤りがあります。入力内容をご確認ください',
  rate_limit: '前回の検索から5秒以上経過してから再度お試しください',
  network: '施設情報の取得に失敗しました。しばらく経ってから再度お試しください',
  timeout: '施設情報の取得がタイムアウトしました。しばらく経ってから再度お試しください',
  scraping: '施設情報の取得中にエラーが発生しました。しばらく経ってから再度お試しください',
  unknown: '予期しないエラーが発生しました。しばらく経ってから再度お試しください',
} as const;

/**
 * エラーの再試行可能性
 *
 * 各エラータイプが再試行可能かどうかを定義します。
 */
export const ERROR_RETRYABLE: Record<ErrorType, boolean> = {
  validation: false,    // バリデーションエラーは入力修正が必要
  rate_limit: true,     // レート制限は時間経過後に再試行可能
  network: true,        // ネットワークエラーは再試行可能
  timeout: true,        // タイムアウトは再試行可能
  scraping: true,       // スクレイピングエラーは再試行可能
  unknown: true,        // 不明なエラーは再試行可能
} as const;
