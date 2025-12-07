import { NextResponse } from "next/server";

/**
 * ヘルスチェックエンドポイント
 * Render.comのヘルスチェック用
 *
 * @returns ステータス情報を含むJSONレスポンス
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "umi-facility-reservation",
      version: "0.1.0",
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    },
  );
}
