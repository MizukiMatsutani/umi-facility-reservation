# デプロイ記録

## 本番環境デプロイ完了

### デプロイ情報

- **デプロイ日時**: 2025年12月7日
- **デプロイ方法**: Vercel CLI
- **本番URL**: https://umi-facility-reservation.vercel.app
- **プレビューURL**: https://umi-facility-reservation-caiqzn15j-garcons-projects.vercel.app
- **Vercelプロジェクト名**: umi-facility-reservation
- **Node.jsバージョン**: 24.x

### ビルド情報

- **ビルド時間**: 39秒
- **ビルド場所**: Portland, USA (West) – pdx1
- **ビルドマシン**: 2 cores, 8 GB
- **Next.jsバージョン**: 16.0.7
- **pnpmバージョン**: 10.24.0

### デプロイ済みページ

- `/` - トップページ（静的生成）
- `/_not-found` - 404ページ（静的生成）
- `/api/scrape` - スクレイピングAPIエンドポイント（動的）
- `/results` - 検索結果ページ（静的生成）

### デプロイログ（要約）

```
✓ Compiled successfully in 11.5s
Running TypeScript ...
Collecting page data using 1 worker ...
✓ Generating static pages using 1 worker (6/6) in 584.0ms
Finalizing page optimization ...

Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /api/scrape
└ ○ /results

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

### HTTPヘッダー確認

```
HTTP/2 200
cache-control: public, max-age=0, must-revalidate
content-type: text/html; charset=utf-8
x-nextjs-prerender: 1
x-vercel-cache: PRERENDER
```

## 動作確認

### 基本確認項目

- [x] デプロイ成功
- [x] 本番URLアクセス可能（HTTP 200）
- [x] Next.jsプリレンダリング動作確認
- [x] Vercelキャッシュ動作確認

### 次のステップ

以下の確認が必要です：

1. **ブラウザでの動作確認**
   - [ ] トップページの表示確認
   - [ ] 検索フォームの動作確認
   - [ ] 検索実行の動作確認
   - [ ] 結果表示の動作確認

2. **モバイルデバイスでの確認**
   - [ ] iOS Safari 14+ での動作確認
   - [ ] Android Chrome 90+ での動作確認

3. **パフォーマンステスト**
   - [ ] Lighthouse スコア測定
   - [ ] FCP, LCP メトリクス確認

4. **機能テスト**
   - [ ] スクレイピング機能の動作確認
   - [ ] エラーハンドリングの確認
   - [ ] 日付選択の確認
   - [ ] 時間範囲フィルタリングの確認

## GitHub統合

GitHubリポジトリとの統合時に以下のメッセージが表示されました：

```
Error: Failed to connect MizukiMatsutani/umi-facility-reservation to project.
```

この警告は表示されましたが、デプロイ自体は正常に完了しました。今後、GitHub統合を有効にする場合は、Vercelダッシュボードから手動で設定する必要があります。

### GitHub統合の設定手順（オプション）

1. https://vercel.com にアクセス
2. プロジェクト `umi-facility-reservation` を選択
3. 「Settings」→「Git」に移動
4. GitHubリポジトリを接続

GitHub統合を有効にすることで、mainブランチへのプッシュ時に自動デプロイされます。

## トラブルシューティング

### プレビューURLで401エラー

プレビューURL（`https://umi-facility-reservation-caiqzn15j-garcons-projects.vercel.app`）では401エラーが発生しますが、これはVercelのSSO（シングルサインオン）が有効になっているためです。

本番URL（`https://umi-facility-reservation.vercel.app`）は正常にアクセス可能です。

## 関連リンク

- **本番URL**: https://umi-facility-reservation.vercel.app
- **Vercelダッシュボード**: https://vercel.com/garcons-projects/umi-facility-reservation
- **GitHubリポジトリ**: https://github.com/MizukiMatsutani/umi-facility-reservation
