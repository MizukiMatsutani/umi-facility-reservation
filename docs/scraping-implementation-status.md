# スクレイピング実装状況レポート

## 作成日
2025-12-06

## 概要

宇美町施設予約システムからバスケットボール施設の空き状況を取得するスクレイピング機能の実装状況をまとめます。

## 実装状況サマリー

### ✅ 実装完了（Phase 1）
1. **初期ページへのアクセス** - `navigateToSearchPage()`
2. **スポーツ種目の選択** - `selectSports()`
3. **施設検索の実行** - `searchFacilities()`
4. **施設一覧の取得** - `selectAllFacilities()`

### ⏸️ 未実装（Phase 2 - 将来の拡張）
5. **日付と施設の選択** - `selectDateAndFacility()`
6. **空き状況の詳細取得** - `scrapeAvailability()`

## 技術的な発見と解決した問題

### 問題1: スポーツ種目の選択に失敗

**エラー**: `Waiting for selector #checkPurposeMiddle505 failed`

**原因**:
- 屋内スポーツを選択すると、AJAXで動的にスポーツ種目のリストが読み込まれる
- `radioMokutekiSubmit(code)` 関数がAJAXリクエストを発行

**解決策**:
```typescript
// 1. ラジオボタンをクリック
await page.evaluate(() => {
  const radio = document.querySelector('#radioPurposeLarge02') as HTMLInputElement;
  radio.checked = true;
  radio.click(); // onclickイベントを発火
});

// 2. AJAXで読み込まれるまで待機
await page.waitForSelector('#checkPurposeMiddle505', { timeout: 15000 });
await page.waitForFunction(() => {
  const checkbox = document.querySelector('#checkPurposeMiddle505');
  const parent = checkbox?.parentElement;
  return parent && window.getComputedStyle(parent).display !== 'none';
}, { timeout: 15000 });
```

### 問題2: チェックボックスが選択されない

**エラー**: `使用目的を選んでください。`

**原因**:
- input要素を直接クリックしても `checked` にならない
- CSSでカスタマイズされたUIのため、label要素をクリックする必要がある

**解決策**:
```typescript
// input要素ではなくlabel要素をクリック
await page.evaluate(() => {
  const label505 = document.querySelector('label[for="checkPurposeMiddle505"]') as HTMLElement;
  const label510 = document.querySelector('label[for="checkPurposeMiddle510"]') as HTMLElement;
  label505.click();
  label510.click();
});
```

### 問題3: 検索ボタンクリック後にエラー

**エラー**: `検索に失敗しました: 使用目的を選んでください。`

**原因**:
- ボタンの `click()` だけでは不十分
- `searchMokuteki()` 関数を呼び出す必要がある
- この関数はAJAXでバリデーションを行い、成功すれば `__doPostBack` でフォーム送信

**解決策**:
```typescript
// searchMokuteki()関数を直接呼び出す
await page.evaluate(() => {
  (window as any).searchMokuteki();
});
```

## 取得できるデータ

### 現在取得可能なデータ

```typescript
{
  facilities: [
    {
      facility: {
        id: "341007",
        name: "宇美勤労者体育センター"
      },
      availability: [] // Phase 2で実装予定
    },
    {
      facility: {
        id: "341009",
        name: "宇美南町民センター"
      },
      availability: []
    },
    // ... 合計10件の施設
  ]
}
```

### Phase 2で取得予定のデータ

```typescript
{
  facility: { id: "341007", name: "宇美勤労者体育センター" },
  availability: [
    {
      date: "2025-12-10",
      slots: [
        {
          startTime: "08:30",
          endTime: "09:00",
          status: "available" // or "partially_available" or "unavailable"
        },
        // ...
      ]
    }
  ]
}
```

## 実装ファイル

### メインファイル
- `src/lib/scraper/index.ts` - FacilityScraperクラス
- `src/app/api/scrape/route.ts` - APIエンドポイント

### 調査スクリプト（開発用）
- `scripts/investigate-html.ts` - 初期ページのHTML調査
- `scripts/investigate-flow.ts` - 操作フロー調査
- `scripts/debug-scraper.ts` - デバッグ用スクリプト
- `scripts/debug-full-flow.ts` - フルフロー確認
- `scripts/investigate-facility-list.ts` - 施設一覧ページ調査

### 調査結果
- `docs/investigation/scraping-implementation-guide.md` - 実装ガイド
- `docs/investigation/step1-mode-select.html` - 初期ページのHTML
- `docs/investigation/facility-list-page.html` - 施設一覧ページのHTML
- `docs/investigation/*.png` - 各ステップのスクリーンショット

## Phase 2実装に必要な調査事項

Phase 2（日付選択と空き状況取得）を実装する場合、以下の調査が必要です：

1. **施設一覧ページから日付選択ページへの遷移**
   - 「次へ進む」ボタンのセレクタと操作方法
   - 施設のチェックボックスの選択方法
   - ページ遷移のトリガー

2. **日付選択ページの構造**
   - カレンダーUIの実装方法
   - 日付選択のセレクタ
   - 複数日付の選択方法

3. **空き状況ページの構造**
   - 時間帯テーブルのHTML構造
   - 空き状況（◯△×）の表現方法
   - データの抽出方法

## 現在の制限事項

1. **空き状況の詳細が取得できない**
   - 施設一覧までは取得できるが、各施設の時間帯ごとの空き状況は未実装
   - ユーザーには「空き状況データがありません」と表示される

2. **パフォーマンス**
   - 各施設ごとに個別にスクレイピングするため、10件で数十秒かかる可能性
   - タイムアウト設定: 各ステップ10-30秒

3. **エラーハンドリング**
   - 一部の施設で失敗しても他の施設の取得は続行
   - すべての施設で失敗した場合は空の結果を返す

## 推奨される次のステップ

### 短期（UX改善）
1. リセットボタンの追加
2. エラー時の入力状態保持
3. エラーメッセージの改善
4. 「宇美町のサイトで確認」リンクの追加

### 中期（Phase 2実装）
1. 日付選択ページの調査と実装
2. 空き状況ページの調査と実装
3. パフォーマンス最適化（並列処理、キャッシュなど）

### 長期（拡張機能）
1. 定期的なスクレイピングとキャッシュ
2. 通知機能（空きが出たら通知）
3. 他のスポーツ種目への対応
