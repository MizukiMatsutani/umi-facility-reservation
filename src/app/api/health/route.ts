import { NextResponse } from "next/server";

/**
 * ヘルスチェックエンドポイント
 * Render.comやその他の監視サービスがアプリケーションの稼働状態を確認するために使用
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "umi-facility-reservation",
    },
    { status: 200 }
  );
}
