# 宇美町施設予約システム スクレイピング実装ガイド

## 調査日
2025-12-06

## 対象URL
https://www.11489.jp/Umi/web/Home/WgR_ModeSelect

## システム概要

宇美町の公共施設予約システムは、以下の検索方法を提供しています:

1. カテゴリーから探す（施設種類）
2. 使用目的から探す（スポーツ種目）
3. 施設種類から探す
4. 施設名から探す
5. 利用者区分から探す
6. 一覧から探す

本アプリでは、**「使用目的から探す」**を使用してバスケットボール施設を検索します。

## HTML構造

### 1. 初期ページ (WgR_ModeSelect)

#### フォーム
```html
<form id="form1" method="post" action="https://www.11489.jp/Umi/web/Home/WgR_ModeSelect">
```

#### 使用目的の大分類（ラジオボタン）
```html
<input type="radio" name="radioPurposeLarge" value="01" id="radioPurposeLarge01" checked> 屋外スポーツ
<input type="radio" name="radioPurposeLarge" value="02" id="radioPurposeLarge02"> 屋内スポーツ
<input type="radio" name="radioPurposeLarge" value="03" id="radioPurposeLarge03"> 文化活動
<input type="radio" name="radioPurposeLarge" value="99" id="radioPurposeLarge99"> その他
```

**セレクタ**: `#radioPurposeLarge02` （屋内スポーツ）

#### 屋内スポーツの種目（チェックボックス）

屋内スポーツを選択すると、以下のチェックボックスが表示されます:

| スポーツ名 | value | id |
|-----------|-------|-----|
| ドッジボール | 500 | checkPurposeMiddle500 |
| **バスケットボール** | **505** | **checkPurposeMiddle505** |
| **ミニバスケットボール** | **510** | **checkPurposeMiddle510** |
| 卓球 | 515 | checkPurposeMiddle515 |
| バドミントン | 520 | checkPurposeMiddle520 |
| 軽スポーツ | 585 | checkPurposeMiddle585 |
| ソフトバレーボール | 605 | checkPurposeMiddle605 |
| 柔道 | 610 | checkPurposeMiddle610 |
| 剣道 | 615 | checkPurposeMiddle615 |
| 合気道 | 620 | checkPurposeMiddle620 |
| 体操 | 625 | checkPurposeMiddle625 |
| ダンス | 630 | checkPurposeMiddle630 |
| バレーボール | 645 | checkPurposeMiddle645 |
| 空手 | 650 | checkPurposeMiddle650 |
| 催しもの（体育屋内） | 680 | checkPurposeMiddle680 |
| レクリエーション（体育屋内） | 685 | checkPurposeMiddle685 |
| 軽スポーツ（体育屋内） | 690 | checkPurposeMiddle690 |

**必要なセレクタ**:
- バスケットボール: `#checkPurposeMiddle505`
- ミニバスケットボール: `#checkPurposeMiddle510`

#### 検索ボタン
```html
<input type="button" value=" 検索" id="btnSearchViaPurpose" class="btnSky large">
```

**セレクタ**: `#btnSearchViaPurpose`

### 2. カテゴリーから探す（代替方法）

```html
<input type="button" value="体育施設" id="category_01" name="command" class="btnSky">
<input type="button" value="文化施設" id="category_02" name="command" class="btnSky">
<input type="button" value="複合施設" id="category_03" name="command" class="btnSky">
```

**セレクタ**: `#category_01` （体育施設）

## 重要な発見: AJAXによる動的読み込み

ラジオボタンには `onclick="radioMokutekiSubmit(value);"` が設定されており、この関数は以下を実行します:

```javascript
function radioMokutekiSubmit(code){
  $.ajax({
    url: 'GetMokutekiBunruiAjax',
    type: "GET",
    datatype: "json",
    cache: false,
    data: { values: [code] },
    traditional: true,
    success: function (data) {
      $("#purposetag").html((data));  // スポーツ種目のHTMLを動的に挿入
      // ...
    }
  });
}
```

つまり、屋内スポーツ（value="02"）を選択すると、サーバーから対応するスポーツ種目のリストがAJAXで取得されます。

## スクレイピング実装フロー

### 方法1: 使用目的から探す（AJAX対応版）

```typescript
// 1. 初期ページにアクセス
await page.goto('https://www.11489.jp/Umi/web/Home/WgR_ModeSelect', {
  waitUntil: 'networkidle0',
});

// 2. 屋内スポーツを選択（ラジオボタンをクリック）
await page.click('label[for="radioPurposeLarge02"]');

// 3. AJAXリクエストが完了し、スポーツ種目が表示されるまで待機
await page.waitForSelector('#checkPurposeMiddle505', {
  visible: true,
  timeout: 10000,
});

// 少し待機（DOMが完全に更新されるまで）
await new Promise(resolve => setTimeout(resolve, 1000));

// 4. バスケットボールとミニバスケットボールを選択
await page.click('label[for="checkPurposeMiddle505"]');
await page.click('label[for="checkPurposeMiddle510"]');

// 5. 検索ボタンをクリック
const navigationPromise = page.waitForNavigation({
  waitUntil: 'networkidle0',
  timeout: 30000,
});

await page.click('#btnSearchViaPurpose');

// 6. ページ遷移を待機
await navigationPromise;
```

**重要ポイント**:
- ラジオボタン/チェックボックスは直接クリックせず、`label` 要素をクリック
- AJAX完了を `waitForSelector` で待機
- ボタンクリック前に `waitForNavigation` をセットアップ

### 方法2: カテゴリーから探す（シンプル）

```typescript
// 1. 初期ページにアクセス
await page.goto('https://www.11489.jp/Umi/web/Home/WgR_ModeSelect');

// 2. 体育施設ボタンをクリック
await page.evaluate(() => {
  const btn = document.querySelector('#category_01') as HTMLInputElement;
  if (btn) {
    btn.click();
  }
});

// 3. ページ遷移を待機
await page.waitForNavigation({ waitUntil: 'networkidle0' });
```

## 注意事項

### JavaScript操作が必要

このシステムは JavaScript で動的に要素を表示/非表示しているため:

1. **直接的な `page.click()` が使えない場合がある**
   - 代わりに `page.evaluate()` でブラウザ内のJavaScriptを実行

2. **イベントリスナーが設定されている**
   - ラジオボタンやチェックボックスは `click()` でイベントを発火させる必要がある

3. **要素の表示状態を確認する**
   - `waitForFunction()` や `waitForSelector()` で要素が表示されるまで待機

### バリデーション

検索ボタンをクリックする前に、以下を確認する必要があります:

```javascript
// エラー例: "使用目的を選んでください。"
// 少なくとも1つのチェックボックスが選択されている必要がある
```

### User-Agent

スクレイピングであることを明示するため、User-Agentを設定:

```typescript
await page.setUserAgent('Mozilla/5.0 (compatible; UmiFacilitySearch/1.0)');
```

## 次のステップ（施設一覧ページ以降）

**TODO**: 以下のページ遷移フローを調査する必要があります:

1. 施設一覧ページ
   - 施設のチェックボックスのセレクタ
   - 「次へ進む」ボタンのセレクタ

2. 日付選択ページ
   - カレンダーのHTML構造
   - 日付選択のセレクタ

3. 時間帯一覧ページ
   - 時間帯テーブルのHTML構造
   - 空き状況（◯△×）の表現方法

## 調査データの保存先

- `docs/investigation/step1-mode-select.html` - 初期ページのHTML
- `docs/investigation/step1-screenshot.png` - 初期ページのスクリーンショット
- `docs/investigation/step2-indoor-sports.html` - 屋内スポーツ選択後のHTML
- `docs/investigation/step2-indoor-sports.png` - 屋内スポーツ選択後のスクリーンショット
- `docs/investigation/step3-basketball-selected.png` - バスケットボール選択後のスクリーンショット

## 解決済みの課題

### ✅ 課題1: チェックボックス選択が反映されない（解決済み）

**症状**:
- Puppeteerの `label.click()` ではチェックボックスの `.checked` プロパティが `false` のまま
- `searchMokuteki()` が「使用目的を選んでください」エラーを返す

**原因**:
- サイトのJavaScriptが `.checked` プロパティを直接確認している
- `label.click()` では `.checked` が正しく更新されない

**解決策**:
```typescript
// .checked プロパティを直接設定
checkbox505.checked = true;
checkbox510.checked = true;

// イベントを発火
const changeEvent = new Event('change', { bubbles: true });
checkbox505.dispatchEvent(changeEvent);
checkbox510.dispatchEvent(changeEvent);
```

### ✅ 課題2: 「ページから離れますか？」ダイアログ（解決済み）

**症状**:
- ページ遷移時に `beforeunload` ダイアログが表示される
- 手動で「離れる」を選択しないと進まない

**解決策**:
```typescript
// ダイアログを自動的に受け入れる
page.on('dialog', async dialog => {
  await dialog.accept();
});
```

### ✅ 課題3: 空き状況の取得方法（解決済み）

**発見**:
- 施設一覧ページには既に各施設の「本日の予定」が表示されている
- 施設を選択して別ページに遷移する必要はない

**実装方針**:
- 施設一覧ページから直接、各施設の予定をスクレイピング
- 見出し（例: "宇美勤労者体育センターの本日の予定"）を探す
- その下の `.item_wrap` から部屋/エリアごとの予定を取得

## 実装の方針

### フェーズ1: 基本的な操作フローの確立

1. 手動操作で正しいフローを確認
2. 各ステップのHTMLを保存
3. 正しいセレクタとイベント発火方法を特定

### フェーズ2: Puppeteerスクリプトの実装

1. 初期ページ → 施設一覧ページ
2. 施設一覧ページ → 日付選択ページ
3. 日付選択ページ → 時間帯一覧ページ
4. 時間帯一覧ページのパース

### フェーズ3: エラーハンドリング

1. タイムアウト処理
2. ネットワークエラー処理
3. バリデーションエラー処理
4. リトライ処理

## 参考情報

### 技術スタック
- Puppeteer: ブラウザ自動操作
- Cheerio: HTMLパース（現在のparser.tsで使用）
- TypeScript: 型安全な実装

### 既存コード
- `src/lib/scraper/index.ts`: FacilityScraperクラス
- `src/lib/scraper/parser.ts`: HTMLパーサー
- `src/app/api/scrape/route.ts`: APIエンドポイント
