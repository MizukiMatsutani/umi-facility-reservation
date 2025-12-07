# 本番環境へのデプロイ手順

## 概要

このドキュメントは、宇美町施設予約検索システムをVercelの本番環境にデプロイする手順を説明します。

## 前提条件

- GitHubリポジトリが作成されている
- Vercelアカウントが作成されている
- プロジェクトのビルドが成功している

## デプロイ方法

### 方法1: Vercel Web UI経由（推奨）

#### 1. Vercelにログイン

https://vercel.com にアクセスしてログインします。

#### 2. 新しいプロジェクトを作成

1. ダッシュボードで「Add New...」→「Project」をクリック
2. GitHub リポジトリのインポート画面で `umi-facility-reservation` を選択
3. 必要に応じてVercelにGitHubアクセス権限を付与

#### 3. プロジェクト設定

**Framework Preset**: Next.js を選択（自動検出されるはず）

**Build and Output Settings**:
- Build Command: `pnpm build` (自動検出)
- Output Directory: `.next` (自動検出)
- Install Command: `pnpm install` (自動検出)

**Root Directory**: `.` (プロジェクトルート)

**Environment Variables**: 現時点では不要

#### 4. デプロイ

「Deploy」ボタンをクリックしてデプロイを開始します。

#### 5. デプロイの確認

- デプロイが完了すると、Vercelが自動的にプレビューURLを生成します
- 例: `https://umi-facility-reservation.vercel.app`
- デプロイログを確認して、エラーがないことを確認します

### 方法2: Vercel CLI経由

#### 1. Vercel CLIのインストール

```bash
pnpm add -g vercel
```

#### 2. Vercelにログイン

```bash
vercel login
```

ブラウザが開き、認証を求められます。

#### 3. プロジェクトのセットアップ

プロジェクトルートで以下を実行：

```bash
vercel
```

初回実行時に以下の質問が表示されます：

```
Set up and deploy "~/projects/personal/umi-facility-reservation"? [Y/n] y
Which scope do you want to deploy to? <your-username>
Link to existing project? [y/N] n
What's your project's name? umi-facility-reservation
In which directory is your code located? ./
```

#### 4. 本番環境へのデプロイ

```bash
vercel --prod
```

## デプロイ後の確認事項

### 1. 基本動作確認

- [ ] トップページが正常に表示される
- [ ] 検索フォームが表示される
- [ ] 日付選択が動作する
- [ ] 検索ボタンが表示される

### 2. スクレイピング機能確認

- [ ] 検索を実行してローディング状態が表示される
- [ ] 検索結果が正常に表示される
- [ ] 施設情報が正しく表示される
- [ ] 時間帯情報が正しく表示される

### 3. エラーハンドリング確認

- [ ] 日付未選択時にエラーメッセージが表示される
- [ ] ネットワークエラー時に適切なエラーが表示される

### 4. パフォーマンス確認

- [ ] Lighthouse スコアを確認
  - Performance: 90以上
  - Accessibility: 90以上
  - Best Practices: 90以上
  - SEO: 90以上

### 5. モバイル確認

- [ ] iOS Safari 14+ で動作確認
- [ ] Android Chrome 90+ で動作確認
- [ ] タップターゲットが適切なサイズである
- [ ] スクロールがスムーズである

## カスタムドメインの設定（オプション）

### 1. Vercelダッシュボードでドメイン設定

1. プロジェクトの「Settings」→「Domains」に移動
2. カスタムドメインを入力
3. DNSレコードを設定（Vercelが手順を表示）

### 2. DNS設定例

**Aレコード**:
```
Type: A
Name: @
Value: 76.76.21.21
```

**CNAMEレコード**:
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

## トラブルシューティング

### ビルドエラーが発生する

1. ローカルで `pnpm build` が成功することを確認
2. Vercelのビルドログを確認
3. Node.jsのバージョンを確認（package.jsonで指定）

### Puppeteerが動作しない

Vercelは自動的にChromiumをインストールしますが、問題がある場合：

1. `next.config.js` の設定を確認
2. サーバーレス関数のメモリ制限を確認（デフォルト1024MB）

### デプロイは成功するが、実行時エラーが発生

1. Vercelのログ（Functions logs）を確認
2. 環境変数が正しく設定されているか確認
3. API routeのタイムアウト（デフォルト10秒）を確認

## 監視とログ

### Vercel Analytics

Vercel Analyticsを有効化して、パフォーマンスとユーザー動向を監視：

1. プロジェクトの「Analytics」タブに移動
2. 「Enable Analytics」をクリック

### Vercel Logs

リアルタイムログの確認：

1. プロジェクトの「Logs」タブに移動
2. Functions logs を選択
3. エラーやパフォーマンス問題をモニタリング

## 継続的デプロイ（CD）

GitHubとVercelの統合により、以下の自動デプロイが設定されます：

- **mainブランチへのプッシュ**: 本番環境に自動デプロイ
- **その他のブランチへのプッシュ**: プレビュー環境に自動デプロイ
- **プルリクエスト作成**: プレビュー環境に自動デプロイ

## デプロイ完了確認

以下を確認してデプロイ完了とします：

- [x] Vercelダッシュボードでデプロイステータスが「Ready」
- [ ] 本番URLにアクセスして動作確認
- [ ] 検索機能が正常に動作
- [ ] エラーハンドリングが正常に動作
- [ ] モバイルデバイスで動作確認
- [ ] Lighthouseスコアが要件を満たす

## 本番URL

デプロイ後、以下のURLでアクセス可能：

- **デフォルトURL**: `https://umi-facility-reservation.vercel.app`
- **カスタムドメイン**: （設定した場合）

## 関連ドキュメント

- [Vercelデプロイメントドキュメント](https://vercel.com/docs)
- [Next.js デプロイメント](https://nextjs.org/docs/deployment)
- [プロジェクトREADME](../../README.md)
