/**
 * スクレイパー用のロガーユーティリティ
 * 環境変数 LOG_LEVEL で出力レベルを制御
 *
 * LOG_LEVEL=minimal: 最小限のログのみ（エラー、重要な進捗）
 * LOG_LEVEL=normal: 通常のログ（デフォルト）
 * LOG_LEVEL=debug: すべてのデバッグログを含む
 */

type LogLevel = 'minimal' | 'normal' | 'debug';

const LOG_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'normal';

class Logger {
  /**
   * 最小限のログ（常に表示）
   * - エラー
   * - 最終結果
   * - クリティカルな進捗
   */
  essential(message: string, ...args: any[]): void {
    console.log(message, ...args);
  }

  /**
   * 通常のログ（normalレベル以上で表示）
   * - フェーズの開始/完了
   * - 主要なステップ
   */
  info(message: string, ...args: any[]): void {
    if (LOG_LEVEL === 'normal' || LOG_LEVEL === 'debug') {
      console.log(message, ...args);
    }
  }

  /**
   * デバッグログ（debugレベルでのみ表示）
   * - 詳細な進捗
   * - 内部処理の状態
   */
  debug(message: string, ...args: any[]): void {
    if (LOG_LEVEL === 'debug') {
      console.log(message, ...args);
    }
  }

  /**
   * エラーログ（常に表示）
   */
  error(message: string, ...args: any[]): void {
    console.error(message, ...args);
  }

  /**
   * 現在のログレベルを取得
   */
  getLevel(): LogLevel {
    return LOG_LEVEL;
  }
}

export const logger = new Logger();
