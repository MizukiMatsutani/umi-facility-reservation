/**
 * レート制限管理クラス
 *
 * スクレイピング先への負荷を軽減するため、リクエスト間隔と同時実行数を制御します。
 * シングルトンパターンで実装され、アプリケーション全体で1つのインスタンスのみが存在します。
 *
 * 制約:
 * - 最小リクエスト間隔: 5秒
 * - 同時実行リクエスト数: 1つまで
 */
export class RateLimiter {
  private static instance: RateLimiter | null = null;
  private lastRequestTime: number = 0;
  private isRequestInProgress: boolean = false;

  /**
   * 最小リクエスト間隔（ミリ秒）
   */
  private readonly MIN_INTERVAL_MS = 5000;

  /**
   * コンストラクタ（シングルトンパターン）
   */
  constructor() {
    if (RateLimiter.instance) {
      return RateLimiter.instance;
    }
    RateLimiter.instance = this;
  }

  /**
   * レート制限をチェックし、リクエストが許可されるか確認します
   *
   * @throws {Error} レート制限に違反する場合（5秒経過していない、または同時リクエスト）
   */
  async checkRateLimit(): Promise<void> {
    // 同時リクエストチェック
    if (this.isRequestInProgress) {
      throw new Error('既にリクエストが実行中です');
    }

    // 時間間隔チェック
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (this.lastRequestTime > 0 && timeSinceLastRequest < this.MIN_INTERVAL_MS) {
      throw new Error('前回のリクエストから5秒経過していません');
    }

    // リクエスト開始
    this.isRequestInProgress = true;
    this.lastRequestTime = now;
  }

  /**
   * リクエスト完了を通知します
   *
   * リクエストが完了したら必ず呼び出してください。
   * finally ブロックで呼び出すことを推奨します。
   */
  releaseRequest(): void {
    this.isRequestInProgress = false;
  }

  /**
   * シングルトンインスタンスをリセット（テスト用）
   * @internal
   */
  static resetInstance(): void {
    RateLimiter.instance = null;
  }
}

/**
 * RateLimiterのシングルトンインスタンス
 */
export const rateLimiter = new RateLimiter();
