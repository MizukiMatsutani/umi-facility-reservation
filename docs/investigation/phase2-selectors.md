# Phase 2 HTMLセレクタ調査レポート

## 調査日
2025-12-06

## 概要

このドキュメントは、Phase 2（完全なスクレイピングフロー）実装に必要なHTMLセレクタと操作方法をまとめたものです。

## ページ遷移フロー

```
1. 施設検索ページ (WgR_ModeSelect)
   ↓ スポーツ種目選択 + 検索
2. 施設一覧ページ (WgR_ShisetsuKensaku)
   ↓ 施設選択 + 「次へ進む」
3. 日付選択ページ (??)
   ↓ 日付選択
4. 空き状況ページ (??)
```

---

## 1. 施設一覧ページ → 日付選択ページ

### ページURL
- **遷移前**: `https://www.11489.jp/Umi/web/Home/WgR_ShisetsuKensaku`
- **遷移後**: (調査中)

### 必要な操作

#### 1.1 施設のチェックボックスを選択

**HTML構造**:
```html
<input type="checkbox" name="checkShisetsu" id="checkShisetsu341007" value="341007" onclick="showNextTip();">
<label for="checkShisetsu341007" class="switch-off">宇美勤労者体育センター</label>
```

**セレクタ**:
- チェックボックス: `input[name="checkShisetsu"][value="${facilityId}"]`
- または ID指定: `#checkShisetsu${facilityId}`
- 例: `#checkShisetsu341007` (宇美勤労者体育センター)

**選択方法**:
```typescript
// 方法1: page.evaluate() でcheckedプロパティを設定
await page.evaluate((facilityId) => {
  const checkbox = document.querySelector(`#checkShisetsu${facilityId}`) as HTMLInputElement;
  if (checkbox) {
    checkbox.checked = true;
    checkbox.click(); // onclickイベントを発火
  }
}, facility.id);

// 方法2: labelをクリック（推奨）
await page.click(`label[for="checkShisetsu${facility.id}"]`);
```

**利用可能な施設ID**:
- 341007: 宇美勤労者体育センター
- 341009: 宇美南町民センター
- 341014: 宇美町立宇美中学校
- 341015: 宇美町立宇美東中学校
- 341016: 宇美町立宇美南中学校
- 341017: 宇美町立宇美小学校
- 341018: 宇美町立宇美東小学校
- 341019: 宇美町立原田小学校
- 341020: 宇美町立桜原小学校
- 341021: 宇美町立井野小学校

#### 1.2 「次へ進む」ボタンをクリック

**HTML構造**:
```html
<li class="next">
  <a href="javascript:__doPostBack('next','')" class="btnBlue tooltipstered" id="btnNext">次へ進む</a>
</li>
```

**セレクタ**: `#btnNext`

**クリック方法**:
```typescript
// waitForNavigationを先にセットアップしてからクリック
await Promise.all([
  page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }),
  page.click('#btnNext'),
]);
```

**重要な注意事項**:
- `__doPostBack('next','')` 関数を呼び出してフォーム送信を行う
- ページ遷移が発生するため、`waitForNavigation` を使用
- タイムアウトは10秒を推奨

---

## 2. 日付選択ページ → 空き状況ページ

### ページURL
- **遷移前**: (調査中 - おそらく `WgR_ShisetsuDate` または類似)
- **遷移後**: (調査中 - おそらく `WgR_AkiJokyoJikanobetsu` または類似)

### 想定される操作

#### 2.1 カレンダーから日付を選択

**想定されるHTML構造** (jQuery UI Datepickerを使用している可能性):
```html
<!-- オプション1: jQuery UI Datepicker -->
<table class="ui-datepicker-calendar">
  <tbody>
    <tr>
      <td data-month="11" data-year="2025">
        <a class="ui-state-default" href="#" data-date="10">10</a>
      </td>
    </tr>
  </tbody>
</table>

<!-- オプション2: カスタムカレンダー -->
<td class="date-cell" data-date="2025-12-10" onclick="selectDate('2025-12-10')">
  <a>10</a>
</td>
```

**想定されるセレクタ**:
- jQuery UI Datepicker: `td[data-year="${year}"][data-month="${month}"] a[data-date="${day}"]`
- カスタム実装: `td[data-date="${dateStr}"]` or `a[data-date="${dateStr}"]`

**選択方法** (date-fnsでフォーマット):
```typescript
import { format } from 'date-fns';

const dateStr = format(targetDate, 'yyyy-MM-dd'); // 例: "2025-12-10"

// 方法1: data-date属性がある場合
await page.click(`[data-date="${dateStr}"]`);

// 方法2: jQuery UI Datepickerの場合
const year = targetDate.getFullYear();
const month = targetDate.getMonth(); // 0-indexed
const day = targetDate.getDate();

await page.evaluate((y, m, d) => {
  const cell = document.querySelector(
    `td[data-year="${y}"][data-month="${m}"] a[data-date="${d}"]`
  ) as HTMLElement;
  if (cell) {
    cell.click();
  }
}, year, month, day);
```

#### 2.2 検索/次へボタンをクリック

**想定されるセレクタ**:
- `#btnSearch` または `#btnNext` または類似のID
- `input[type="button"][value*="検索"]` (value属性に「検索」を含む)
- `a.btnBlue` (施設一覧ページと同じスタイルクラス)

**クリック方法**:
```typescript
await Promise.all([
  page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }),
  page.click('#btnSearch'), // または適切なセレクタ
]);
```

---

## 3. 空き状況ページでのデータ取得

### ページURL
- **URL**: (調査中)

### 想定される操作

#### 3.1 時間帯テーブルのパース

**想定されるHTML構造**:
```html
<table class="availability-table">
  <thead>
    <tr>
      <th>時間</th>
      <th>空き状況</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td class="time">8:30 - 9:00</td>
      <td class="status">○</td> <!-- 空き -->
    </tr>
    <tr>
      <td class="time">9:00 - 9:30</td>
      <td class="status">△</td> <!-- 一部空き -->
    </tr>
    <tr>
      <td class="time">9:30 - 10:00</td>
      <td class="status">×</td> <!-- 空いていない -->
    </tr>
    <tr>
      <td class="time">10:00 - 10:30</td>
      <td class="status">-</td> <!-- 対象外 -->
    </tr>
  </tbody>
</table>
```

**パース方法**:
```typescript
const timeSlots = await page.evaluate(() => {
  const rows = Array.from(document.querySelectorAll('table tbody tr'));

  return rows.map(row => {
    const timeCellText = row.querySelector('td.time')?.textContent?.trim() || '';
    const statusCellText = row.querySelector('td.status')?.textContent?.trim() || '';

    // 時刻の開始時間を抽出 (例: "8:30 - 9:00" → "08:30")
    const startTime = timeCellText.split('-')[0]?.trim() || '';

    // ステータスの判定
    // ○ = 空き, △ = 一部空き (空きとして扱う), × = 空いていない, - = 対象外
    const available = statusCellText === '○' || statusCellText === '△';

    return {
      time: startTime,
      available,
    };
  }).filter(slot => slot.time); // 時刻が空のものは除外
});

return timeSlots;
```

**ステータス記号の解釈**:
- `○`: 空き → `available: true`
- `△`: 一部空き → `available: true`
- `×`: 空いていない → `available: false`
- `-`: 対象外 → `available: false`

---

## 4. ブラウザの戻るナビゲーション

複数の日付を検索する場合、空き状況ページから日付選択ページに戻る必要があります。

**戻る方法**:
```typescript
await Promise.all([
  page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }),
  page.goBack(),
]);
```

**URL確認** (オプション):
```typescript
const currentUrl = page.url();
console.log('Navigated back to:', currentUrl);
```

---

## 5. 実装時の注意事項

### 5.1 ページ遷移の待機

すべてのページ遷移操作（クリック、戻る）では、`waitForNavigation` を使用:

```typescript
// 正しい順序
await Promise.all([
  page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }),
  page.click('#btnNext'),
]);

// 間違った順序（タイムアウトの可能性）
await page.click('#btnNext');
await page.waitForNavigation(); // ❌ すでに遷移済みの可能性
```

### 5.2 タイムアウト設定

- **短い操作** (チェックボックス選択など): タイムアウト不要
- **ページ遷移**: 10秒タイムアウト推奨
- **全体のスクレイピング**: 30秒タイムアウト推奨

### 5.3 エラーハンドリング

各ステップでエラーが発生する可能性があります:

```typescript
try {
  await page.click('#btnNext');
} catch (error) {
  throw new Error(`日付選択ページへの遷移に失敗: ${error.message}`);
}
```

### 5.4 要素の存在確認

セレクタでクリックする前に、要素の存在を確認:

```typescript
// オプション1: waitForSelector
await page.waitForSelector('#btnNext', { timeout: 5000 });
await page.click('#btnNext');

// オプション2: page.evaluate で存在確認
const buttonExists = await page.evaluate(() => {
  return !!document.querySelector('#btnNext');
});

if (!buttonExists) {
  throw new Error('「次へ進む」ボタンが見つかりません');
}
```

---

## 6. 未調査項目

以下の項目は、実際のページにアクセスして確認する必要があります:

### 6.1 日付選択ページ
- [ ] ページのURL
- [ ] カレンダーUIの実装方法（jQuery UI Datepicker? カスタム実装?）
- [ ] 日付セルの正確なセレクタ
- [ ] 日付フォーマット（`data-date="2025-12-10"` ? `data-date="10"` ?）
- [ ] 検索/次へボタンのセレクタとID

### 6.2 空き状況ページ
- [ ] ページのURL
- [ ] 時間帯テーブルの正確なHTML構造
- [ ] テーブルのセレクタ (クラス名、ID)
- [ ] 時刻セルとステータスセルのセレクタ
- [ ] ステータス記号の実際の表現（`○`, `△`, `×`, `-` ?)
- [ ] 時刻のフォーマット（`8:30 - 9:00` ? `08:30` ?）

### 6.3 その他
- [ ] 日付選択時にエラーダイアログが表示される条件
- [ ] 予約不可の日付の扱い（カレンダーでdisabled?）
- [ ] ページ遷移時のローディング表示の有無

---

## 7. 次のステップ

1. **手動調査**
   - ブラウザで実際のフローを確認
   - DevToolsでセレクタを特定
   - HTML構造をコピー

2. **調査スクリプトの実行**
   - `scripts/investigate-phase2-pages.ts` を修正して実行
   - 日付選択ページと空き状況ページのHTMLを保存
   - スクリーンショットを撮影

3. **このドキュメントの更新**
   - 未調査項目を埋める
   - セレクタを確定
   - サンプルコードを修正

4. **実装開始**
   - `src/lib/scraper/index.ts` に新しいメソッドを追加
   - タスク 3.5.2 〜 3.5.8 を順次実装

---

## 付録: 調査に使用したHTMLファイル

- `docs/investigation/facility-list-auto.html` - 施設一覧ページ
- `docs/investigation/availability-page-auto.html` - (未確認)
- `docs/investigation/phase2-*.html` - (未作成)

---

**作成者**: Claude (AI Assistant)
**ステータス**: 部分的に完了（日付選択・空き状況ページの詳細調査が必要）
