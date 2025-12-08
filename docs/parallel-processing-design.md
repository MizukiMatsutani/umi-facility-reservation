# 並列処理によるスクレイピング高速化設計書

## 1. 背景と目的

### 現状のパフォーマンス
- **レガシーモード（UI操作）**: 約120〜180秒（7日検索）
- **直接APIモード（順次実行）**: 約75〜88秒（7日検索）
  - Phase 1実装により約15%の高速化を達成

### 目標
並列処理の導入により、さらなる高速化を実現する：
- **2並列**: 約40〜50秒（目標: 40%削減）
- **3並列**: 約30〜40秒（目標: 50%削減）

### 根拠
現在のボトルネックは日付ごとの順次API呼び出し。各日付の処理は独立しているため、並列実行により大幅な高速化が見込まれる。

## 2. アーキテクチャ設計

### 2.1 並列処理の方式

複数のブラウザコンテキスト（Incognito Context）を使用した並列実行を採用する。

```
Browser (1つ)
  ├─ Context 1 (独立したセッション)
  │   └─ Page 1 → 日付1, 2を処理
  ├─ Context 2 (独立したセッション)
  │   └─ Page 2 → 日付3, 4を処理
  └─ Context 3 (独立したセッション)
      └─ Page 3 → 日付5, 6, 7を処理
```

**メリット**:
- 各コンテキストは独立したCookie/セッションを持つ
- ブラウザインスタンスは1つで済むため、メモリ効率が良い
- Puppeteerの標準APIで簡単に実装可能

### 2.2 並列度の推奨値

| 並列度 | 推定所要時間 | リスク | 推奨 |
|--------|------------|--------|------|
| 1（順次） | 75秒 | 低 | Phase 1（完了） |
| 2 | 45秒 | 低 | ✅ **推奨** |
| 3 | 30秒 | 中 | ✅ 許容範囲 |
| 7（全並列） | 15秒? | **高** | ❌ **非推奨** |

**2-3並列を推奨する理由**:
1. サーバー負荷への配慮（公共システムのため）
2. エラー率の低減（並列度が高いほどタイムアウトリスクが増加）
3. 実用上十分な高速化（30〜45秒は許容範囲）

**7並列を却下する理由**:
1. サーバーへの過負荷リスク
2. 複数リクエストの同時処理によるタイムアウト増加
3. エラー時のデバッグ困難
4. 倫理的配慮（公共システムの利用者への影響）

### 2.3 バッチ処理と遅延

日付を2-3日ごとのバッチに分割し、バッチ間に遅延を挿入することで、サーバー負荷を分散する。

**例（7日検索、2並列）**:
```
Batch 1: [日付1, 日付2] → 2つのコンテキストで並列実行
↓ 2秒待機
Batch 2: [日付3, 日付4] → 2つのコンテキストで並列実行
↓ 2秒待機
Batch 3: [日付5, 日付6] → 2つのコンテキストで並列実行
↓ 2秒待機
Batch 4: [日付7] → 1つのコンテキストで実行
```

**推奨バッチ間遅延**: 2秒
- 短すぎる（0秒）: サーバー負荷が高くなる
- 長すぎる（5秒）: 並列化のメリットが減少
- 2秒: 負荷分散と高速化のバランスが良い

## 3. 実装コンポーネント

### 3.1 ParallelBrowserManager（新規）

**責務**: 複数のブラウザコンテキストを管理する

**主要メソッド**:
- `createContexts(count: number)`: 指定数のコンテキストを作成
- `getContext(index: number)`: 指定インデックスのコンテキストを取得
- `closeAllContexts()`: すべてのコンテキストをクローズ

**実装詳細**:
```typescript
class ParallelBrowserManager {
  private browser: Browser;
  private contexts: BrowserContext[] = [];

  async createContexts(count: number): Promise<void> {
    for (let i = 0; i < count; i++) {
      const context = await this.browser.createIncognitoBrowserContext();
      // リソースブロッキングを各コンテキストに適用
      this.contexts.push(context);
    }
  }

  // エラーハンドリング: コンテキスト作成失敗時は例外をスロー
}
```

### 3.2 batchDates ユーティリティ関数（新規）

**責務**: 日付配列をバッチに分割する

**シグネチャ**:
```typescript
function batchDates(dates: Date[], batchSize: number): Date[][]
```

**例**:
```typescript
batchDates([日付1, 日付2, 日付3, 日付4, 日付5, 日付6, 日付7], 2)
// => [[日付1, 日付2], [日付3, 日付4], [日付5, 日付6], [日付7]]
```

### 3.3 scrapeFacilitiesParallelMode（新規）

**責務**: 並列処理モードのメインロジック

**フロー**:
1. ParallelBrowserManagerで複数コンテキストを初期化
2. 日付をバッチに分割（batchDates）
3. 各バッチを並列実行（Promise.all）
   - 各コンテキストでDirectApiClientを使用
   - トークン取得、施設カレンダー遷移、時間帯取得を実行
4. バッチ間に2秒の遅延を挿入（setTimeout）
5. 全結果をマージして返す

**エラーハンドリング**:
- 部分失敗時: 失敗した日付のみリトライ（最大1回）
- 全体失敗時: 例外をスローし、上位のフォールバック機能に委ねる

## 4. ScraperOptionsの拡張

並列処理を制御するための新しいオプションを追加する。

```typescript
interface ScraperOptions {
  // 既存オプション
  useDirectApi?: boolean;           // デフォルト: true
  fallbackOnError?: boolean;        // デフォルト: true
  enableResourceBlocking?: boolean; // デフォルト: true
  reportProgress?: boolean;         // デフォルト: false

  // 新規オプション（Phase 7）
  parallelMode?: boolean;           // デフォルト: false
  parallelDegree?: number;          // デフォルト: 2、最大: 3
  batchDelay?: number;              // デフォルト: 2000 (ms)
}
```

**使用例**:
```typescript
const scraper = new FacilityScraper(page, {
  useDirectApi: true,
  parallelMode: true,
  parallelDegree: 2,
  batchDelay: 2000
});
```

## 5. フォールバック階層

3段階のフォールバックを実装する：

```
1. 並列処理モード（parallelMode=true）
   ↓ エラー時
2. 直接APIモード（useDirectApi=true）
   ↓ エラー時
3. レガシーモード（UI操作）
```

**ログ出力例**:
```
[並列処理モード] 開始（並列度: 2）
[エラー] 並列処理モードでエラーが発生しました: TimeoutError
[フォールバック] 直接APIモード（順次実行）に切り替えます
[直接APIモード] 開始
...
```

## 6. エラーハンドリング戦略

### 6.1 部分失敗時のリトライ

```typescript
// 例: 日付3の処理が失敗した場合
try {
  results = await Promise.all(batch.map(date => scrapeDate(date)));
} catch (error) {
  // 失敗した日付のみリトライ
  const failedDate = identifyFailedDate(error);
  results = await retryFailedDate(failedDate);
}
```

### 6.2 全体失敗時のフォールバック

```typescript
async scrapeFacilities(options: ScraperOptions) {
  if (options.parallelMode) {
    try {
      return await this.scrapeFacilitiesParallelMode();
    } catch (error) {
      console.error('[並列処理モード] エラー:', error);
      console.log('[フォールバック] 直接APIモードに切り替えます');
      // 直接APIモードにフォールバック
    }
  }

  if (options.useDirectApi) {
    try {
      return await this.scrapeFacilitiesDirectMode();
    } catch (error) {
      console.error('[直接APIモード] エラー:', error);
      console.log('[フォールバック] レガシーモードに切り替えます');
      // レガシーモードにフォールバック
    }
  }

  return await this.scrapeFacilitiesLegacyMode();
}
```

## 7. テスト戦略

### 7.1 単体テスト
- ParallelBrowserManager: コンテキスト作成・取得・クローズ
- batchDates: バッチ分割ロジック

### 7.2 統合テスト
- scrapeFacilitiesParallelMode: 並列実行フロー全体
- エラー時のフォールバック動作
- バッチ間遅延の動作

### 7.3 性能テスト
- ベンチマークスクリプト（`scripts/benchmark-parallel-mode.ts`）
- 並列度2と3での性能測定
- エラー率の監視

## 8. リスク評価

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|---------|------|
| サーバー過負荷 | 高 | 中 | 並列度を2-3に制限、バッチ間遅延を挿入 |
| タイムアウト増加 | 中 | 中 | リトライ機能、フォールバック階層 |
| Cookie/セッション競合 | 低 | 低 | Incognito Contextで各セッションを独立化 |
| メモリ不足 | 中 | 低 | ブラウザインスタンスは1つのみ、コンテキストは軽量 |
| エラー時のデバッグ困難 | 中 | 中 | 詳細なログ出力、段階的フォールバック |

## 9. パフォーマンス予測

### 9.1 理論値

| モード | 並列度 | 1日あたり平均 | 7日合計 | オーバーヘッド | 実測予測 |
|--------|--------|-------------|--------|-----------|---------|
| 順次 | 1 | 10.7秒 | 75秒 | +0秒 | 75秒 |
| 2並列 | 2 | 10.7秒 | 37.5秒 | +8秒 | 45秒 |
| 3並列 | 3 | 10.7秒 | 25秒 | +8秒 | 33秒 |

**オーバーヘッド内訳**:
- バッチ間遅延: 3バッチ × 2秒 = 6秒
- コンテキスト初期化: 約2秒

### 9.2 実測目標

- **2並列**: 40〜50秒
- **3並列**: 30〜40秒
- **エラー率**: 5%未満

## 10. 実装優先度

| フェーズ | タスク | 優先度 | 所要時間 |
|---------|-------|--------|---------|
| Phase 7.1 | Task 23: 設計書作成 | 高 | 1時間 |
| Phase 7.2 | Task 24-25: 基盤実装 | 高 | 2時間 |
| Phase 7.3 | Task 26-28: メインロジック | 高 | 3時間 |
| Phase 7.4 | Task 29: テスト作成 | 中 | 2時間 |
| Phase 7.5 | Task 30: 性能測定 | 中 | 1時間 |

**合計所要時間**: 約9時間

## 11. 将来の拡張案

### 11.1 動的並列度調整
サーバーの応答時間を監視し、並列度を動的に調整する機能。

### 11.2 キャッシュ機能
同じ日付・施設の検索結果をキャッシュし、重複リクエストを削減。

### 11.3 WebSocket経由のリアルタイム進捗
各コンテキストの進捗をWebSocketでクライアントに配信。

## 12. まとめ

並列処理の導入により、7日検索の所要時間を75秒から30〜45秒に短縮できる見込み。2-3並列を推奨し、サーバー負荷とパフォーマンスのバランスを取る。3段階のフォールバック機能により、堅牢性も確保する。
