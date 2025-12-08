# 直接API実装の調査結果と実装方針

## 調査日時
2025-12-08

## 調査概要
レガシーモードでの全画面遷移を実行し、各ステップのHTML、POSTデータ、URLをキャプチャして分析しました。

## キャプチャしたデータ
- Step 1: モード選択ページ（初期ページ）
- Step 2: バスケットボール検索実行後の施設リストページ
- Step 3: 施設選択後の施設別空き状況ページ
- Step 4: 日付選択後の時間帯別空き状況ページ（最終目的ページ）

## 発見した4ステップのPOSTフロー

### Step 1: モード選択ページ取得
**目的**: CSRFトークンを取得

- URL: `https://www.11489.jp/Umi/web/Home/WgR_ModeSelect`
- Method: GET
- レスポンス: CSRFトークンを含むHTML

**実装ポイント**:
- HTMLから`<input name="__RequestVerificationToken">`の value を抽出
- このトークンを次のPOSTリクエストで使用

### Step 2: バスケットボール検索
**目的**: 施設リストを取得

- URL: `https://www.11489.jp/Umi/web/Home/WgR_ModeSelect`
- Method: POST
- Content-Type: `application/x-www-form-urlencoded`

**POSTパラメータ**:
```json
{
  "__RequestVerificationToken": "(Step 1で取得したトークン)",
  "__EVENTTARGET": "btnSearchViaPurpose",
  "__EVENTARGUMENT": "",
  "radioPurposeLarge": "02",
  "checkPurposeMiddle": ["505", "510"],
  "radioShisetsuLarge": "01",
  "shisetsuNameTxt": ""
}
```

**固定パラメータ**:
- `radioPurposeLarge`: "02" （スポーツ屋内）
- `checkPurposeMiddle`: ["505", "510"] （バスケットボール）
- `radioShisetsuLarge`: "01"
- `shisetsuNameTxt`: "" （空文字列）
- `__EVENTTARGET`: "btnSearchViaPurpose"
- `__EVENTARGUMENT`: ""

**レスポンス**:
- 施設リストページのHTML
- HTMLには以下が含まれる:
  - 新しい`__RequestVerificationToken`
  - `<input type="hidden" name="map_XXXXXX" value="...">`（施設ごとのGoogle Mapsリンク）
  - `<input type="checkbox" name="checkShisetsu" value="XXXXXX">`（施設ID）

**実装ポイント**:
- レスポンスHTMLから新しいCSRFトークンを抽出
- レスポンスHTMLから`map_*` hidden inputフィールドを全て抽出
  - セレクタ: `input[type="hidden"][name^="map_"]`
  - 各要素の name と value を保存
- レスポンスHTMLから施設IDを抽出
  - セレクタ: `input[type="checkbox"][name="checkShisetsu"]`
  - 各要素の value を保存

### Step 3: 施設選択して空き状況ページへ遷移
**目的**: 施設別空き状況ページを取得

- URL: `https://www.11489.jp/Umi/web/Yoyaku/WgR_ShisetsuKensaku`
- Method: POST
- Content-Type: `application/x-www-form-urlencoded`

**POSTパラメータ**:
```json
{
  "__RequestVerificationToken": "(Step 2で取得したトークン)",
  "__EVENTTARGET": "next",
  "__EVENTARGUMENT": "",
  "map_341007": "http://maps.google.co.jp/maps?...",
  "map_341009": "http://maps.google.co.jp/maps?...",
  ... (他のmap_フィールド - Step 2で抽出したもの全て),
  "checkShisetsu": ["341007", "341009", ...],
  "HyojiMode": "filterAll"
}
```

**固定パラメータ**:
- `__EVENTTARGET`: "next"
- `__EVENTARGUMENT`: ""
- `HyojiMode`: "filterAll"

**動的パラメータ**:
- `__RequestVerificationToken`: Step 2のレスポンスから抽出
- `map_*`: Step 2のレスポンスから抽出した全てのmap_フィールド
- `checkShisetsu`: Step 2のレスポンスから抽出した全ての施設ID

**レスポンス**:
- 施設別空き状況ページのHTML
- このページには横型カレンダーが含まれ、各施設の空き状況が表示される
- HTMLには以下が含まれる:
  - `<input type="checkbox" name="checkdate" value="2025120900701   0">` （日付と施設のチェックボックス）
  - valueの形式: `YYYYMMDD` + 施設コード + スペース + フラグ

### Step 4: 日付選択して時間帯別空き状況ページへ遷移
**目的**: 時間帯別空き状況ページを取得（最終目的ページ）

- POST URL: `https://www.11489.jp/Umi/web/Yoyaku/WgR_ShisetsubetsuAkiJoukyou` （Step 3と同じURL）
- Method: POST
- Content-Type: `application/x-www-form-urlencoded`

**POSTパラメータ**:
```json
{
  "__RequestVerificationToken": "(Step 3で取得したトークン)",
  "__EVENTTARGET": "next",
  "__EVENTARGUMENT": "",
  "textDate": "2025/12/8",
  "radioPeriod": "2週間",
  "radioDisplay": "false",
  "radioJikan": "all",
  "checkdate": [
    "2025120900701   0",
    "2025120900907   0",
    "2025120901401   0",
    "2025120901501   0",
    "2025120901601   0",
    "2025120901701   0",
    "2025120901801   0",
    "2025120901901   0",
    "2025120902001   0",
    "2025120902101   0"
  ],
  "staydate": "",
  "hyoujiOpenCloseFlg": "close"
}
```

**固定パラメータ**:
- `__EVENTTARGET`: "next"
- `__EVENTARGUMENT`: ""
- `radioPeriod`: "2週間"
- `radioDisplay`: "false"
- `radioJikan`: "all"
- `staydate`: ""
- `hyoujiOpenCloseFlg`: "close"

**動的パラメータ**:
- `__RequestVerificationToken`: Step 3のレスポンスから抽出
- `textDate`: 選択した日付（yyyy/MM/dd形式）- Step 3ページの初期表示日付
- `checkdate`: **【重要】** Step 3のレスポンスから抽出した日付チェックボックスの値（配列）
  - セレクタ: `input[type="checkbox"][name="checkdate"]`
  - 各施設ごとに各日付のチェックボックスがある
  - 例: 10施設 × 12日分 = 120個のチェックボックス
  - 選択したい日付のチェックボックスをすべて選択する必要がある
  - 例: 12/9を選択する場合、12/9の日付を持つすべての施設のチェックボックス（10個）を選択

**重要な発見**:
- `checkdate`パラメータが**必須**。これがないとエラーになる（「申込したい日を選んでください。」）
- チェックボックスのvalue形式: `YYYYMMDD` + 施設コード（5桁）+ スペース + フラグ
- 例: `2025120900701   0` → 日付: 2025/12/09、施設コード: 00701
- 同じ日付を選択するには、その日付を持つすべての施設のチェックボックスを選択する
- 例: 12/9を選択 → `20251209`で始まる10個のcheckdate値を配列で送信

**レスポンス**:
- レスポンスURL: `https://www.11489.jp/Umi/web/Yoyaku/WgR_JikantaibetsuAkiJoukyou` （**URLが変わる！**）
- 時間帯別空き状況ページのHTML
- このページには時間帯ごとの空き状況が表示される
- これが最終的な目的ページ

## 重要な発見

### 1. `map_*` フィールドの必要性
Step 3のPOSTリクエストには、Step 2のレスポンスHTMLから抽出した`map_*`フィールドを全て含める必要があります。これらは施設ごとのGoogle Mapsリンクです。

**抽出方法**:
```typescript
// Puppeteerを使った場合
const mapFields = await page.evaluate(() => {
  const inputs = Array.from(document.querySelectorAll('input[type="hidden"][name^="map_"]'));
  return Object.fromEntries(
    inputs.map((input: any) => [input.name, input.value])
  );
});
```

### 2. CSRFトークンの更新
各ページ遷移後に新しいCSRFトークンを取得する必要があります。

**抽出方法**:
```typescript
// Puppeteerを使った場合
const token = await page.evaluate(() => {
  return document.querySelector<HTMLInputElement>(
    'input[name="__RequestVerificationToken"]'
  )?.value;
});
```

### 3. 施設IDの抽出
Step 2のレスポンスから施設IDを抽出する必要があります。

**抽出方法**:
```typescript
// Puppeteerを使った場合
const facilityIds = await page.evaluate(() => {
  const checkboxes = Array.from(
    document.querySelectorAll('input[type="checkbox"][name="checkShisetsu"]')
  );
  return checkboxes.map((cb: any) => cb.value);
});
```

### 4. `checkdate` パラメータの必要性【重要】
Step 4のPOSTリクエストには、Step 3のレスポンスHTMLから抽出した`checkdate`チェックボックスの値を配列として含める必要があります。このパラメータが欠けているとエラーになります。

**抽出方法**:
```typescript
// Puppeteerを使った場合
const checkdateValues = await page.evaluate((targetDate) => {
  const checkboxes = Array.from(
    document.querySelectorAll('input[type="checkbox"][name="checkdate"]')
  );
  return checkboxes
    .filter((cb: any) => cb.value.startsWith(targetDate))
    .map((cb: any) => cb.value);
}, '20251209'); // 例: 2025年12月9日
```

**重要なポイント**:
- チェックボックスのvalue形式: `YYYYMMDD` + 施設コード（5桁）+ スペース + フラグ
- 例: `2025120900701   0` → 日付: 2025/12/09、施設コード: 00701
- 特定の日付を選択するには、その日付で始まるすべての値を配列に含める必要がある
- 10施設 × 12日分 = 120個のチェックボックスがあり、そこから選択したい日付のものをフィルタリング

## 直接API実装の方針

### 実装アプローチ
UI操作（クリック、JavaScript実行など）を一切行わず、HTTPリクエストのみで処理を行います。

### 実装手順

1. **Step 1**: GET リクエストでモード選択ページにアクセス
   - レスポンスHTMLからCSRFトークンを抽出

2. **Step 2**: POST リクエストでバスケットボール検索を実行
   - Step 1で取得したCSRFトークンを使用
   - 固定パラメータでPOSTリクエストを送信
   - レスポンスHTMLから以下を抽出:
     - 新しいCSRFトークン
     - 全ての`map_*` hidden inputフィールド (name と value)
     - 全ての施設ID (checkShisetsu の value)

3. **Step 3**: POST リクエストで施設選択して空き状況ページへ遷移
   - Step 2で取得したCSRFトークンを使用
   - Step 2で抽出した`map_*`フィールドを全て含める
   - Step 2で抽出した施設IDを全て含める
   - レスポンスHTMLには施設別空き状況が含まれる

4. **Step 4**: POST リクエストで日付を選択して時間帯別空き状況ページへ遷移
   - Step 3で取得したCSRFトークンを使用
   - Step 3のレスポンスから`checkdate`チェックボックスのvalueを抽出
     - セレクタ: `input[type="checkbox"][name="checkdate"]`
     - 選択したい日付（例: 12/9）に対応するすべてのチェックボックス値を抽出
     - 例: `20251209`で始まる値をフィルタリング → 10個の値（施設数分）
   - POSTパラメータに`checkdate`配列を含める（**必須！**）
   - レスポンスURL: `WgR_JikantaibetsuAkiJoukyou`（URLが変わる）
   - レスポンスHTMLには時間帯別の空き状況が含まれる

5. **データ抽出**: 時間帯別空き状況ページのHTMLから空き情報を抽出

### DirectApiClientの修正点

#### 削除すべきメソッド
- `postSearchAndSelectFacilities()` - UI操作アプローチのため削除
- `postSelectFacilitiesToCalendar()` - UI操作アプローチのため削除

#### 新規実装すべきメソッド

1. **`extractCsrfToken(html: string): string`**
   - HTMLからCSRFトークンを抽出
   - 正規表現またはcheerioを使用

2. **`extractMapFields(html: string): Record<string, string>`**
   - HTMLから`map_*` hidden inputフィールドを抽出
   - 正規表現またはcheerioを使用
   - 戻り値: `{ "map_341007": "http://...", ... }`

3. **`extractFacilityIds(html: string): string[]`**
   - HTMLから施設IDを抽出
   - 正規表現またはcheerioを使用
   - 戻り値: `["341007", "341009", ...]`

4. **`postBasketballSearch(token: string): Promise<string>`**
   - バスケットボール検索のPOSTリクエストを送信
   - 戻り値: レスポンスHTML

5. **`postSelectFacilities(token: string, mapFields: Record<string, string>, facilityIds: string[]): Promise<string>`**
   - 施設選択のPOSTリクエストを送信
   - ページを施設別空き状況ページに遷移
   - 戻り値: レスポンスHTML

6. **`extractCheckdateValues(html: string, targetDate: string): string[]`**
   - HTMLから`checkdate` チェックボックスの値を抽出
   - 正規表現またはcheerioを使用
   - `targetDate`で指定された日付（YYYYMMDD形式）に対応する値のみをフィルタリング
   - 戻り値: `["2025120900701   0", "2025120900907   0", ...]`

7. **`postSelectDate(token: string, checkdateValues: string[]): Promise<string>`**
   - 日付選択のPOSTリクエストを送信
   - `checkdate`パラメータを配列として含める（**必須**）
   - ページを時間帯別空き状況ページに遷移
   - 戻り値: レスポンスHTML（時間帯別空き状況ページ）

### 必要なライブラリ
- `cheerio`: HTMLパースのため（推奨）
- または正規表現による抽出

### パフォーマンス向上
この実装により、以下のパフォーマンス向上が期待できます:
- UI操作の待機時間が不要
- JavaScriptの実行が不要
- ページ完全読み込みの待機が最小限
- HTTP リクエストのみで処理が完了

## 次のステップ
1. `DirectApiClient.ts`を修正して、上記の方針に基づいた実装を行う
2. `cheerio`ライブラリをインストール（`pnpm add cheerio`）
3. 既存のUI操作メソッドを削除
4. 新規メソッドを実装
5. `src/lib/scraper/index.ts`を修正して新しいメソッドを呼び出す
6. ローカルでテスト実行
