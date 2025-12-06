/**
 * スクレイピングAPIエンドポイント
 *
 * POST /api/scrape
 * 指定された日付と時間範囲で宇美町施設の空き状況をスクレイピングします。
 */

import { NextResponse } from 'next/server';
import type { ScrapeRequest, ScrapeResponse, ErrorResponse } from '@/lib/types/api';
import { validateSearchParams, validateTimeRange } from '@/lib/utils/validation';
import { rateLimiter } from '@/lib/scraper/rateLimiter';
import { FacilityScraper } from '@/lib/scraper';

/**
 * POSTハンドラ
 *
 * リクエストボディ:
 * - dates: ISO 8601形式の日付文字列配列
 * - timeRange: オプションの時間範囲（from, to）
 *
 * レスポンス:
 * - 200: 成功 - ScrapeResponse（facilities配列を含む）
 * - 400: バリデーションエラー - ErrorResponse
 * - 429: レート制限エラー - ErrorResponse
 * - 500: サーバーエラー - ErrorResponse
 */
export async function POST(request: Request): Promise<NextResponse<ScrapeResponse | ErrorResponse>> {
  try {
    // リクエストボディをパース
    const body: ScrapeRequest = await request.json();

    // ISO 8601文字列をDateオブジェクトに変換
    let dates: Date[];
    try {
      dates = body.dates.map((dateStr) => {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          throw new Error(`不正な日付フォーマットです: ${dateStr}`);
        }
        return date;
      });
    } catch (error) {
      const errorResponse: ErrorResponse = {
        error: 'validation',
        message: error instanceof Error ? error.message : '日付の形式が不正です',
        retryable: false,
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // 検索パラメータのバリデーション
    try {
      validateSearchParams(dates);
      validateTimeRange(body.timeRange);
    } catch (error) {
      const errorResponse: ErrorResponse = {
        error: 'validation',
        message: error instanceof Error ? error.message : '入力内容に誤りがあります。入力内容をご確認ください',
        retryable: false,
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // レート制限チェック
    try {
      await rateLimiter.checkRateLimit();
    } catch (error) {
      const errorResponse: ErrorResponse = {
        error: 'rate_limit',
        message: '前回の検索から5秒以上経過してから再度お試しください',
        retryable: true,
      };
      return NextResponse.json(errorResponse, { status: 429 });
    }

    try {
      // スクレイピング実行
      const scraper = new FacilityScraper();
      const facilities = await scraper.scrapeFacilities(dates, body.timeRange);

      const response: ScrapeResponse = {
        facilities,
      };

      return NextResponse.json(response, { status: 200 });
    } catch (scrapingError) {
      // スクレイピングエラーのカテゴリ分け
      const errorMessage =
        scrapingError instanceof Error ? scrapingError.message : String(scrapingError);

      // エラーメッセージからエラータイプを判定
      let errorType: ErrorResponse['error'] = 'scraping';
      let message = '施設情報の取得中にエラーが発生しました。しばらく経ってから再度お試しください';

      if (
        errorMessage.includes('timeout') ||
        errorMessage.includes('Navigation timeout') ||
        errorMessage.includes('タイムアウト')
      ) {
        errorType = 'timeout';
        message = '施設情報の取得がタイムアウトしました。しばらく経ってから再度お試しください';
      } else if (
        errorMessage.includes('net::') ||
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('ENOTFOUND') ||
        errorMessage.includes('ネットワーク')
      ) {
        errorType = 'network';
        message = '施設情報の取得に失敗しました。しばらく経ってから再度お試しください';
      }

      // エラーログを出力（デバッグ用）
      console.error('[Scraping Error]', errorType, errorMessage);

      const errorResponse: ErrorResponse = {
        error: errorType,
        message,
        retryable: true,
      };

      return NextResponse.json(errorResponse, { status: 500 });
    } finally {
      // リクエスト完了を通知（必ず実行）
      rateLimiter.releaseRequest();
    }
  } catch (error) {
    // 最外層のエラーハンドリング（JSONパースエラーなど）
    const errorMessage = error instanceof Error ? error.message : String(error);

    // エラーログを出力（デバッグ用、内部エラー詳細は公開しない）
    console.error('[API Error]', errorMessage);

    // JSONパースエラーの場合はバリデーションエラーとして扱う
    if (errorMessage.includes('JSON') || errorMessage.includes('Unexpected')) {
      const errorResponse: ErrorResponse = {
        error: 'validation',
        message: 'リクエストの形式が不正です',
        retryable: false,
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // その他の予期しないエラー
    const errorResponse: ErrorResponse = {
      error: 'unknown',
      message: '予期しないエラーが発生しました。しばらく経ってから再度お試しください',
      retryable: true,
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
