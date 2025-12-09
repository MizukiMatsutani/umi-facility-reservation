import type { FacilityAvailability } from '@/lib/types';

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
 * 部分結果報告のコールバック関数型
 *
 * 各日付の処理完了時に呼び出され、その日付の施設データを外部に通知します
 *
 * @param date - 処理完了した日付（YYYY-MM-DD形式）
 * @param facilities - その日付の施設空き状況データ
 */
export type PartialResultCallback = (
  date: string,
  facilities: FacilityAvailability[]
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
   * 部分結果報告用のコールバック関数
   *
   * 各日付の処理完了時に、その日付の施設データを外部に通知します
   * 段階的レンダリングなど、リアルタイムでデータを表示する際に使用します
   * コールバック内でエラーが発生してもスクレイピング処理は中断されません
   *
   * @default undefined
   */
  partialResultCallback?: PartialResultCallback;
}
