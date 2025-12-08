# 宇美町施設予約検索システム

宇美町の体育館施設（バスケットボール・ミニバスケットボール）の空き状況を迅速に検索できるモバイルファーストのWebアプリケーションです。

## 概要

宇美町の既存施設予約システムは複雑な操作導線とモバイルUIの課題があります。本システムは、最小限の入力で施設の空き状況を確認できるシンプルなインターフェースを提供します。

### 主な機能

- **日付と時間帯による検索**: 複数日と時間範囲を指定して検索
- **モバイル最適化**: スマートフォンでストレスなく利用できるUI
- **リアルタイムデータ取得**: 宇美町システムから最新の空き状況を取得
- **シンプルな操作**: 検索完了まで最大2ステップ
- **高速検索**: 直接API呼び出しによる最適化で、7日検索が約30秒〜1分で完了

### 技術スタック

- **フロントエンド**: Next.js 16 (App Router), React 19, TypeScript
- **スタイリング**: TailwindCSS 4
- **スクレイピング**: Puppeteer, Cheerio
- **テスト**: Vitest, React Testing Library
- **デプロイ**: Render.com

## セットアップ

### 必要な環境

- Node.js 20.x 以上
- pnpm 9.x 以上

### インストール

```bash
# リポジトリのクローン
git clone <repository-url>
cd umi-facility-reservation

# 依存関係のインストール
pnpm install
```

### 環境変数（オプション）

現在、環境変数の設定は不要です。将来的に追加される可能性があります。

## 開発コマンド

### 開発サーバーの起動

```bash
pnpm dev
```

http://localhost:3000 でアプリケーションが起動します。

### ビルド

```bash
pnpm build
```

本番用にアプリケーションをビルドします。

### 本番サーバーの起動

```bash
pnpm start
```

ビルド後のアプリケーションを起動します。

### リントとフォーマット

```bash
# ESLint実行
pnpm lint

# ESLint自動修正
pnpm lint:fix

# Prettierフォーマット
pnpm format

# Prettierチェック
pnpm format:check
```

### テスト

```bash
# テスト実行（ウォッチモード）
pnpm test

# テストUI起動
pnpm test:ui

# テスト1回実行
pnpm test:run

# カバレッジレポート生成
pnpm test:coverage
```

## プロジェクト構造

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # APIルート
│   │   └── scrape/        # スクレイピングエンドポイント
│   ├── results/           # 検索結果ページ
│   ├── page.tsx           # トップページ（検索フォーム）
│   ├── layout.tsx         # ルートレイアウト
│   ├── error.tsx          # エラーページ
│   ├── loading.tsx        # ローディングページ
│   └── globals.css        # グローバルスタイル
├── components/            # Reactコンポーネント
│   ├── ui/                # 基本UIコンポーネント
│   ├── SearchForm.tsx     # 検索フォーム
│   ├── FacilityCard.tsx   # 施設カード
│   └── AvailabilityList.tsx # 空き状況リスト
└── lib/                   # ビジネスロジック
    ├── types/             # TypeScript型定義
    ├── utils/             # ユーティリティ関数
    │   ├── date.ts        # 日付処理
    │   ├── validation.ts  # バリデーション
    │   ├── timeFilter.ts  # 時間フィルタリング
    │   └── retry.ts       # 再試行ロジック
    └── scraper/           # スクレイピング機能
        ├── index.ts       # Scraperクラス
        ├── parser.ts      # HTMLパーサー
        └── rateLimiter.ts # レート制限
```

## APIドキュメント

詳細なAPI仕様は [docs/api/scrape-endpoint.md](docs/api/scrape-endpoint.md) を参照してください。

### /api/scrape エンドポイント

施設の空き状況を取得します。

**リクエスト**:
```json
{
  "dates": ["2025-12-06", "2025-12-07"],
  "timeRange": {
    "from": "18:00",
    "to": "21:00"
  }
}
```

**レスポンス**:
```json
{
  "facilities": [
    {
      "id": "1",
      "name": "宇美町総合スポーツセンター",
      "availability": [
        {
          "date": "2025-12-06T00:00:00.000Z",
          "slots": [
            {
              "time": "18:00",
              "available": true
            }
          ]
        }
      ]
    }
  ]
}
```

## パフォーマンス最適化

本システムは、複数の最適化技術により高速な検索を実現しています。

### 直接API呼び出しモード

宇美町システムへのアクセスを最適化し、不要なページ遷移をスキップする「直接API呼び出しモード」を採用しています。

**最適化の効果**:
- **7日検索**: 従来 120〜180秒 → **最適化後 20〜40秒**（約75%削減）
- **1日検索**: 従来 20〜30秒 → **最適化後 5〜10秒**

#### 従来の方式（レガシーモード）

1. 検索ページにアクセス
2. スポーツ種目を選択
3. 施設を選択（10施設）
4. 日付を入力
5. 施設別空き状況ページへ遷移
6. 日付を選択
7. 時間帯別空き状況ページへ遷移

**合計7ステップ** × 複数日 = 長い待ち時間

#### 最適化後の方式（直接APIモード、デフォルト）

1. セッショントークンを取得
2. 全施設ID・全日付をまとめて直接POSTリクエスト
3. 施設別空き状況ページをスキップ
4. 各日付の時間帯別空き状況を取得

**5ステップをスキップ** → 劇的な高速化を実現

### ScraperOptionsによるカスタマイズ

開発者は `ScraperOptions` を使用してスクレイピング動作をカスタマイズできます。

```typescript
import { FacilityScraper } from '@/lib/scraper';

const scraper = new FacilityScraper();

// デフォルト設定（推奨）
await scraper.scrapeFacilities(dates, {
  useDirectApi: true,           // 直接APIモードを使用（デフォルト: true）
  fallbackOnError: true,         // エラー時はレガシーモードにフォールバック（デフォルト: true）
  enableResourceBlocking: false, // リソースブロッキング（デフォルト: false）
  reportProgress: false,         // プログレス報告（デフォルト: false）
  progressCallback: undefined,   // カスタムプログレスコールバック
});
```

#### オプション詳細

| オプション | 説明 | デフォルト |
|-----------|------|-----------|
| `useDirectApi` | 直接API呼び出しモードを使用 | `true` |
| `fallbackOnError` | エラー時にレガシーモードへフォールバック | `true` |
| `enableResourceBlocking` | 画像・CSS・フォントの読み込みをブロック | `false` |
| `reportProgress` | 処理進捗をコンソールに出力 | `false` |
| `progressCallback` | カスタムプログレスコールバック関数 | `undefined` |

### フォールバック機能

直接API呼び出しモードで問題が発生した場合、システムは自動的にレガシーモード（従来の7ステップ方式）にフォールバックします。これにより、以下のメリットがあります：

- **堅牢性**: 宇美町システムの仕様変更に対応
- **信頼性**: エラー時も検索結果を取得可能
- **デバッグ**: エラーログにフォールバック情報を記録

### リアルタイムプログレス表示

検索中は以下の情報がリアルタイムで表示されます：

1. **現在の処理ステップ**: 「施設カレンダー取得中...」など
2. **進捗バー**: 視覚的な進捗表示
3. **処理日数**: 「X/Y日目を処理中...」

これにより、ユーザーは待ち時間を感じにくく、処理状況を把握できます。

### ベンチマーク結果

実環境での測定結果（宇美町システムへの実際のアクセス）:

| モード | 1日検索 | 3日検索 | 7日検索 |
|--------|---------|---------|---------|
| **レガシーモード** | 20〜30秒 | 60〜90秒 | 120〜180秒 |
| **直接APIモード** | 5〜10秒 | 15〜25秒 | 20〜40秒 |
| **改善率** | 50〜66% | 58〜75% | 67〜83% |

ベンチマークスクリプトで測定できます：

```bash
# パフォーマンス測定
pnpm tsx scripts/benchmark-search-performance.ts
```

### トラブルシューティング

#### 直接APIモードが動作しない場合

宇美町システムの仕様変更により直接APIモードが失敗する場合、システムは自動的にレガシーモードにフォールバックします。ログに以下のようなメッセージが表示されます：

```
[警告] 直接APIモードでエラーが発生しました: ...
[情報] レガシーモードにフォールバックします...
```

手動でレガシーモードを使用する場合：

```typescript
await scraper.scrapeFacilities(dates, {
  useDirectApi: false  // レガシーモードを強制
});
```

## デプロイ

### Render.comへのデプロイ

本番環境は **Render.com** を使用しています。

**本番URL**: https://umi-facility-reservation.onrender.com

#### デプロイ手順

1. **Render.comアカウントを作成**
   - [Render.com](https://render.com/)でGitHubアカウントを使用してサインアップ

2. **リポジトリを接続**
   - "New +" → "Blueprint" を選択
   - GitHubリポジトリ `umi-facility-reservation` を選択
   - `render.yaml` が自動検出されます

3. **デプロイの確認**
   - ビルドログでPuppeteerとNext.jsのビルドを確認
   - デプロイ完了後、`/api/health` でヘルスチェック

詳細な手順は [docs/deployment/render-deployment-guide.md](docs/deployment/render-deployment-guide.md) を参照してください。

#### デプロイ設定（`render.yaml`で自動設定）

- **ビルドコマンド**: `pnpm install && pnpm build`
- **起動コマンド**: `pnpm start`
- **推奨リージョン**: Singapore（アジア最寄り）
- **プラン**: Free（750時間/月）

## トラブルシューティング

### Puppeteerが動作しない

ローカル環境で問題が発生する場合は、以下を確認してください：

```bash
# Chromiumの再インストール
npx puppeteer browsers install chrome
```

### テストが失敗する

```bash
# node_modulesとキャッシュをクリア
rm -rf node_modules .next
pnpm install
pnpm test
```

### ビルドエラー

```bash
# TypeScriptエラーの確認
pnpm tsc --noEmit

# ESLintエラーの確認と修正
pnpm lint:fix
```

## 貢献

本プロジェクトは個人プロジェクトですが、バグ報告や改善提案を歓迎します。

## ライセンス

MIT License

## 関連ドキュメント

- [Render.comデプロイガイド](docs/deployment/render-deployment-guide.md)
- [モニタリングガイド](docs/deployment/monitoring-guide.md)
- [Vercel環境クリーンアップガイド](docs/deployment/vercel-cleanup-guide.md)
- [ユーザーガイド](docs/user-guide.md)
- [API仕様書](docs/api/scrape-endpoint.md)
- [E2Eテスト手順](docs/testing/e2e-manual.md)
