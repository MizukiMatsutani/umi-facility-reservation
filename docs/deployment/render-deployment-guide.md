# Render.com デプロイメントガイド

## 概要

このドキュメントは、宇美町施設予約検索システムをRender.comにデプロイする手順を説明します。

**✅ デプロイ状況**: 本番環境稼働中（2025年12月7日デプロイ完了）
- **本番URL**: https://umi-facility-reservation.onrender.com
- **動作確認**: 7日分の施設検索が正常に動作

### Render.comを選択した理由

VercelでのデプロイではIPブロッキングの問題が発生し、宇美町システムへのアクセスが`net::ERR_CONNECTION_TIMED_OUT`エラーで失敗しました。Render.comでは異なるIPアドレス範囲を使用するため、この問題の解決が期待されます。

**結果**: ✅ **IPブロック問題は解決** - Render.comから宇美町システムへのアクセスが正常に動作することを確認しました。

## 前提条件

- GitHubアカウント
- Render.comアカウント（無料プランで可）
- プロジェクトがGitHubリポジトリにプッシュされていること

## デプロイ手順

### 1. Render.comアカウントの作成

1. [Render.com](https://render.com/)にアクセス
2. "Get Started for Free"をクリック
3. GitHubアカウントで認証

### 2. GitHubリポジトリの連携

1. Render.comダッシュボードで "New +" をクリック
2. "Blueprint"を選択（推奨）または "Web Service"を選択
3. GitHubリポジトリ `umi-facility-reservation` を選択
4. リポジトリへのアクセスを許可

### 3. サービス設定（Blueprintを使用する場合）

プロジェクトルートの`render.yaml`が自動的に検出されます。

#### render.yamlの主要設定:

```yaml
services:
  - type: web
    name: umi-facility-reservation
    runtime: node
    region: singapore # アジア最寄りリージョン
    plan: free # フリープラン（750時間/月）
    branch: main
    buildCommand: pnpm install && pnpm build
    startCommand: pnpm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: NODE_VERSION
        value: 20.18.1
    healthCheckPath: /api/health
    autoDeploy: true
```

### 4. サービス設定（手動設定する場合）

Blueprintを使用しない場合は、以下の設定を手動で入力します：

#### 基本設定:
- **Name**: `umi-facility-reservation`
- **Region**: `Singapore (Southeast Asia)` （または `Frankfurt (Europe)`, `Oregon (US West)`）
- **Branch**: `main`
- **Runtime**: `Node`

#### ビルド設定:
- **Build Command**: `pnpm install && pnpm build`
- **Start Command**: `pnpm start`

#### 環境変数:
以下の環境変数を設定：

| キー | 値 | 説明 |
|------|-----|------|
| `NODE_ENV` | `production` | 本番環境モード |
| `NODE_VERSION` | `20.18.1` | Node.jsバージョン |
| `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD` | `false` | Chromiumダウンロードを許可 |
| `PUPPETEER_EXECUTABLE_PATH` | `/usr/bin/chromium-browser` | Chromium実行パス |

#### 高度な設定:
- **Health Check Path**: `/api/health`
- **Auto-Deploy**: `Yes` （mainブランチへのpushで自動デプロイ）

### 5. デプロイの開始

1. "Create Web Service"をクリック
2. ビルドログをモニタリング
   - Puppeteerのインストールを確認
   - Next.jsのビルド完了を確認
3. デプロイ完了を待つ（通常5-10分）

### 6. デプロイ後の確認

#### 6.1 サービスの起動確認

```bash
# ヘルスチェックエンドポイントの確認
curl https://your-app-name.onrender.com/api/health

# 期待されるレスポンス:
# {"status":"ok","timestamp":"2025-12-07T...","service":"umi-facility-reservation"}
```

#### 6.2 スクレイピング機能の確認

```bash
# スクレイピングAPIのテスト
curl -X POST https://your-app-name.onrender.com/api/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "dates": ["2025-12-10"],
    "timeRange": {
      "from": "09:00",
      "to": "12:00"
    }
  }'
```

**重要**: この確認で宇美町システムへのアクセスが成功すれば、IPブロック問題が解決されたことが確認できます。

### 7. カスタムドメインの設定（オプション）

1. Render.comダッシュボードで "Settings" > "Custom Domain"
2. ドメインを追加
3. DNS設定でCNAMEレコードを追加

## トラブルシューティング

### ビルドエラー

#### Puppeteerのインストール失敗
```bash
# ビルドログで以下を確認:
# "Downloading Chromium..."
# "Chromium downloaded to ..."
```

**解決策**: 環境変数 `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD` が `false` であることを確認

#### pnpmコマンドが見つからない
```bash
# Error: pnpm: command not found
```

**解決策**: Render.comは自動的にpnpmを検出してインストールしますが、失敗する場合はビルドコマンドを以下に変更：
```bash
npm install -g pnpm && pnpm install && pnpm build
```

### ランタイムエラー

#### コールドスタート時のタイムアウト

Render.comのフリープランでは、非アクティブ時にサービスがスリープします。初回リクエストは起動に時間がかかります（最大60秒）。

**解決策**:
- 初回リクエストの待機時間を考慮
- 本番運用では有料プランを検討（常時稼働）

#### IPブロック問題の再発

もしRender.comでもIPブロックが発生する場合：

1. ログで `net::ERR_CONNECTION_TIMED_OUT` を確認
2. User-Agent設定を確認（`src/lib/scraper/index.ts`）
3. 宇美町システムの管理者に問い合わせ

### ログの確認方法

#### ダッシュボードでログを確認
1. Render.comダッシュボードで該当サービスを選択
2. "Logs"タブをクリック
3. リアルタイムログまたは履歴を確認

#### CLIでログを確認
```bash
# Render CLIのインストール（オプション）
npm install -g render-cli

# ログイン
render login

# ログの確認
render logs -s umi-facility-reservation
```

## パフォーマンス監視

### 初期メトリクスの確認項目

- **コールドスタート時間**: 初回リクエストの応答時間（目標: <60秒）
- **スクレイピング時間**: /api/scrape の応答時間（目標: <30秒）
- **エラー率**: 24時間以内のエラーログ数（目標: 0%）

### モニタリング方法

1. Render.comダッシュボードの "Metrics" タブ
2. ログでエラーパターンを検索
3. ヘルスチェックエンドポイントの定期監視

## デプロイメントチェックリスト

- [ ] Render.comアカウント作成完了
- [ ] GitHubリポジトリ連携完了
- [ ] Web Service作成完了
- [ ] ビルドコマンド設定完了（`pnpm install && pnpm build`）
- [ ] 起動コマンド設定完了（`pnpm start`）
- [ ] 環境変数設定完了（NODE_ENV, NODE_VERSION等）
- [ ] ヘルスチェックパス設定完了（`/api/health`）
- [ ] デプロイ成功確認
- [ ] ヘルスチェックAPI動作確認
- [ ] スクレイピングAPI動作確認（IPブロック問題解決確認）
- [ ] モバイルブラウザでの動作確認

## 次のステップ

デプロイが成功したら、以下のタスクに進みます：

1. **10.1.3 Render.com本番デプロイの実行** ✓（このガイドの手順で完了）
2. **10.1.4 IPブロック問題の検証**（スクレイピングAPIのテストで確認）
3. **10.2.1 本番環境での動作確認**（すべての機能の統合テスト）
4. **10.2.2 パフォーマンスモニタリングの確認**（24時間のログ監視）

## 参考リンク

- [Render.com公式ドキュメント](https://render.com/docs)
- [Render.com Blueprint仕様](https://render.com/docs/blueprint-spec)
- [Next.js on Render.com](https://render.com/docs/deploy-nextjs-app)
- [Puppeteer on Render.com](https://render.com/docs/puppeteer)

## 問題が発生した場合

1. まずこのドキュメントのトラブルシューティングセクションを確認
2. Render.comのログを確認
3. GitHubのIssuesで報告
4. Render.comのサポートに問い合わせ（有料プランのみ）

## 本番デプロイで解決した問題（2025年12月7日）

### 問題1: ヘルスチェックエンドポイントがない

**症状**: "No open ports detected"エラーでデプロイ失敗

**原因**: `/api/health`エンドポイントが存在しなかった

**解決策**:
```typescript
// src/app/api/health/route.ts を作成
export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "umi-facility-reservation",
  });
}
```

### 問題2: Chromiumが見つからない

**症状**: "Tried to find the browser at the configured path (/usr/bin/chromium-browser), but no executable was found."

**原因**: Render.com環境を検出できず、`@sparticuz/chromium`を使用していなかった

**解決策**:
```typescript
// src/lib/scraper/index.ts
const isProduction =
  process.env.NODE_ENV === 'production' ||
  process.env.VERCEL === '1' ||
  process.env.RENDER === 'true';

if (isProduction) {
  const chromium = await import('@sparticuz/chromium');
  // ... Chromiumを使用
}
```

### 問題3: AJAX更新でタイムアウト

**症状**: "Navigation timeout of 60000 ms exceeded"

**原因**: 表示期間設定ボタン（`#btnHyoji`）はページ全体の遷移ではなくAJAX更新を行うが、`waitForNavigation`を使用していた

**解決策**:
```typescript
// Before（誤り）
await page.click('#btnHyoji');
await page.waitForNavigation({ ... }); // ← 永遠に待ち続ける

// After（正しい）
await page.click('#btnHyoji');
await page.waitForFunction(
  () => document.querySelectorAll('input[type="checkbox"][name="checkdate"]').length > 0,
  { timeout: 60000 }
);
await new Promise(resolve => setTimeout(resolve, 2000));
```

### 検証結果

✅ **すべての問題を解決し、本番環境で正常稼働中**
- IPブロック問題: Render.comから宇美町システムへのアクセス成功
- スクレイピング: 7日分の検索が正常に完了
- レスポンス時間: コールドスタート30-60秒、稼働中は20-30秒
