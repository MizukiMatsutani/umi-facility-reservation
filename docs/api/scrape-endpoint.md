# API仕様書: /api/scrape

宇美町施設予約検索システムのスクレイピングAPIエンドポイントの詳細仕様です。

## 概要

このエンドポイントは、宇美町の体育館施設（バスケットボール・ミニバスケットボール）の空き状況を取得します。

### エンドポイント情報

- **URL**: `/api/scrape`
- **メソッド**: `POST`
- **Content-Type**: `application/json`
- **認証**: 不要

## リクエスト

### リクエストボディ

```typescript
{
  dates: string[];      // ISO 8601形式の日付配列
  timeRange?: {         // オプション: 時間範囲フィルター
    from: string;       // 開始時刻 (HH:mm形式)
    to: string;         // 終了時刻 (HH:mm形式)
  };
}
```

### パラメータ詳細

#### dates（必須）

検索対象となる日付の配列。ISO 8601形式（YYYY-MM-DD）で指定します。

- **型**: `string[]`
- **必須**: Yes
- **形式**: ISO 8601（`YYYY-MM-DD`）
- **制約**:
  - 1つ以上の日付が必要
  - 過去の日付も指定可能（警告メッセージが表示される場合あり）

**例**:
```json
["2025-12-06", "2025-12-07", "2025-12-08"]
```

#### timeRange（オプション）

検索対象となる時間範囲を指定します。未指定の場合は全時間帯（8:30〜21:30）が検索対象となります。

- **型**: `{ from: string, to: string }`
- **必須**: No
- **形式**: `HH:mm`（24時間形式）
- **制約**:
  - `from`は`to`より前の時刻である必要があります
  - 有効な時間範囲: 8:30〜21:30（30分刻み）
  - 例: "8:30", "9:00", "9:30", ..., "21:00", "21:30"

**例**:
```json
{
  "from": "18:00",
  "to": "21:00"
}
```

### リクエスト例

#### 例1: 複数日 + 時間範囲指定あり

```json
{
  "dates": ["2025-12-06", "2025-12-07"],
  "timeRange": {
    "from": "18:00",
    "to": "21:00"
  }
}
```

#### 例2: 単一日 + 全時間帯検索

```json
{
  "dates": ["2025-12-06"]
}
```

#### 例3: 本日から1週間 + 時間範囲指定

```json
{
  "dates": [
    "2025-12-06",
    "2025-12-07",
    "2025-12-08",
    "2025-12-09",
    "2025-12-10",
    "2025-12-11",
    "2025-12-12"
  ],
  "timeRange": {
    "from": "19:00",
    "to": "21:30"
  }
}
```

## レスポンス

### 成功レスポンス（200 OK）

```typescript
{
  facilities: Array<{
    id: string;
    name: string;
    type: 'basketball' | 'mini-basketball';
    availability: Array<{
      date: string;       // ISO 8601形式
      slots: Array<{
        time: string;     // "HH:mm"形式
        available: boolean;
      }>;
    }>;
  }>;
}
```

#### レスポンス例

```json
{
  "facilities": [
    {
      "id": "1",
      "name": "宇美町総合スポーツセンター",
      "type": "basketball",
      "availability": [
        {
          "date": "2025-12-06T00:00:00.000Z",
          "slots": [
            {
              "time": "18:00",
              "available": true
            },
            {
              "time": "18:30",
              "available": true
            },
            {
              "time": "19:00",
              "available": false
            },
            {
              "time": "19:30",
              "available": true
            },
            {
              "time": "20:00",
              "available": true
            },
            {
              "time": "20:30",
              "available": true
            },
            {
              "time": "21:00",
              "available": true
            }
          ]
        },
        {
          "date": "2025-12-07T00:00:00.000Z",
          "slots": [
            {
              "time": "18:00",
              "available": false
            },
            {
              "time": "18:30",
              "available": true
            }
          ]
        }
      ]
    }
  ]
}
```

### エラーレスポンス

すべてのエラーレスポンスは以下の形式で返却されます：

```typescript
{
  error: ErrorType;
  message: string;
  retryable: boolean;
}
```

#### エラータイプ一覧

| ErrorType | HTTPステータス | 説明 | retryable |
|-----------|--------------|------|-----------|
| `validation` | 400 Bad Request | 入力バリデーションエラー | `false` |
| `rate_limit` | 429 Too Many Requests | レート制限超過 | `true` |
| `network` | 500 Internal Server Error | ネットワークエラー | `true` |
| `timeout` | 500 Internal Server Error | タイムアウト | `true` |
| `scraping` | 500 Internal Server Error | スクレイピング処理エラー | `true` |
| `unknown` | 500 Internal Server Error | 不明なエラー | `true` |

#### 400 Bad Request - バリデーションエラー

入力パラメータが不正な場合に返却されます。

**シナリオ例**:
- `dates`が空配列
- `dates`が指定されていない
- `timeRange.from`が`timeRange.to`より後の時刻

```json
{
  "error": "validation",
  "message": "検索対象の日付を選択してください",
  "retryable": false
}
```

#### 429 Too Many Requests - レート制限エラー

前回のリクエストから5秒以内に新しいリクエストが送信された場合に返却されます。

```json
{
  "error": "rate_limit",
  "message": "前回の検索から5秒以上経過してから再度お試しください",
  "retryable": true
}
```

#### 500 Internal Server Error - ネットワークエラー

宇美町システムへの接続に失敗した場合に返却されます。

```json
{
  "error": "network",
  "message": "施設情報の取得に失敗しました。しばらく経ってから再度お試しください",
  "retryable": true
}
```

#### 500 Internal Server Error - タイムアウトエラー

スクレイピング処理が10秒以内に完了しなかった場合に返却されます。

```json
{
  "error": "timeout",
  "message": "施設情報の取得がタイムアウトしました。しばらく経ってから再度お試しください",
  "retryable": true
}
```

#### 500 Internal Server Error - スクレイピングエラー

HTMLの構造変更などにより、データの取得に失敗した場合に返却されます。

```json
{
  "error": "scraping",
  "message": "施設情報の取得中にエラーが発生しました。しばらく経ってから再度お試しください",
  "retryable": true
}
```

## レート制限

本APIは、宇美町の既存システムへの負荷を軽減するため、以下のレート制限を実装しています：

- **リクエスト間隔**: 最低5秒
- **同時リクエスト数**: 1つのみ

レート制限に達した場合、`429 Too Many Requests`が返却されます。

## タイムアウト

スクレイピング処理は10秒でタイムアウトします。タイムアウト発生時は`timeout`エラーが返却されます。

## 再試行戦略

- **自動再試行**: ネットワークエラー時に1回のみ自動再試行を実行
- **手動再試行**: `retryable: true`のエラーの場合、ユーザーによる手動再試行を推奨

## サンプルコード

### JavaScript (fetch)

```javascript
async function searchFacilities(dates, timeRange) {
  try {
    const response = await fetch('/api/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ dates, timeRange }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    const data = await response.json();
    return data.facilities;
  } catch (error) {
    console.error('検索エラー:', error.message);
    throw error;
  }
}

// 使用例
const facilities = await searchFacilities(
  ['2025-12-06', '2025-12-07'],
  { from: '18:00', to: '21:00' }
);
```

### TypeScript

```typescript
import type { ScrapeRequest, ScrapeResponse, ErrorResponse } from '@/lib/types/api';

async function searchFacilities(
  request: ScrapeRequest
): Promise<ScrapeResponse> {
  const response = await fetch('/api/scrape', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error: ErrorResponse = await response.json();
    throw new Error(error.message);
  }

  return response.json();
}

// 使用例
const result = await searchFacilities({
  dates: ['2025-12-06', '2025-12-07'],
  timeRange: { from: '18:00', to: '21:00' },
});
```

## セキュリティ考慮事項

- **HTTPS**: すべての通信はHTTPS経由で実行されます（Render.com自動設定）
- **XSS対策**: Reactのデフォルト保護により、XSS攻撃を防止します
- **レート制限**: DoS攻撃を防ぐため、厳格なレート制限を実装しています
- **個人情報**: 検索履歴は保存されません

## 制限事項

- **キャッシュ**: データのキャッシュは行われません。すべてのリクエストでリアルタイムスクレイピングを実行します
- **スポーツ種目**: バスケットボールおよびミニバスケットボールのみをサポートします
- **対象自治体**: 宇美町の施設のみをサポートします

## 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| 1.0.0 | 2025-12-06 | 初版リリース |
