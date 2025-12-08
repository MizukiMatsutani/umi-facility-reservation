import { NextRequest, NextResponse } from 'next/server';
import type { FacilityAvailability, SearchParams } from '@/lib/types';

/**
 * 検索結果を一時的に保存するメモリキャッシュ
 * 本番環境ではRedisなどの外部ストレージを使用することを推奨
 */
interface CachedResult {
  facilities: FacilityAvailability[];
  searchParams: SearchParams;
  timestamp: number;
}

const cache = new Map<string, CachedResult>();
const CACHE_EXPIRY_MS = 10 * 60 * 1000; // 10分

/**
 * 期限切れのキャッシュをクリーンアップ
 */
function cleanupExpiredCache() {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > CACHE_EXPIRY_MS) {
      cache.delete(key);
    }
  }
}

/**
 * POST: 検索結果を保存してIDを返す
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { facilities, searchParams } = body as {
      facilities: FacilityAvailability[];
      searchParams: SearchParams;
    };

    // ランダムなIDを生成
    const id = Math.random().toString(36).substring(2, 15);

    // キャッシュに保存
    cache.set(id, {
      facilities,
      searchParams,
      timestamp: Date.now(),
    });

    // 期限切れのキャッシュをクリーンアップ
    cleanupExpiredCache();

    return NextResponse.json({ id });
  } catch (error) {
    console.error('検索結果の保存エラー:', error);
    return NextResponse.json(
      { error: 'Failed to save search results' },
      { status: 500 }
    );
  }
}

/**
 * GET: IDから検索結果を取得
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const cached = cache.get(id);

    if (!cached) {
      return NextResponse.json({ error: 'Results not found or expired' }, { status: 404 });
    }

    // 期限切れチェック
    if (Date.now() - cached.timestamp > CACHE_EXPIRY_MS) {
      cache.delete(id);
      return NextResponse.json({ error: 'Results expired' }, { status: 404 });
    }

    return NextResponse.json({
      facilities: cached.facilities,
      searchParams: cached.searchParams,
    });
  } catch (error) {
    console.error('検索結果の取得エラー:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve search results' },
      { status: 500 }
    );
  }
}
