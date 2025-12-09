/**
 * スクレイピングAPIエンドポイント
 *
 * POST /api/scrape
 * 指定された日付で宇美町施設の空き状況をスクレイピングします。
 *
 * クエリパラメータ:
 * - stream=true: Server-Sent Events (SSE) でプログレス情報をストリーミング
 */

import { NextResponse } from 'next/server';
import type { ScrapeRequest, ScrapeResponse, ErrorResponse } from '@/lib/types/api';
import { validateSearchParams } from '@/lib/utils/validation';
import { rateLimiter } from '@/lib/scraper/rateLimiter';
import { FacilityScraper } from '@/lib/scraper';

/**
 * GETハンドラ（SSEストリーミング専用）
 *
 * クエリパラメータ:
 * - stream: "true" （必須）
 * - dates: カンマ区切りの日付文字列（YYYY-MM-DD形式）
 *
 * レスポンス:
 * - 200: SSEストリーム
 * - 400: バリデーションエラー - ErrorResponse
 * - 429: レート制限エラー - ErrorResponse
 */
export async function GET(request: Request): Promise<Response> {
  return handleRequest(request, true);
}

/**
 * POSTハンドラ
 *
 * リクエストボディ:
 * - dates: ISO 8601形式の日付文字列配列
 *
 * レスポンス:
 * - 200: 成功 - ScrapeResponse（facilities配列を含む）またはSSEストリーム
 * - 400: バリデーションエラー - ErrorResponse
 * - 429: レート制限エラー - ErrorResponse
 * - 500: サーバーエラー - ErrorResponse
 */
export async function POST(request: Request): Promise<NextResponse<ScrapeResponse | ErrorResponse> | Response> {
  return handleRequest(request, false);
}

/**
 * リクエストハンドラ（共通ロジック）
 */
async function handleRequest(request: Request, isGet: boolean): Promise<NextResponse<ScrapeResponse | ErrorResponse> | Response> {
  try {
    // クエリパラメータを確認（SSEストリーミングモードかどうか）
    const url = new URL(request.url);
    const useStreaming = url.searchParams.get('stream') === 'true';

    // リクエストボディをパース（GETリクエストまたはストリーミングモードの場合はクエリパラメータから取得）
    let body: ScrapeRequest;
    if (isGet || useStreaming) {
      const datesParam = url.searchParams.get('dates');
      if (!datesParam) {
        const errorResponse: ErrorResponse = {
          error: 'validation',
          message: '日付が指定されていません',
          retryable: false,
        };
        return NextResponse.json(errorResponse, { status: 400 });
      }
      body = {
        dates: datesParam.split(','),
      };
    } else {
      body = await request.json();
    }

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
      // SSEストリーミングモードの場合
      if (useStreaming) {
        // Server-Sent Events用のストリームを作成
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            try {
              // プログレスコールバックを定義
              const progressCallback = (step: string, progress: number, currentDate?: Date) => {
                const data = JSON.stringify({
                  type: 'progress',
                  step,
                  progress,
                  currentDate: currentDate?.toISOString(),
                });
                const message = `data: ${data}\n\n`;
                controller.enqueue(encoder.encode(message));
              };

              // 部分結果コールバックを定義
              const partialResultCallback = (date: string, facilities: any[]) => {
                console.log(`📤 [SSE] 部分結果送信: ${date}, ${facilities.length}施設`);
                const data = JSON.stringify({
                  type: 'partial-result',
                  date,
                  facilities,
                });
                const message = `data: ${data}\n\n`;
                controller.enqueue(encoder.encode(message));
                console.log(`✅ [SSE] 部分結果エンキュー完了: ${date}`);
              };

              // スクレイパーを実行
              console.log('🔍 [API] スクレイパー初期化: partialResultCallback設定済み');
              const scraper = new FacilityScraper({
                progressCallback,
                partialResultCallback,
                reportProgress: true,
              });
              console.log('🚀 [API] スクレイピング開始');
              const facilities = await scraper.scrapeFacilities(dates);
              console.log(`✅ [API] スクレイピング完了: ${facilities.length}施設`);

              // 最終結果を送信
              const resultData = JSON.stringify({
                type: 'result',
                facilities,
              });
              controller.enqueue(encoder.encode(`data: ${resultData}\n\n`));
              controller.close();
            } catch (error) {
              // エラーをストリームで送信
              const errorData = JSON.stringify({
                type: 'error',
                message: error instanceof Error ? error.message : String(error),
              });
              controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
              controller.close();
            }
          },
        });

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });
      }

      // 通常モード：従来通りのJSON返却
      const scraper = new FacilityScraper();
      const facilities = await scraper.scrapeFacilities(dates);

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
