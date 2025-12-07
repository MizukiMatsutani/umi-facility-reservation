# 実装タスク一覧

## 更新履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|---------|
| 2025-12-06 | 2.0 | 調査結果を基に全面改訂 |

---

## 概要

本ドキュメントは、宇美町施設予約システムのスクレイピング機能を完全に実装するためのタスク一覧です。

---

## 実装ステータス（2025-12-06更新）

| Phase | ステータス | 完了日 | 備考 |
|-------|-----------|--------|------|
| 調査フェーズ | ✅ 完了 | 2025-12-06 | 正しいフローの発見 |
| Phase 1 | ❌ 未着手 | - | コア機能の実装（調査結果の反映） |
| Phase 2 | ❌ 未着手 | - | 統合テスト |
| Phase 3 | ⏳ 未着手 | - | エラーハンドリング強化 |
| Phase 4 | ⏳ 未着手 | - | パフォーマンス最適化 |
| Phase 5 | ⏳ 未着手 | - | コード品質向上 |

**⚠️ 重要な注意:**
- ✅ **調査は完了**: 正しい4ステップフローを発見、ドキュメント化完了
- ❌ **実装は未完了**: コードには調査結果が反映されていません
- 現在のコードは旧フロー（施設ごと→日付ごとループ）のままで、12/11を検索すると12/10が表示される問題が未解決

**調査成果（ドキュメント化済み）:**
- 4ステップフローの発見（検索→施設選択→**日付選択**→空き状況取得）
- label.click()パターンの発見
- 施設別空き状況ページ（Step 3）の発見
- 日付valueフォーマットの解明（YYYYMMDD + 施設コード）
- 空き状況フィルタリングルールの発見（○△のみ選択）

---

## 優先度

| 優先度 | 説明 |
|--------|------|
| 🔴 P0 | 必須（これがないと動作しない） |
| 🟡 P1 | 重要（ユーザー体験に大きく影響） |
| 🟢 P2 | 推奨（あると良い） |

---

## Phase 1: コア機能の実装（調査結果の反映）

**ステータス**: ❌ 未着手

**概要**: 調査で判明した正しい4ステップフローに基づき、スクレイピング処理を全面的に修正します。

### ❌ Task 1.1: `selectAllFacilitiesAndNavigate` メソッドの実装（未着手）

**ファイル**: `src/lib/scraper/index.ts`

**現状の問題**:
- `checkbox.checked = true; checkbox.click()` では施設が選択されない
- 「施設を選んでください」エラーが発生する

**修正内容**:
```typescript
private async selectFacilityAndNavigate(
  page: Page,
  facilityId: string
): Promise<void> {
  // labelをクリックする方法に変更
  await page.evaluate((id) => {
    const label = document.querySelector(
      `label[for="checkShisetsu${id}"]`
    ) as HTMLElement;

    if (!label) {
      throw new Error(`施設ラベルが見つかりません: checkShisetsu${id}`);
    }

    label.click();
  }, facilityId);

  await new Promise(resolve => setTimeout(resolve, 500));

  // 選択状態を確認
  const isChecked = await page.evaluate((id) => {
    const checkbox = document.querySelector(
      `#checkShisetsu${id}`
    ) as HTMLInputElement;
    return checkbox?.checked || false;
  }, facilityId);

  if (!isChecked) {
    throw new Error(`施設の選択に失敗しました: ${facilityId}`);
  }
}
```

**完了条件**:
- [ ] labelクリック方式で実装
- [ ] 選択状態の確認を追加
- [ ] エラーハンドリングを追加
- [ ] 「次へ進む」ボタンのクリック処理
- [ ] テストコードで動作確認

---

### ❌ Task 1.2: `selectDatesOnFacilityCalendar` メソッドの実装（未着手）

**ファイル**: `src/lib/scraper/index.ts`

**目的**:
施設一覧ページで全施設を一度に選択する

**実装内容**:
```typescript
private async selectAllFacilitiesAndNavigate(page: Page): Promise<void> {
  console.log('全施設を選択します...');

  // 全施設のチェックボックスを取得してlabelをクリック
  const selectedCount = await page.evaluate(() => {
    const checkboxes = Array.from(
      document.querySelectorAll('.shisetsu input[type="checkbox"][name="checkShisetsu"]')
    ) as HTMLInputElement[];

    checkboxes.forEach((checkbox) => {
      const label = document.querySelector(
        `label[for="${checkbox.id}"]`
      ) as HTMLElement;
      if (label) {
        label.click();
      }
    });

    // 少し待機してから選択状態を確認
    return new Promise<number>((resolve) => {
      setTimeout(() => {
        const checkedCount = checkboxes.filter((cb) => cb.checked).length;
        resolve(checkedCount);
      }, 500);
    });
  });

  console.log(`✅ ${selectedCount}件の施設を選択しました`);

  if (selectedCount === 0) {
    throw new Error('施設が選択されていません');
  }

  // 「次へ進む」ボタンをクリック
  await page.click('.navbar .next > a');
  await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });

  console.log('✅ 施設別空き状況ページへ遷移しました');
}
```

**完了条件**:
- [ ] メソッドの実装（施設別空き状況ページで日付選択）
- [ ] 日付valueの最初の8文字（YYYYMMDD）でマッチング
- [ ] ○または△のみ選択
- [ ] 最大10日のチェック
- [ ] 「次へ進む」ボタンクリック
- [ ] ページ遷移の待機処理を追加
- [ ] テストコードで動作確認

---

### ❌ Task 1.3: `scrapeTimeSlots` メソッドの実装（未着手）

**ファイル**: `src/lib/scraper/index.ts`

**目的**:
施設別空き状況ページ（Step 3）で対象日付を選択する

**実装内容**:
```typescript
private async selectDatesOnFacilityCalendar(
  page: Page,
  dates: Date[]
): Promise<void> {
  console.log(`対象日付を選択します: ${dates.length}日分`);

  if (dates.length > 10) {
    throw new Error('最大10日まで選択可能です');
  }

  const selectedCount = await page.evaluate((dateStrings: string[]) => {
    const checkboxes = document.querySelectorAll(
      'input[type="checkbox"][name="checkdate"]'
    ) as NodeListOf<HTMLInputElement>;

    let count = 0;

    checkboxes.forEach((checkbox) => {
      // valueの最初の8文字が日付（YYYYMMDD）
      const checkboxDate = checkbox.value.substring(0, 8);

      if (dateStrings.includes(checkboxDate)) {
        // 空き状況を確認
        const label = document.querySelector(
          `label[for="${checkbox.id}"]`
        ) as HTMLElement;
        const status = label?.textContent?.trim();

        // ○または△のみ選択（空きあり、一部空き）
        if (status === '○' || status === '△') {
          label.click();
          count++;
        } else {
          console.log(`日付 ${checkboxDate} はスキップ: ${status}`);
        }
      }
    });

    return count;
  }, dates.map(date => format(date, 'yyyyMMdd')));

  console.log(`✅ ${selectedCount}個の日付セルを選択しました`);

  if (selectedCount === 0) {
    throw new Error('選択可能な日付がありません');
  }

  // 少し待機
  await new Promise(resolve => setTimeout(resolve, 500));

  // 「次へ進む」ボタンをクリック
  await page.click('.navbar .next > a');
  await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });

  console.log('✅ 時間帯別空き状況ページへ遷移しました');
}
```

**必要な import**:
```typescript
import { format } from 'date-fns';
```

**完了条件**:
- [ ] 日付選択メソッドの実装
- [ ] 空き状況フィルタリング（○△のみ選択）
- [ ] 最大10日の制限チェック
- [ ] ページ遷移の待機処理
- [ ] テストコードで動作確認

---

### ❌ Task 1.4: `scrapeTimeSlots` メソッドの実装（未着手）

**ファイル**: `src/lib/scraper/index.ts`

**目的**:
時間帯別空き状況ページ（Step 4）から空き状況データを取得する

**実装内容**:
```typescript
private async scrapeTimeSlots(page: Page): Promise<DateAvailability[]> {
  console.log('時間帯別空き状況を取得します...');

  const availability = await page.evaluate(() => {
    const items = document.querySelectorAll('.item');

    return Array.from(items).map((item) => {
      // 施設名
      const facilityName = item.querySelector('h3')?.textContent?.trim() || '';

      // カレンダー
      const calendar = item.querySelector('.calendar');
      if (!calendar) {
        return null;
      }

      // コート情報
      const rows = calendar.querySelectorAll('tr');
      const courts: any[] = [];

      rows.forEach((row) => {
        const courtName = row.querySelector('.shisetsu')?.textContent?.trim();
        if (!courtName) return;

        const cells = row.querySelectorAll('td label');
        const timeSlots: any[] = [];

        Array.from(cells).forEach((label, index) => {
          // 時刻を計算
          const startHour = 8;
          const startMinute = 30;
          const totalMinutes = startHour * 60 + startMinute + index * 30;
          const hour = Math.floor(totalMinutes / 60);
          const minute = totalMinutes % 60;
          const nextHour = Math.floor((totalMinutes + 30) / 60);
          const nextMinute = (totalMinutes + 30) % 60;

          const time = `${hour}:${String(minute).padStart(2, '0')}-${nextHour}:${String(nextMinute).padStart(2, '0')}`;

          // 空き状況
          const status = label.textContent?.trim();
          const available = status === '○';

          timeSlots.push({ time, available, status });
        });

        courts.push({ name: courtName, timeSlots });
      });

      return {
        facilityName,
        courts,
      };
    }).filter(item => item !== null);
  });

  console.log(`✅ ${availability.length}件の施設の空き状況を取得しました`);

  return availability as DateAvailability[];
}
```

**型定義**:
```typescript
interface DateAvailability {
  facilityName: string;
  courts: Court[];
}

interface Court {
  name: string;
  timeSlots: TimeSlot[];
}

interface TimeSlot {
  time: string;       // "8:30-9:00"
  available: boolean;
  status: string;     // "○", "×", "保守作業", etc.
}
```

**完了条件**:
- [ ] 時間帯別空き状況取得メソッドの実装
- [ ] 時刻計算ロジックの実装
- [ ] 型定義の追加
- [ ] テストコードで動作確認

---

### ❌ Task 1.5: `scrapeFacilities` メソッドの全面改修（未着手）

**ファイル**: `src/lib/scraper/index.ts`

**目的**:
正しいフロー（Step 1 → 2 → 3 → 4）に沿ってスクレイピングを実行する

**実装内容**:
```typescript
async scrapeFacilities(
  dates: Date[],
  timeRange?: TimeRange
): Promise<FacilityAvailability[]> {
  try {
    await this.initBrowser();
    const page = await this.browser!.newPage();

    // ダイアログを自動的に受け入れる
    page.on('dialog', async dialog => {
      console.log('ダイアログ:', dialog.message());
      await dialog.accept();
    });

    // Step 1: 検索ページへ移動 → スポーツ選択 → 検索
    await this.navigateToSearchPage(page);
    await this.selectSports(page);
    await this.searchFacilities(page);

    // Step 2: 全施設を選択 → 次へ進む
    await this.selectAllFacilitiesAndNavigate(page);

    // Step 3: 対象日付を選択 → 次へ進む
    await this.selectDatesOnFacilityCalendar(page, dates);

    // Step 4: 時間帯別空き状況を取得
    const availability = await this.scrapeTimeSlots(page);

    // データを整形
    const results: FacilityAvailability[] = availability.map((item, index) => ({
      facility: {
        id: `facility_${index}`, // TODO: 実際のIDを取得
        name: item.facilityName,
      },
      availability: dates.map(date => ({
        date: format(date, 'yyyy-MM-dd'),
        courts: item.courts,
      })),
    }));

    console.log(`\n✅ スクレイピング完了: ${results.length}施設`);
    return results;
  } finally {
    await this.closeBrowser();
  }
}
```

**完了条件**:
- [ ] 正しいフローに沿った実装
- [ ] 各メソッドの呼び出し順序を修正
- [ ] データ整形ロジックの実装
- [ ] エラーハンドリングの追加
- [ ] テストコードで動作確認

---

## Phase 2: 統合テスト

**ステータス**: ✅ 完了（2025-12-06）

**概要**: Phase 1で実装した機能の統合テストを実施し、正常に動作することを確認しました。

### ❌ Task 2.1: 統合テストスクリプトの作成（未着手）

**ファイル**: `src/lib/scraper/index.ts`

**目的**:
施設一覧ページで施設IDと名前を正しく取得し、後続の処理で利用する

**実装内容**:
```typescript
interface FacilityInfo {
  id: string;
  name: string;
}

private async getFacilityList(page: Page): Promise<FacilityInfo[]> {
  return await page.evaluate(() => {
    const checkboxes = document.querySelectorAll(
      '.shisetsu input[type="checkbox"][name="checkShisetsu"]'
    ) as NodeListOf<HTMLInputElement>;

    return Array.from(checkboxes).map(checkbox => {
      const label = document.querySelector(
        `label[for="${checkbox.id}"]`
      ) as HTMLElement;

      return {
        id: checkbox.value,
        name: label?.textContent?.trim() || '',
      };
    });
  });
}
```

**完了条件**:
- [ ] 施設リスト取得メソッドの実装
- [ ] 施設IDと名前のマッピング
- [ ] `scrapeFacilities` での利用

---

### ❌ Task 2.2: 実際のデータで動作確認（未着手）

**ファイル**: `src/lib/scraper/index.ts`

**目的**:
複数日を選択した場合、各日付ごとに空き状況を分離する

**実装内容**:
現在の実装では、複数日を選択しても時間帯別空き状況ページでどの日付のデータかを区別できません。

**解決策**:
- 1日ずつ処理する（遅くなるが確実）
- または、ページのヘッダー等から日付情報を取得する方法を調査

**完了条件**:
- [ ] 日付分離ロジックの設計
- [ ] 実装
- [ ] テスト

---

## Phase 3: エラーハンドリングの強化

**ステータス**: ⏳ 未着手

**概要**: Phase 3以降は、Phase 1&2で実装した基本機能を安定化させるための改善タスクです。

### 🟢 Task 3.1: リトライ処理の追加

**ファイル**: `src/lib/scraper/index.ts`

**目的**:
ネットワークエラーやタイムアウトが発生した場合、自動的にリトライする

**実装内容**:
```typescript
private async withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) {
        throw error;
      }
      console.log(`リトライ ${i + 1}/${maxRetries}...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  throw new Error('リトライ回数を超過しました');
}
```

**完了条件**:
- [ ] リトライメソッドの実装
- [ ] 主要な処理でリトライを適用
- [ ] テスト

---

### 🟢 Task 3.2: 詳細なエラーメッセージ

**ファイル**: `src/lib/scraper/index.ts`

**目的**:
エラーが発生した場合、どのステップで失敗したかを明確にする

**実装内容**:
```typescript
class ScrapingError extends Error {
  constructor(
    public step: string,
    public originalError: Error
  ) {
    super(`${step}で失敗: ${originalError.message}`);
    this.name = 'ScrapingError';
  }
}
```

**完了条件**:
- [ ] カスタムエラークラスの実装
- [ ] 各ステップでのエラーハンドリング
- [ ] テスト

---

## Phase 4: テストとドキュメント

### 🟡 Task 4.1: 統合テストの作成

**ファイル**: `tests/scraper.test.ts`

**目的**:
実際のウェブサイトに対してスクレイピングが正しく動作するかテストする

**テストケース**:
- [ ] 1日の空き状況を取得
- [ ] 複数日（2-10日）の空き状況を取得
- [ ] 空きがない日の処理
- [ ] エラーケースの処理

---

### 🟡 Task 4.2: APIドキュメントの更新

**ファイル**: `docs/api/scrape-endpoint.md`

**目的**:
APIエンドポイントのドキュメントを最新の実装に合わせて更新する

**完了条件**:
- [ ] リクエストパラメータの更新
- [ ] レスポンス形式の更新
- [ ] エラーレスポンスの追加
- [ ] 使用例の追加

---

## Phase 5: パフォーマンス最適化

### 🟢 Task 5.1: キャッシュ機構の追加

**ファイル**: `src/lib/cache/facility-cache.ts`

**目的**:
取得した空き状況を一定時間キャッシュし、システムへの負荷を軽減する

**実装内容**:
- キャッシュキー: `{dates}_{timeRange}`
- キャッシュ期間: 15分
- ストレージ: メモリまたはRedis

**完了条件**:
- [ ] キャッシュマネージャーの実装
- [ ] APIエンドポイントでの利用
- [ ] テスト

---

## 進捗管理

| Phase | タスク | ステータス | 担当 | 期限 |
|-------|--------|----------|------|------|
| Phase 1 | Task 1.1 | 🔴 TODO | - | - |
| Phase 1 | Task 1.2 | 🔴 TODO | - | - |
| Phase 1 | Task 1.3 | 🔴 TODO | - | - |
| Phase 1 | Task 1.4 | 🔴 TODO | - | - |
| Phase 1 | Task 1.5 | 🔴 TODO | - | - |
| Phase 2 | Task 2.1 | 🟡 TODO | - | - |
| Phase 2 | Task 2.2 | 🟡 TODO | - | - |
| Phase 3 | Task 3.1 | 🟢 TODO | - | - |
| Phase 3 | Task 3.2 | 🟢 TODO | - | - |
| Phase 4 | Task 4.1 | 🟡 TODO | - | - |
| Phase 4 | Task 4.2 | 🟡 TODO | - | - |
| Phase 5 | Task 5.1 | 🟢 TODO | - | - |

---

## 見積もり

| Phase | 工数見積もり |
|-------|------------|
| Phase 1 | 4-6時間 |
| Phase 2 | 2-3時間 |
| Phase 3 | 2-3時間 |
| Phase 4 | 3-4時間 |
| Phase 5 | 4-5時間 |
| **合計** | **15-21時間** |

---

**作成者**: Claude (AI Assistant)
**バージョン**: 2.0
**最終更新**: 2025-12-06
