# 完全なスクレイピングフロー調査結果

## 調査日
2025-12-06

## 調査の経緯

当初のコード実装では以下の問題が発生していました：

1. **日付のズレ**: ユーザーが12/11を指定しても、12/10の結果が表示される
2. **施設選択の失敗**: 施設のチェックボックスを選択しても「施設を選んでください」エラー
3. **フロー認識の誤り**: 中間ページ（施設別空き状況ページ）の存在を見落としていた

## 正しいページ遷移フロー

```
Step 1: 検索ページ (WgR_ModeSelect)
  ↓ 使用目的選択（屋内スポーツ → バスケットボール）+ 検索ボタン

Step 2: 施設検索ページ (WgR_ShisetsuKensaku)
  ↓ 施設を全選択 + 「次へ進む」ボタン

Step 3: 施設別空き状況ページ (WgR_ShisetsubetsuAkiJoukyou) ★重要★
  ↓ 各施設で対象日を選択 + 「次へ進む」ボタン

Step 4: 時間帯別空き状況ページ (WgR_JikantaibetsuAkiJoukyou)
  ↓ ここで空き状況を取得
```

**重要**: Step 3（施設別空き状況ページ）が抜けていたのが問題の根本原因

---

## Step 2: 施設検索ページ詳細

### URL
`https://www.11489.jp/Umi/web/Yoyaku/WgR_ShisetsuKensaku`

### 施設選択の正しい方法

❌ **動作しない方法**:
```typescript
checkbox.checked = true;
checkbox.click();
```
→ チェックボックスのイベントハンドラーが `.checked` を強制的に `false` に戻す

✅ **動作する方法**:
```typescript
// labelをクリック
const label = document.querySelector(`label[for="${checkbox.id}"]`);
label.click();
```

### セレクタ

| 要素 | セレクタ | 説明 |
|------|---------|------|
| 施設チェックボックス | `.shisetsu input[type="checkbox"][name="checkShisetsu"]` | 全施設のチェックボックス |
| 施設ラベル | `label[for="checkShisetsu${facilityId}"]` | チェックボックスに対応するラベル |
| 次へ進むボタン | `.navbar .next > a` または `#btnNext` | 日付選択ページへ遷移 |

### 取得できる施設一覧（バスケットボール用）

```javascript
[
  { id: '341007', name: '宇美勤労者体育センター' },
  { id: '341009', name: '宇美南町民センター' },
  { id: '341014', name: '宇美町立宇美中学校' },
  { id: '341015', name: '宇美町立宇美東中学校' },
  { id: '341016', name: '宇美町立宇美南中学校' },
  { id: '341017', name: '宇美町立宇美小学校' },
  { id: '341018', name: '宇美町立宇美東小学校' },
  { id: '341019', name: '宇美町立原田小学校' },
  { id: '341020', name: '宇美町立桜原小学校' },
  { id: '341021', name: '宇美町立井野小学校' }
]
```

---

## Step 3: 施設別空き状況ページ詳細

### URL
`https://www.11489.jp/Umi/web/Yoyaku/WgR_ShisetsubetsuAkiJoukyou`

### ページ構造

- 各施設ごとにカレンダーが表示される（`.item .calendar`）
- 施設名: `.item h3`
- 横スクロール可能な日付リスト

### 日付セルの構造

```html
<input type="checkbox" name="checkdate" id="checkdate5" value="2025121100701   0">
<label for="checkdate5" class="switch-off">△</label>
```

#### 日付valueの形式

```
value="2025121100701   0"
       ^^^^^^^^ ^^^^^ ^^^
       日付     施設  不明
       YYYYMMDD コード
```

例:
- `2025120600701   0` → 2025年12月6日、施設コード701
- `2025121100701   0` → 2025年12月11日、施設コード701

#### ラベルの意味

| ラベル | 意味 | 選択可否 | 備考 |
|--------|------|----------|------|
| `○` | 空きあり | ✅ 選択可能 | 時間帯別で詳細確認 |
| `△` | 一部空き | ✅ 選択可能 | 時間帯別で詳細確認 |
| `×` | 空きなし | ❌ 選択不要 | 全時間帯予約済み |
| `－` | 対象外 | ⚠️ 選択可能だが意味なし | 予約対象外の日 |
| `休` | 休館日 | ❌ 選択不可 | disabled属性あり |

### 制約事項

- **最大10日まで選択可能**（手動調査レポートより）
- 10日を超えて選択するとエラーが表示される

### セレクタ

| 要素 | セレクタ | 説明 |
|------|---------|------|
| カレンダー（全施設分） | `.item .calendar` | 各施設のカレンダー要素 |
| 日付チェックボックス | `input[type="checkbox"][name="checkdate"]` | すべての日付セル |
| 日付ラベル | `label[for="${checkboxId}"]` | 空き状況表示（○△×－休） |
| 次へ進むボタン | `.navbar .next > a` | 時間帯別空き状況ページへ遷移 |

### 日付選択ロジック

1. 対象日付をDate型から `YYYYMMDD` 形式の文字列に変換
2. 各施設のカレンダーから、日付文字列で始まるvalueを持つチェックボックスを探す
3. ラベルが `○` または `△` のものだけを選択
4. `×`（空きなし）、`－`（対象外）、`休`（休館日）は選択しない

```typescript
// 例: 2025年12月11日を選択
const targetDateStr = '20251211'; // YYYYMMDD

// 各施設のカレンダーで対象日を選択
const checkboxes = document.querySelectorAll('input[name="checkdate"]');
checkboxes.forEach(checkbox => {
  if (checkbox.value.startsWith(targetDateStr)) {
    const label = document.querySelector(`label[for="${checkbox.id}"]`);
    const status = label?.textContent?.trim();

    // ○または△のみ選択
    if (status === '○' || status === '△') {
      label.click();
    }
  }
});
```

---

## Step 4: 時間帯別空き状況ページ詳細

### URL
`https://www.11489.jp/Umi/web/Yoyaku/WgR_JikantaibetsuAkiJoukyou`

### ページ構造

- 各施設ごとにテーブルが表示される（`.item .calendar`）
- 施設内のコートごとに行が分かれる（`.calendar tr`）
  - 例: 「倉庫側」「ステージ側」「全面」「入口側」
- 横スクロール可能な時間帯リスト（30分区切り）

### 時間帯セルの構造

```html
<tr>
  <td class="shisetsu">体育館　全面</td>
  <td><label>○</label></td>  <!-- 8:30-9:00 -->
  <td><label>×</label></td>  <!-- 9:00-9:30 -->
  <td><label>○</label></td>  <!-- 9:30-10:00 -->
  ...
</tr>
```

### セレクタ

| 要素 | セレクタ | 説明 |
|------|---------|------|
| カレンダー（全施設分） | `.item .calendar` | 各施設のカレンダー要素 |
| コート行 | `.calendar tr` | 各コート（倉庫側、全面など） |
| コート名 | `.calendar tr .shisetsu` | コートの名前 |
| 時間帯セル | `.calendar tr td label` | 各時間帯の空き状況 |

### 時間帯の解析

時間帯は8:30から30分区切りで並んでいます。

```typescript
// 開始時刻の計算
const startHour = 8;
const startMinute = 30;

// 各セルのインデックスから時刻を計算
function getTimeSlot(index: number): string {
  const totalMinutes = startHour * 60 + startMinute + index * 30;
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;

  const nextHour = Math.floor((totalMinutes + 30) / 60);
  const nextMinute = (totalMinutes + 30) % 60;

  return `${hour}:${String(minute).padStart(2, '0')}-${nextHour}:${String(nextMinute).padStart(2, '0')}`;
}
```

---

## 実装上の重要ポイント

### 1. チェックボックス選択は必ずlabelをクリック

```typescript
// ❌ これは動作しない
checkbox.checked = true;
checkbox.click();

// ✅ これが正しい
const label = document.querySelector(`label[for="${checkbox.id}"]`);
label.click();
```

### 2. 日付選択の順序

1. まず全施設を選択（Step 2）
2. 施設別空き状況ページに遷移（Step 3）
3. 各施設で対象日付を選択（Step 3）
4. 時間帯別空き状況ページに遷移（Step 4）
5. 空き状況を取得（Step 4）

### 3. ページ遷移の待機

```typescript
// 「次へ進む」ボタンをクリック
await page.click('.navbar .next > a');

// ページ遷移を待機
await page.waitForNavigation({
  waitUntil: 'networkidle0',
  timeout: 10000
});
```

### 4. ダイアログの自動受け入れ

```typescript
page.on('dialog', async dialog => {
  console.log('ダイアログ:', dialog.message());
  await dialog.accept();
});
```

---

## 修正が必要なコード箇所

### `src/lib/scraper/index.ts`

1. **`scrapeFacilities` メソッド**
   - Step 3（施設別空き状況ページ）の処理を追加
   - 日付選択ロジックを追加

2. **`selectFacilityAndNavigate` メソッド**
   - 施設選択を `label.click()` に変更
   - 全施設を選択するように変更

3. **新規メソッドの追加**
   - `selectDatesOnFacilityCalendar(page, dates)`: Step 3で日付を選択
   - `scrapeTimeSlots(page)`: Step 4で時間帯別空き状況を取得

### `src/app/api/scrape/route.ts`

- 日付パラメータの扱いを変更
- 複数日対応（最大10日まで）

---

## テスト結果

### 成功例

```
Step 1: 検索ページへアクセス ✅
Step 2a: 屋内スポーツを選択 ✅
Step 2b: バスケットボールを選択 ✅
Step 2c: 検索ボタンをクリック ✅
→ 施設検索ページへ遷移 ✅

Step 3a: すべての施設を選択 ✅
  総数: 10
  選択済み: 10

Step 3b: 「次へ進む」ボタンをクリック ✅
→ 施設別空き状況ページへ遷移 ✅
  URL: https://www.11489.jp/Umi/web/Yoyaku/WgR_ShisetsubetsuAkiJoukyou
  カレンダー数: 10（各施設ごと）
```

### 日付データ例

```json
{
  "facilityName": "宇美勤労者体育センター",
  "dateCells": [
    { "value": "2025120600701   0", "labelText": "－" },
    { "value": "2025120700701   0", "labelText": "△" },
    { "value": "2025120900701   0", "labelText": "△" },
    { "value": "2025121000701   0", "labelText": "△" },
    { "value": "2025121100701   0", "labelText": "△" },
    { "value": "2025121200701   0", "labelText": "△" },
    { "value": "2025121300701   0", "labelText": "△" },
    { "value": "2025121400701   0", "labelText": "△" }
  ]
}
```

---

## 保存されたファイル

調査過程で以下のファイルが生成されました：

- `search-form-initial.html` - 検索フォームの初期状態
- `search-form-after-sports.html` - 屋内スポーツ選択後
- `date-selection-page.html` - 施設一覧ページ（エラー時）
- `step3-facility-date-calendar.html` - 施設別空き状況ページ（成功）
- `step3-facility-date-calendar.png` - スクリーンショット

---

## 次のステップ

1. Step 4（時間帯別空き状況ページ）の詳細調査
2. コードの修正実装
   - `selectFacilityAndNavigate` の修正
   - `selectDatesOnFacilityCalendar` の追加
   - `scrapeTimeSlots` の追加
3. 統合テスト
4. エラーハンドリングの強化

---

**作成者**: Claude (AI Assistant)
**ステータス**: 完了（Step 3まで確認済み、Step 4の詳細調査が残っている）
