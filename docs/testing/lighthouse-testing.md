# Lighthouseパフォーマンステスト手順書

## 概要

このドキュメントでは、宇美町施設予約検索システムのLighthouseパフォーマンステストの実施方法を説明します。

## 目標スコア

- **Performance**: 90以上
- **Accessibility**: 90以上
- **Best Practices**: 90以上
- **SEO**: 90以上

### Core Web Vitals目標値

- **FCP (First Contentful Paint)**: 1.8秒以下
- **LCP (Largest Contentful Paint)**: 2.5秒以下
- **TBT (Total Blocking Time)**: 200ms以下
- **CLS (Cumulative Layout Shift)**: 0.1以下

## テスト環境

### ローカル環境でのテスト

1. **本番ビルドの作成**

   ```bash
   pnpm build
   ```

2. **本番サーバーの起動**

   ```bash
   pnpm start
   ```

   デフォルトでは http://localhost:3000 で起動します。

3. **Lighthouseの実行**

   #### 方法1: Chrome DevTools（推奨）

   1. Google Chromeを開く
   2. DevToolsを開く（F12またはCmd+Option+I）
   3. 「Lighthouse」タブを選択
   4. 設定:
      - Mode: Navigation
      - Device: Mobile
      - Categories: すべて選択
   5. 「Analyze page load」をクリック

   #### 方法2: Lighthouse CLI

   ```bash
   # Lighthouseのインストール（グローバル）
   npm install -g lighthouse

   # ホームページのテスト
   lighthouse http://localhost:3000 \
     --output html \
     --output-path ./lighthouse-report-home.html \
     --chrome-flags="--headless" \
     --only-categories=performance,accessibility,best-practices,seo \
     --form-factor=mobile

   # 結果ページのテスト（静的ページ）
   lighthouse http://localhost:3000/results \
     --output html \
     --output-path ./lighthouse-report-results.html \
     --chrome-flags="--headless" \
     --only-categories=performance,accessibility,best-practices,seo \
     --form-factor=mobile
   ```

### Render.com（本番環境）でのテスト

1. **デプロイURLを確認**

   Render.comにデプロイ後、デプロイURLを取得します。
   本番URL: `https://umi-facility-reservation.onrender.com`

2. **Lighthouseの実行**

   上記の方法1または方法2を使用し、URLを本番URLに変更します。

   ```bash
   lighthouse https://umi-facility-reservation.onrender.com \
     --output html \
     --output-path ./lighthouse-report-production.html \
     --chrome-flags="--headless" \
     --only-categories=performance,accessibility,best-practices,seo \
     --form-factor=mobile
   ```

## テスト対象ページ

1. **ホームページ (`/`)**
   - 検索フォームの表示
   - 初期ロード時のパフォーマンス

2. **結果ページ (`/results`)**
   - 静的ページとしてのパフォーマンス
   - アクセシビリティ

## パフォーマンス最適化チェックリスト

### 実施済み最適化

- [x] next/fontによるフォント最適化
- [x] TailwindCSSによるCSS最適化
- [x] バンドルサイズ最適化（gzip後254.87 KB）
- [x] Tree Shaking有効化
- [x] SWC Minify有効化
- [x] gzip圧縮有効化
- [x] font-display: swap設定
- [x] preload設定

### 確認項目

- [ ] LCP要素が適切に最適化されているか
- [ ] 不要なJavaScriptが読み込まれていないか
- [ ] レンダリングブロックリソースがないか
- [ ] 画像が最適化されているか（該当する場合）
- [ ] CSSが最適化されているか

## 問題が発生した場合

### Performance スコアが90未満の場合

1. バンドルサイズを確認
   ```bash
   ./check-bundle-size.sh
   ```

2. 不要な依存関係がないか確認
   ```bash
   pnpm list --depth=0
   ```

3. Dynamic Importを検討

### Accessibility スコアが90未満の場合

1. セマンティックHTMLの使用を確認
2. ARIA属性の適切な使用を確認
3. カラーコントラスト比を確認（4.5:1以上）
4. フォーカス管理を確認

### LCP が2.5秒を超える場合

1. フォントのプリロードを確認
2. 重要なリソースのプリロードを追加
3. レンダリングブロックリソースを削減

## レポートの保存

Lighthouseレポートは以下の場所に保存してください：

```
docs/testing/lighthouse-reports/
├── YYYY-MM-DD-home.html
├── YYYY-MM-DD-results.html
└── YYYY-MM-DD-production.html
```

## 参考リンク

- [Lighthouse Documentation](https://developers.google.com/web/tools/lighthouse)
- [Core Web Vitals](https://web.dev/vitals/)
- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)
