# Project Structure

## ディレクトリ構成

```
umi-facility-reservation/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── layout.tsx           # ルートレイアウト
│   │   ├── page.tsx             # トップページ（検索フォーム）
│   │   ├── api/                 # API Routes
│   │   │   └── scrape/         # スクレイピングAPI
│   │   │       └── route.ts    # POST /api/scrape
│   │   └── results/            # 検索結果ページ
│   │       └── page.tsx        # 結果表示
│   │
│   ├── components/              # Reactコンポーネント
│   │   ├── ui/                 # 汎用UIコンポーネント
│   │   │   ├── Button.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── DatePicker.tsx
│   │   │   └── TimePicker.tsx
│   │   ├── SearchForm.tsx      # 検索フォームコンポーネント
│   │   ├── FacilityCard.tsx    # 施設カード表示
│   │   └── AvailabilityList.tsx # 空き時間リスト
│   │
│   ├── lib/                     # ユーティリティとロジック
│   │   ├── scraper/            # スクレイピング関連
│   │   │   ├── index.ts        # スクレイパーメイン
│   │   │   ├── parser.ts       # HTMLパーサー
│   │   │   ├── navigator.ts    # ページナビゲーション
│   │   │   └── rateLimiter.ts  # レート制限
│   │   ├── utils/              # ユーティリティ関数
│   │   │   ├── date.ts         # 日付操作
│   │   │   └── validation.ts   # バリデーション
│   │   └── types/              # TypeScript型定義
│   │       ├── facility.ts     # 施設関連の型
│   │       ├── availability.ts # 空き状況の型
│   │       └── api.ts          # APIレスポンスの型
│   │
│   └── styles/                  # グローバルスタイル
│       └── globals.css         # Tailwind + カスタムCSS
│
├── public/                      # 静的ファイル
│   ├── favicon.ico
│   └── images/
│
├── tests/                       # テストファイル
│   ├── unit/                   # ユニットテスト
│   │   ├── scraper.test.ts
│   │   └── utils.test.ts
│   └── e2e/                    # E2Eテスト（必要に応じて）
│       └── search.spec.ts
│
├── .spec-workflow/              # Spec Workflow管理
│   ├── steering/               # ステアリングドキュメント
│   └── specs/                  # 仕様ドキュメント
│
├── .github/                     # GitHub設定
│   └── workflows/              # GitHub Actions
│
├── next.config.js               # Next.js設定
├── tailwind.config.ts           # Tailwind CSS設定
├── tsconfig.json                # TypeScript設定
├── package.json                 # プロジェクト依存関係
├── pnpm-lock.yaml              # pnpmロックファイル
├── .env.local                   # 環境変数（ローカル）
├── .gitignore
└── README.md
```

## 命名規則

### ファイル
- **Reactコンポーネント**: `PascalCase.tsx` (例: `SearchForm.tsx`, `FacilityCard.tsx`)
- **APIルート**: `route.ts` (Next.js App Router標準)
- **ユーティリティ/ライブラリ**: `camelCase.ts` (例: `rateLimiter.ts`, `date.ts`)
- **型定義**: `camelCase.ts` (例: `facility.ts`, `availability.ts`)
- **テスト**: `[filename].test.ts` または `[filename].spec.ts`

### コード
- **Reactコンポーネント**: `PascalCase` (例: `SearchForm`, `LoadingSpinner`)
- **関数**: `camelCase` (例: `fetchFacilityData`, `parseAvailability`)
- **型・インターフェース**: `PascalCase` (例: `Facility`, `AvailabilitySlot`)
- **定数**: `UPPER_SNAKE_CASE` (例: `MAX_RETRY_COUNT`, `DEFAULT_TIMEOUT`)
- **変数**: `camelCase` (例: `facilityList`, `selectedDate`)

## インポートパターン

### インポート順序
1. React関連
2. Next.js関連
3. 外部ライブラリ
4. `@/` エイリアスによる内部モジュール
5. 相対パスによるインポート
6. 型インポート（`import type`）
7. スタイルインポート

### インポート例
```typescript
// 1. React関連
import { useState, useEffect } from 'react';

// 2. Next.js関連
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// 3. 外部ライブラリ
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

// 4. 内部モジュール（@/エイリアス使用）
import { SearchForm } from '@/components/SearchForm';
import { fetchFacilityData } from '@/lib/scraper';

// 5. 相対パス
import { Button } from '../ui/Button';

// 6. 型インポート
import type { Facility, AvailabilitySlot } from '@/lib/types/facility';

// 7. スタイル
import './styles.css';
```

### パスエイリアス設定
- `@/`: `src/` ディレクトリのエイリアス（tsconfig.jsonで設定）
- 絶対パスインポートを優先し、相対パスは同一ディレクトリ内のみに限定

## コード構造パターン

### Reactコンポーネントの構成

```typescript
// 1. インポート（上記の順序に従う）
import { useState } from 'react';
import type { Facility } from '@/lib/types/facility';

// 2. 型定義（コンポーネント固有）
interface SearchFormProps {
  onSubmit: (data: SearchData) => void;
  isLoading?: boolean;
}

// 3. 定数（コンポーネント外）
const DEFAULT_TIME_SLOTS = ['8:30', '9:00', '9:30'];

// 4. コンポーネント実装
export function SearchForm({ onSubmit, isLoading = false }: SearchFormProps) {
  // 4-1. State定義
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // 4-2. Hooks
  const router = useRouter();

  // 4-3. イベントハンドラ
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // ...
  };

  // 4-4. JSX return
  return (
    <form onSubmit={handleSubmit}>
      {/* ... */}
    </form>
  );
}

// 5. ヘルパー関数（コンポーネント外）
function validateTimeSlot(time: string): boolean {
  // ...
}
```

### API Routeの構成

```typescript
// 1. インポート
import { NextRequest, NextResponse } from 'next/server';
import { scrapeAvailability } from '@/lib/scraper';
import type { ScrapeRequest, ScrapeResponse } from '@/lib/types/api';

// 2. 定数
const MAX_REQUEST_SIZE = 1024;

// 3. メインハンドラ
export async function POST(request: NextRequest) {
  try {
    // 3-1. バリデーション
    const body = await request.json();
    validateRequest(body);

    // 3-2. ビジネスロジック
    const result = await scrapeAvailability(body);

    // 3-3. レスポンス
    return NextResponse.json<ScrapeResponse>(result);
  } catch (error) {
    // 3-4. エラーハンドリング
    return handleError(error);
  }
}

// 4. ヘルパー関数
function validateRequest(body: unknown): asserts body is ScrapeRequest {
  // ...
}
```

### ユーティリティ関数の構成

```typescript
// 1. インポート
import { format, addDays } from 'date-fns';
import { ja } from 'date-fns/locale';

// 2. 型定義
export interface DateRange {
  start: Date;
  end: Date;
}

// 3. メイン関数（エクスポート）
export function formatDateRange(range: DateRange): string {
  // ...
}

export function getNextAvailableDate(current: Date, excludeDays: number[]): Date {
  // ...
}

// 4. ヘルパー関数（非エクスポート）
function isWeekend(date: Date): boolean {
  // ...
}
```

## コード組織化の原則

1. **単一責任の原則**
   - 各ファイルは1つの明確な目的を持つ
   - コンポーネントは1つの機能に集中
   - ユーティリティ関数は1つのタスクのみ実行

2. **モジュール性**
   - 機能ごとにディレクトリを分割
   - 再利用可能なコンポーネントは `components/ui/` に配置
   - ビジネスロジックは `lib/` に分離

3. **テスタビリティ**
   - ビジネスロジックをReactコンポーネントから分離
   - Pure Functionを優先
   - 依存性注入を活用

4. **一貫性**
   - 同じパターンを全体で使用
   - 命名規則の統一
   - ディレクトリ構造の統一

## モジュール境界

### レイヤー分離

```
presentation (components/)
    ↓ 依存
business logic (lib/)
    ↓ 依存
external services (lib/scraper/)
```

### 依存関係のルール

1. **上位層は下位層に依存できる**
   - コンポーネント → lib → 外部サービス

2. **下位層は上位層に依存できない**
   - スクレイパーはReactコンポーネントをインポートしない
   - ユーティリティはビジネスロジックに依存しない

3. **同一層内での依存は最小限に**
   - コンポーネント間の循環依存を避ける
   - 共通機能は下位層に移動

### 境界パターン

- **UI vs ロジック**: Reactコンポーネント（UI）とビジネスロジック（lib）を分離
- **公開API vs 内部実装**: `index.ts` でエクスポートするものを制限
- **スクレイパー vs アプリケーション**: スクレイピング処理を独立したモジュールとして隔離
- **型定義の共有**: `lib/types/` で型を一元管理し、各層で共有

## コードサイズガイドライン

### ファイルサイズ
- **コンポーネントファイル**: 200行以内を推奨、300行を上限
- **ユーティリティファイル**: 150行以内を推奨
- **APIルートファイル**: 100行以内を推奨
- 上限を超える場合は、ファイル分割を検討

### 関数・メソッドサイズ
- **関数**: 30行以内を推奨、50行を上限
- **Reactコンポーネント**: 50行以内を推奨、100行を上限
- 複雑な処理は小さな関数に分割

### 複雑度
- **ネストレベル**: 最大3階層まで
- **if文の連鎖**: 3つまで（それ以上は早期returnやswitch文を検討）
- **関数の引数**: 最大4つまで（それ以上はオブジェクトにまとめる）

## ドキュメンテーション標準

### コメント規則

1. **公開API**: JSDocコメント必須
```typescript
/**
 * 施設の空き状況を取得する
 * @param facilityId - 施設ID
 * @param date - 検索日付
 * @returns 空き時間のリスト
 * @throws {Error} スクレイピング失敗時
 */
export async function fetchAvailability(
  facilityId: string,
  date: Date
): Promise<AvailabilitySlot[]> {
  // ...
}
```

2. **複雑なロジック**: インラインコメントで説明
```typescript
// レート制限: 5秒間隔でリクエストを送信
await rateLimiter.wait(5000);
```

3. **型定義**: 必要に応じてコメントを追加
```typescript
export interface Facility {
  id: string;
  name: string;
  /** 施設の種類（バスケットボール専用の場合は "basketball"） */
  type: 'basketball' | 'multi-purpose';
}
```

### READMEファイル

- **プロジェクトルート**: プロジェクト全体の説明、セットアップ手順
- **主要ディレクトリ**: `lib/scraper/README.md` などでモジュール固有のドキュメント

### ドキュメント言語
- コード内のコメント: 日本語
- 型定義のコメント: 日本語
- README: 日本語
- commit message: 日本語

## Next.js App Router固有の構造

### App Routerのディレクトリ規則

- `app/page.tsx`: ページコンポーネント
- `app/layout.tsx`: レイアウトコンポーネント
- `app/loading.tsx`: ローディング状態（自動生成）
- `app/error.tsx`: エラーハンドリング
- `app/api/*/route.ts`: APIエンドポイント

### サーバーコンポーネント vs クライアントコンポーネント

- **デフォルト**: サーバーコンポーネント（`'use client'` なし）
- **クライアントコンポーネント**: ファイル先頭に `'use client'` を追加
  - `useState`, `useEffect` などを使用する場合
  - ブラウザAPIを使用する場合
  - イベントハンドラを定義する場合

```typescript
// クライアントコンポーネントの例
'use client';

import { useState } from 'react';

export function SearchForm() {
  const [date, setDate] = useState<Date | null>(null);
  // ...
}
```

### メタデータの管理

```typescript
// app/layout.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '宇美町施設予約確認',
  description: 'バスケットボール施設の空き状況を簡単に確認',
};
```

## 環境変数の管理

### ファイル配置
- `.env.local`: ローカル開発環境用（gitignore）
- `.env.example`: 環境変数のサンプル（コミット対象）

### 命名規則
```bash
# 公開可能な環境変数（ブラウザからアクセス可能）
NEXT_PUBLIC_APP_URL=https://example.com

# サーバーサイドのみの環境変数
SCRAPER_TIMEOUT=30000
SCRAPER_USER_AGENT=Mozilla/5.0...
```

### 使用方法
```typescript
// サーバーサイドのみ
const timeout = process.env.SCRAPER_TIMEOUT;

// クライアントサイドでも使用可能
const appUrl = process.env.NEXT_PUBLIC_APP_URL;
```
