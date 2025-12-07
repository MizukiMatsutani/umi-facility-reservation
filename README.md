# 宇美町施設予約検索システム

宇美町の体育館施設（バスケットボール・ミニバスケットボール）の空き状況を迅速に検索できるモバイルファーストのWebアプリケーションです。

## 概要

宇美町の既存施設予約システムは複雑な操作導線とモバイルUIの課題があります。本システムは、最小限の入力で施設の空き状況を確認できるシンプルなインターフェースを提供します。

### 主な機能

- **日付と時間帯による検索**: 複数日と時間範囲を指定して検索
- **モバイル最適化**: スマートフォンでストレスなく利用できるUI
- **リアルタイムデータ取得**: 宇美町システムから最新の空き状況を取得
- **シンプルな操作**: 検索完了まで最大2ステップ

### 技術スタック

- **フロントエンド**: Next.js 16 (App Router), React 19, TypeScript
- **スタイリング**: TailwindCSS 4
- **スクレイピング**: Puppeteer, Cheerio
- **テスト**: Vitest, React Testing Library
- **デプロイ**: Render.com (以前: Vercel)

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

## デプロイ

### Render.comへのデプロイ（推奨）

本番環境は **Render.com** を使用しています。

**Vercelからの移行理由**: VercelのIPアドレスが宇美町システムのファイアウォールにブロックされる問題が発生しました（`net::ERR_CONNECTION_TIMED_OUT`）。Render.comでは異なるIPアドレス範囲を使用するため、この問題を回避できます。

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

### Vercelへのデプロイ（非推奨）

**注意**: VercelではIPブロッキング問題により、本番環境でスクレイピングが動作しません。開発・テスト目的のみで使用してください。

1. Vercelアカウントを作成
2. リポジトリをVercelに接続
3. 自動的にビルドとデプロイが実行されます

詳細は [Vercel公式ドキュメント](https://vercel.com/docs) を参照してください。

## トラブルシューティング

### Puppeteerが動作しない

Vercelでは、Puppeteerの依存関係が自動的にインストールされます。ローカル環境で問題が発生する場合は、以下を確認してください：

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
- [ユーザーガイド](docs/user-guide.md)
- [API仕様書](docs/api/scrape-endpoint.md)
- [E2Eテスト手順](docs/testing/e2e-manual.md)
