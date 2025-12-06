# Tasks Document

## 概要

このドキュメントは、宇美町施設予約検索システム（umi-facility-search）の実装タスクを定義します。TDD（テスト駆動開発）アプローチに従い、小さく焦点を絞ったタスクに分解しています。

## フェーズ1: プロジェクトセットアップと基盤構築

### 1.1 Next.jsプロジェクトの初期化

- [x] 1.1.1 Next.js 15.x プロジェクトのセットアップ
  - ファイル: プロジェクトルート
  - Next.js 15.x (App Router) プロジェクトを pnpm create next-app で作成
  - TypeScript、ESLint、TailwindCSSを有効化
  - 目的: プロジェクトの基盤を構築
  - _要件: 技術標準（tech.md）_
  - _プロンプト: Role: DevOps Engineer with expertise in Next.js and modern web development tooling | Task: Initialize a Next.js 15.x project with App Router, TypeScript, ESLint, and TailwindCSS using pnpm, following tech.md standards | Restrictions: Must use pnpm 9.x, Node.js 20.x, enable all recommended TypeScript strict checks, configure Vercel deployment settings | Success: Project initialized successfully, all dependencies installed, basic structure follows Next.js 15 best practices, TypeScript compiles without errors_

- [x] 1.1.2 プロジェクト構造の作成
  - ファイル: src/ディレクトリ構造全体
  - structure.mdに従ったディレクトリ構造を作成
  - app/, components/, lib/ ディレクトリを作成
  - 目的: プロジェクトの構造を確立
  - _活用: structure.md_
  - _要件: プロジェクト構造（structure.md）_
  - _プロンプト: Role: Software Architect specializing in project organization and file structure | Task: Create project directory structure following structure.md specifications, including app/, components/, lib/, and subdirectories | Restrictions: Must follow exact naming conventions from structure.md, create placeholder index files where appropriate, maintain clear separation of concerns | Success: All directories created as specified, structure is navigable and follows conventions, placeholder files prevent empty directories_

### 1.2 開発環境の設定

- [x] 1.2.1 ESLintとPrettierの設定
  - ファイル: eslint.config.mjs, .prettierrc, .prettierignore
  - ESLintとPrettierの設定ファイルを作成
  - Next.js推奨ルールを適用
  - 目的: コード品質とフォーマットの統一
  - _要件: 非機能要件（メンテナンス性）_
  - _プロンプト: Role: Code Quality Engineer with expertise in ESLint and Prettier configuration | Task: Configure ESLint and Prettier for Next.js 15.x project with TypeScript, following strict code quality standards | Restrictions: Must use Next.js recommended rules, enable TypeScript-specific rules, ensure no conflicting rules between ESLint and Prettier | Success: ESLint and Prettier configured correctly, no rule conflicts, code can be linted and formatted without errors_

- [x] 1.2.2 TailwindCSS設定のカスタマイズ
  - ファイル: src/app/globals.css
  - TailwindCSSのブレークポイント設定（モバイルファースト）
  - カラーパレット、フォントサイズの定義
  - 目的: デザインシステムの基盤を構築
  - _要件: 要件6（レスポンシブデザイン）_
  - _プロンプト: Role: Frontend Developer specializing in TailwindCSS and design systems | Task: Customize TailwindCSS configuration for mobile-first design with Japanese typography, defining breakpoints (mobile: ~640px, tablet: 641-1024px, desktop: 1025px+), color palette, and font sizes (minimum 16px for body text) | Restrictions: Must prioritize mobile viewport, ensure accessibility (contrast ratio 4.5:1+), use system fonts for Japanese, define tap-target minimum 44px utility class | Success: TailwindCSS configured for mobile-first, all breakpoints defined, Japanese typography properly configured, design tokens established_

- [x] 1.2.3 Vitestのセットアップ
  - ファイル: vitest.config.ts, src/__tests__/setup.ts
  - Vitestのインストールと設定
  - テストユーティリティのセットアップ
  - 目的: TDDアプローチのテスト環境構築
  - _要件: 非機能要件（メンテナンス性）_
  - _プロンプト: Role: QA Engineer with expertise in Vitest and testing infrastructure | Task: Set up Vitest testing framework with TypeScript support, configure test environment for Next.js App Router components, create test utilities and setup files | Restrictions: Must support both unit and integration tests, configure proper mocking for Next.js features, ensure fast test execution | Success: Vitest configured and working, test environment properly set up, sample test passes, can test both components and utilities_

### 1.3 型定義の作成

- [x] 1.3.1 コアデータ型の定義
  - ファイル: src/lib/types/index.ts
  - Facility, AvailabilityData, TimeSlot 型を定義
  - SearchParams, TimeRange 型を定義
  - 目的: 型安全性の確立
  - _活用: design.md（データモデル）_
  - _要件: 要件1（日付と時間帯による検索）, 要件2（検索結果表示）_
  - _プロンプト: Role: TypeScript Developer specializing in type systems and data modeling | Task: Define core TypeScript interfaces (Facility, AvailabilityData, TimeSlot, SearchParams, TimeRange) following design.md data models with strict type safety | Restrictions: Must use strict TypeScript settings, add JSDoc comments for all types, ensure type compatibility across system, use readonly where appropriate | Success: All data types defined and exported, types compile without errors, comprehensive JSDoc documentation, type safety enforced_

- [x] 1.3.2 API型の定義
  - ファイル: src/lib/types/api.ts
  - ScrapeRequest, ScrapeResponse 型を定義
  - ErrorResponse 型を定義
  - 目的: API契約の型安全性確保
  - _活用: design.md（API Route定義）_
  - _要件: 要件3（スクレイピング）, 要件5（エラー表示）_
  - _プロンプト: Role: API Developer with expertise in TypeScript and REST API design | Task: Define API request/response types (ScrapeRequest, ScrapeResponse, ErrorResponse) following design.md specifications with comprehensive error types | Restrictions: Must match API contract exactly, include all error scenarios, use ISO 8601 for dates, add validation-friendly types | Success: API types fully defined, matches design specification, error types cover all scenarios, types support runtime validation_

## フェーズ2: ユーティリティとロジック（TDD）

### 2.1 日付ユーティリティの実装

- [x] 2.1.1 日付ユーティリティのテスト作成
  - ファイル: src/lib/utils/__tests__/date.test.ts
  - 日付範囲生成のテストケースを作成
  - 日付フォーマットのテストケースを作成
  - 目的: TDDアプローチでのテスト先行作成
  - _要件: 要件1（日付と時間帯による検索）_
  - _プロンプト: Role: QA Engineer with expertise in TDD and date/time testing | Task: Write comprehensive unit tests for date utility functions including generateDateRange (本日から7日分), formatDate (Japanese locale: 2025年12月5日), and date validation, covering edge cases | Restrictions: Must follow TDD red-green-refactor cycle, test edge cases (leap years, month boundaries), use date-fns for implementation expectations | Success: Test suite defined with all edge cases, tests initially fail (red phase), clear expectations for implementation, covers requirement 1 scenarios_

- [x] 2.1.2 日付ユーティリティの実装
  - ファイル: src/lib/utils/date.ts
  - generateDateRange: 本日から指定日数分の配列生成
  - formatDate: 日本語ロケールでのフォーマット
  - 目的: 日付操作の共通ロジック提供
  - _活用: date-fns ライブラリ_
  - _要件: 要件1（日付と時間帯による検索）_
  - _プロンプト: Role: Backend Developer with expertise in JavaScript date handling and internationalization | Task: Implement date utility functions (generateDateRange, formatDate) using date-fns to pass all tests from 2.1.1, supporting Japanese locale formatting | Restrictions: Must use date-fns for consistency, handle timezone correctly (Asia/Tokyo), ensure immutability, optimize for performance | Success: All tests from 2.1.1 pass (green phase), functions handle edge cases correctly, code is refactored and clean, JSDoc comments added_

### 2.2 バリデーションユーティリティの実装

- [x] 2.2.1 バリデーションユーティリティのテスト作成
  - ファイル: src/lib/utils/__tests__/validation.test.ts
  - 検索パラメータバリデーションのテストケース作成
  - 時間範囲バリデーションのテストケース作成
  - 目的: TDDアプローチでのテスト先行作成
  - _要件: 要件1（日付と時間帯による検索）_
  - _プロンプト: Role: QA Engineer specializing in input validation and edge case testing | Task: Write unit tests for validation functions including validateSearchParams (empty dates error, past date warning), validateTimeRange (From must be before To), covering all error scenarios | Restrictions: Must test both success and failure cases, validate error messages are user-friendly in Japanese, test boundary conditions | Success: Validation test suite complete, covers all error scenarios from requirement 1, tests fail initially (red phase), clear validation expectations defined_

- [x] 2.2.2 バリデーションユーティリティの実装
  - ファイル: src/lib/utils/validation.ts
  - validateSearchParams: 日付配列の検証
  - validateTimeRange: 時間範囲の検証
  - 目的: 入力データの整合性保証
  - _要件: 要件1（日付と時間帯による検索）, 要件5（エラー表示）_
  - _プロンプト: Role: Backend Developer with expertise in data validation and error handling | Task: Implement validation utility functions (validateSearchParams, validateTimeRange) to pass all tests from 2.2.1, throwing descriptive Japanese error messages | Restrictions: Must throw typed errors with retryable flag, validate all edge cases, provide clear Japanese error messages, ensure validation is synchronous | Success: All tests from 2.2.1 pass, validation is robust and user-friendly, error messages are clear in Japanese, code is well-documented_

### 2.3 時間範囲フィルタリングの実装

- [x] 2.3.1 時間範囲フィルタリングのテスト作成
  - ファイル: src/lib/utils/__tests__/timeFilter.test.ts
  - filterTimeSlots関数のテストケース作成
  - 時間範囲マッチングのテストケース作成
  - 目的: TDDアプローチでのテスト先行作成
  - _要件: 要件1（日付と時間帯による検索）_
  - _プロンプト: Role: QA Engineer with expertise in time-based filtering logic | Task: Write unit tests for filterTimeSlots function that filters TimeSlot[] based on optional TimeRange (From-To), including no filter (returns all), exact match, partial overlap scenarios | Restrictions: Must test edge cases (midnight, 30-minute increments), verify empty results when no matches, test with undefined TimeRange | Success: Complete test coverage for time filtering, all edge cases covered, tests fail initially, clear filtering expectations_

- [x] 2.3.2 時間範囲フィルタリングの実装
  - ファイル: src/lib/utils/timeFilter.ts
  - filterTimeSlots: TimeSlot配列のフィルタリング
  - isTimeInRange: 時刻が範囲内かチェック
  - 目的: 時間範囲による検索結果のフィルタリング
  - _要件: 要件1（日付と時間帯による検索）_
  - _プロンプト: Role: Backend Developer with expertise in time-based algorithms | Task: Implement time filtering functions (filterTimeSlots, isTimeInRange) to pass all tests from 2.3.1, handling 30-minute increment time slots (8:30-21:30) | Restrictions: Must handle edge cases (midnight boundary), optimize for performance, support undefined TimeRange (no filtering), use consistent time format (HH:mm) | Success: All tests from 2.3.1 pass, filtering logic is accurate and efficient, handles all edge cases, well-documented_

## フェーズ3: スクレイピング機能の実装

### 3.1 RateLimiterの実装

- [x] 3.1.1 RateLimiterのテスト作成
  - ファイル: src/lib/scraper/__tests__/rateLimiter.test.ts
  - レート制限チェックのテストケース作成
  - 同時リクエスト制限のテストケース作成
  - 目的: TDDアプローチでのテスト先行作成
  - _要件: 要件3（スクレイピング）_
  - _プロンプト: Role: QA Engineer specializing in rate limiting and concurrency testing | Task: Write unit tests for RateLimiter class enforcing 5-second minimum interval between requests and preventing concurrent requests, including timing verification tests | Restrictions: Must test timing accuracy (±100ms tolerance), test concurrent request blocking, verify request release, use fake timers for test speed | Success: Rate limiter test suite complete, covers timing and concurrency scenarios, tests fail initially, clear rate limiting expectations_

- [x] 3.1.2 RateLimiterの実装
  - ファイル: src/lib/scraper/rateLimiter.ts
  - checkRateLimit: レート制限チェック
  - releaseRequest: リクエスト完了通知
  - 目的: スクレイピング先への負荷軽減
  - _活用: design.md（RateLimiter設計）_
  - _要件: 要件3（スクレイピング）, 非機能要件（セキュリティ）_
  - _プロンプト: Role: Backend Developer with expertise in rate limiting and async/await patterns | Task: Implement RateLimiter class to pass all tests from 3.1.1, enforcing 5-second minimum interval and single concurrent request using async/await and Promises | Restrictions: Must use singleton pattern, handle async timing accurately, throw error on concurrent requests, ensure thread-safe (for Node.js event loop) | Success: All tests from 3.1.1 pass, rate limiting is accurate and reliable, handles concurrent attempts correctly, exported as singleton_

### 3.2 HTMLパーサーの実装

- [x] 3.2.1 HTMLパーサーのテスト作成
  - ファイル: src/lib/scraper/__tests__/parser.test.ts
  - parseFacilities関数のテストケース作成
  - parseAvailability関数のテストケース作成
  - 目的: TDDアプローチでのテスト先行作成
  - _要件: 要件3（スクレイピング）_
  - _プロンプト: Role: QA Engineer with expertise in HTML parsing and web scraping testing | Task: Write unit tests for HTML parser functions (parseFacilities, parseAvailability) using sample HTML fixtures, testing both successful parsing and malformed HTML scenarios | Restrictions: Must use realistic HTML fixtures from actual scraping target, test error cases (missing elements, changed structure), verify type correctness | Success: Parser test suite complete with HTML fixtures, covers success and error cases, tests fail initially, clear parsing expectations defined_

- [x] 3.2.2 HTMLパーサーの実装
  - ファイル: src/lib/scraper/parser.ts
  - parseFacilities: 施設一覧の抽出
  - parseAvailability: 空き状況の抽出
  - 目的: スクレイピングしたHTMLからのデータ抽出
  - _活用: cheerio ライブラリ, design.md（HTMLParser設計）_
  - _要件: 要件3（スクレイピング）_
  - _プロンプト: Role: Web Scraping Developer with expertise in cheerio and HTML parsing | Task: Implement HTML parser functions using cheerio to pass all tests from 3.2.1, extracting Facility[] and TimeSlot[] from宇美町システムHTML structure | Restrictions: Must use cheerio for parsing, handle missing elements gracefully (throw descriptive errors), validate extracted data types, optimize selector performance | Success: All tests from 3.2.1 pass, parsing is robust and handles edge cases, throws descriptive errors for changed HTML, well-documented selectors_

### 3.3 再試行ロジックの実装

- [x] 3.3.1 再試行ロジックのテスト作成
  - ファイル: src/lib/utils/__tests__/retry.test.ts
  - fetchWithRetry関数のテストケース作成
  - リトライ回数と遅延のテストケース作成
  - 目的: TDDアプローチでのテスト先行作成
  - _要件: 要件3（スクレイピング）, 要件5（エラー表示）_
  - _プロンプト: Role: QA Engineer specializing in error handling and retry logic testing | Task: Write unit tests for fetchWithRetry function with configurable retry count (default 1) and 2-second delay, testing success after retry, exhausted retries, and immediate success scenarios | Restrictions: Must use fake timers for delay testing, test with mocked async functions, verify retry count accuracy, test error propagation | Success: Retry logic test suite complete, covers all retry scenarios, tests fail initially, clear retry behavior expectations_

- [x] 3.3.2 再試行ロジックの実装
  - ファイル: src/lib/utils/retry.ts
  - fetchWithRetry: 自動再試行機能
  - sleep: 遅延ユーティリティ
  - 目的: ネットワークエラー時の自動リトライ
  - _活用: design.md（エラーハンドリング）_
  - _要件: 要件3（スクレイピング）, 非機能要件（信頼性）_
  - _プロンプト: Role: Backend Developer with expertise in error handling and resilience patterns | Task: Implement fetchWithRetry utility to pass all tests from 3.3.1, supporting configurable retry count (default 1), 2-second delay between retries, and generic async function parameter | Restrictions: Must use async/await with proper error handling, implement exponential backoff or fixed delay (fixed for this spec), preserve original error if all retries fail, make function generic for reusability | Success: All tests from 3.3.1 pass, retry logic is reliable and configurable, errors are properly propagated, implementation is reusable_

### 3.4 FacilityScraperクラスの実装

- [x] 3.4.1 FacilityScraperクラスの基本構造作成
  - ファイル: src/lib/scraper/index.ts
  - FacilityScraperクラスの骨格作成
  - Puppeteerブラウザの初期化メソッド
  - 目的: スクレイピングの基盤クラス構築
  - _活用: design.md（Scraperクラス設計）_
  - _要件: 要件3（スクレイピング）_
  - _プロンプト: Role: Web Scraping Engineer with expertise in Puppeteer and browser automation | Task: Create FacilityScraper class structure with initBrowser and closeBrowser methods using Puppeteer, configuring headless mode and sandbox settings for Vercel deployment | Restrictions: Must use singleton browser pattern, configure for serverless environment (--no-sandbox, --disable-setuid-sandbox), implement proper cleanup, handle browser lifecycle errors | Success: Class structure created, browser initialization works, proper cleanup on close, configured for Vercel serverless_

- [x] 3.4.2 ページナビゲーションメソッドの実装
  - ファイル: src/lib/scraper/index.ts（継続）
  - navigateToSearchPage メソッド実装
  - selectSports メソッド実装
  - 目的: 宇美町システムへのナビゲーション自動化
  - _要件: 要件3（スクレイピング）_
  - _プロンプト: Role: Browser Automation Developer with expertise in Puppeteer navigation and form interaction | Task: Implement navigateToSearchPage (navigate to 宇美町システム) and selectSports (select basketball/mini-basketball) methods with 10-second timeout and networkidle0 wait strategy | Restrictions: Must set appropriate User-Agent header (Mozilla/5.0 compatible; UmiFacilitySearch/1.0), handle navigation errors, use 10-second timeout, wait for page stability | Success: Navigation methods work reliably, proper timeout handling, User-Agent set correctly, handles common navigation errors_

- [x] 3.4.3 施設選択メソッドの実装
  - ファイル: src/lib/scraper/index.ts（継続）
  - selectAllFacilities メソッド実装
  - 目的: 施設一覧の取得とデータ変換
  - _活用: parser.ts（parseFacilities関数）_
  - _要件: 要件3（スクレイピング）_
  - _プロンプト: Role: Web Scraping Developer with expertise in data extraction and page interaction | Task: Implement selectAllFacilities method that extracts facility list HTML and uses parseFacilities to return Facility[], handling element selection and parsing errors | Restrictions: Must use existing parser.ts functions, verify elements exist before parsing, handle empty facility lists, throw descriptive errors if structure changed | Success: Method successfully extracts facilities, integrates with parser correctly, handles errors gracefully, returns typed Facility array_

- [x] 3.4.4 空き状況スクレイピングメソッドの実装
  - ファイル: src/lib/scraper/index.ts（継続）
  - scrapeAvailability メソッド実装
  - 日付ループと時間範囲フィルタリングの統合
  - 目的: 空き状況データの取得とフィルタリング
  - _活用: parser.ts（parseAvailability関数）, timeFilter.ts（filterTimeSlots関数）_
  - _要件: 要件1（時間帯指定）, 要件3（スクレイピング）_
  - _プロンプト: Role: Web Scraping Developer with expertise in complex data extraction workflows | Task: Implement scrapeAvailability method that loops through dates, extracts availability HTML, parses with parseAvailability, and filters with filterTimeSlots based on optional TimeRange | Restrictions: Must handle multi-date scraping, integrate time filtering correctly, handle missing data gracefully, maintain scraping efficiency, respect rate limiting | Success: Method extracts availability for all dates, time filtering works correctly, integrates parser and filter functions, handles errors properly_

- [x] 3.4.5 メインスクレイピングメソッドの実装
  - ファイル: src/lib/scraper/index.ts（継続）
  - scrapeFacilities メソッド実装（オーケストレーション）
  - エラーハンドリングとクリーンアップの統合
  - 目的: スクレイピング全体のオーケストレーション
  - _活用: design.md（スクレイピングフロー）_
  - _要件: 要件3（スクレイピング）_
  - _プロンプト: Role: Senior Backend Developer with expertise in workflow orchestration and error handling | Task: Implement scrapeFacilities method that orchestrates full scraping flow (init browser → navigate → select sports → get facilities → scrape availability for each → cleanup), with comprehensive error handling and try-finally cleanup | Restrictions: Must ensure browser cleanup in finally block, handle errors at each step, return FacilityAvailability[], implement within 10-second timeout goal, log progress for debugging | Success: Full scraping flow works end-to-end, proper cleanup always executes, comprehensive error handling, returns correct data structure_

### 3.5 Phase 2: 完全なスクレイピングフローの実装調査（✅ 2025-12-06完了）

**ステータス**: ✅ 調査完了 / ✅ 実装完了

**概要**: 調査により正しい4ステップフローを発見し、実装も完了しました。

**調査成果**:
- 4ステップフローの発見（検索→施設選択→日付選択→空き状況取得）
- label.click()パターンの発見
- 日付valueフォーマットの解明（YYYYMMDD + 施設コード）
- 空き状況フィルタリングルールの発見（○△のみ選択）

**実装状況**:
- ✅ 現在のコードは新フロー（全施設選択 → 全日付選択 → 一括取得）に更新済み
- ✅ `selectAllFacilitiesAndNavigate()` 実装完了
- ✅ `selectDatesOnFacilityCalendar()` 実装完了
- ✅ `scrapeTimeSlots()` 実装完了
- ✅ `scrapeFacilities()` は新フローに改修済み

- [x] 3.5.1 HTMLセレクタの調査と文書化（✅ 完了）
  - ファイル: docs/investigation/complete-flow-analysis.md, docs/design/scraping-flow-design.md
  - 日付選択ページのHTML構造調査
  - 空き状況ページのHTML構造調査
  - 各ページの必要なセレクタを文書化
  - 目的: Phase 2実装のための技術調査
  - _活用: Puppeteer, 宇美町施設予約システム_
  - _要件: 要件3（スクレイピング - Phase 2）_

- [x] 3.5.2 施設選択とナビゲーションメソッドの実装（✅ 完了）
  - ファイル: src/lib/scraper/index.ts
  - **実装済み**: 全施設一括選択方式への変更
  - `selectAllFacilitiesAndNavigate()` メソッドの新規実装
  - 全施設チェックボックスを `label.click()` で選択
  - 「次へ進む」ボタン（`.navbar .next > a`）をクリック
  - 目的: 施設検索ページから施設別空き状況ページへの遷移
  - **重要**: `checkbox.checked = true` は動作しない

- [x] 3.5.3 日付選択とナビゲーションメソッドの実装（✅ 完了）
  - ファイル: src/lib/scraper/index.ts
  - **実装済み**: 施設別空き状況ページ（Step 3）で日付を選択
  - `selectDatesOnFacilityCalendar()` メソッドの新規実装
  - 日付valueの最初の8文字（YYYYMMDD）でマッチング
  - ○または△のみ選択（空きあり、一部空き）
  - 最大10日まで選択可能
  - 目的: 施設別空き状況ページから時間帯別空き状況ページへの遷移

- [x] 3.5.4 空き状況データ取得メソッドの実装（✅ 完了）
  - ファイル: src/lib/scraper/index.ts
  - **実装済み**: 時間帯別空き状況ページ（Step 4）から全施設の空き状況を一括取得
  - `scrapeTimeSlots()` メソッドの新規実装
  - 各施設のカレンダーテーブル（`.item .calendar`）をパース
  - コートごとの時間帯データ抽出
  - 時刻計算ロジック（8:30開始、30分刻み）
  - 目的: 時間帯別空き状況の完全取得

- [x] 3.5.5 戻るナビゲーションメソッドの調査（✅ 不要と判明）
  - **結論**: 新しい4ステップフローでは戻る操作は不要
  - 全施設選択 → 全日付選択 → 一括で空き状況取得
  - navigateBackメソッドは実装不要

- [x] 3.5.6 scrapeFacilitiesメソッドの全面改修（✅ 完了）
  - ファイル: src/lib/scraper/index.ts
  - **実装済み**: 正しい4ステップフローへの全面改修
  - Step 1: navigateToSearchPage + selectSports + searchFacilities
  - Step 2: selectAllFacilitiesAndNavigate (新規)
  - Step 3: selectDatesOnFacilityCalendar (新規)
  - Step 4: scrapeTimeSlots (新規)
  - 目的: 完全なスクレイピングフローの統合実行
  - **実装済み**: 正しい4ステップフローに改修完了

- [x] 3.5.7 Phase 2フローの統合テスト（✅ 完了）
  - ファイル: scripts/test-phase2-flow.ts など
  - Phase 2フロー全体の動作確認
  - 複数日、空き状況フィルタリングのテスト
  - 目的: Phase 2実装の品質保証

### 3.6 Phase 2実装タスク（🆕 追加 - 2025-12-06）

**ステータス**: ✅ 完了

**概要**: 調査結果に基づいた実際のコード実装を行いました。

- [x] 3.6.1 selectAllFacilitiesAndNavigate メソッドの実装
  - ファイル: src/lib/scraper/index.ts
  - 全施設チェックボックスを label.click() で選択
  - 「次へ進む」ボタンをクリックして施設別空き状況ページへ遷移
  - 目的: 施設検索ページ（Step 2）から施設別空き状況ページ（Step 3）への遷移
  - _活用: docs/design/scraping-flow-design.md (Step 2), docs/investigation/complete-flow-analysis.md_
  - _要件: 要件3（スクレイピング - Phase 2）_
  - _プロンプト: Role: Web Scraping Developer with expertise in Puppeteer and DOM manipulation | Task: Implement selectAllFacilitiesAndNavigate method that selects all facility checkboxes using label.click() pattern (NOT checkbox.checked = true), waits for DOM updates, clicks "次へ進む" button (.navbar .next > a), and waits for navigation to facility calendar page | Restrictions: Must use label.click() for checkbox selection (checkbox.checked does not work), wait 500ms after clicking for DOM update, verify selection state before proceeding, use 10-second navigation timeout, handle cases where no facilities are available | Success: All facilities selected correctly, navigation succeeds to WgR_ShisetsubetsuAkiJoukyou page, selection verified before proceeding, error handling for missing elements works_

- [x] 3.6.2 selectDatesOnFacilityCalendar メソッドの実装
  - ファイル: src/lib/scraper/index.ts
  - 施設別空き状況ページで対象日付のチェックボックスを選択
  - 日付valueの最初の8文字（YYYYMMDD）でマッチング
  - ○（空きあり）または△（一部空き）のみ選択
  - 目的: 施設別空き状況ページ（Step 3）で日付を選択し、時間帯別空き状況ページ（Step 4）へ遷移
  - _活用: docs/design/scraping-flow-design.md (Step 3), date-fns (format関数)_
  - _要件: 要件3（スクレイピング - Phase 2）_
  - _プロンプト: Role: Web Scraping Developer with expertise in date handling and DOM manipulation | Task: Implement selectDatesOnFacilityCalendar method that converts Date[] to YYYYMMDD format using date-fns, selects matching date checkboxes (input[name="checkdate"]) where value starts with target date AND label shows ○ or △, validates max 10 dates selected, clicks "次へ進む" button, and waits for navigation to time slot page | Restrictions: Must use date-fns format(date, 'yyyyMMdd'), extract first 8 chars of checkbox.value for date matching, only select dates with ○ or △ status (skip ×, －, 休), enforce 10-date maximum limit, use label.click() pattern, handle navigation with 10-second timeout | Success: Correct dates selected based on YYYYMMDD matching, only available dates (○/△) selected, max 10-date validation works, navigation succeeds to WgR_JikantaibetsuAkiJoukyou page, handles cases where dates are unavailable_

- [x] 3.6.3 scrapeTimeSlots メソッドの実装
  - ファイル: src/lib/scraper/index.ts
  - 時間帯別空き状況ページから全施設の空き状況を一括取得
  - 各施設のカレンダーテーブル（.item .calendar）をパース
  - コートごとの時間帯データ抽出（8:30開始、30分刻み）
  - 目的: 時間帯別空き状況ページ（Step 4）から全施設・全日付の空き状況データを取得
  - _活用: docs/design/scraping-flow-design.md (Step 4), src/lib/types/index.ts (FacilityAvailability型)_
  - _要件: 要件3（スクレイピング - Phase 2）_
  - _プロンプト: Role: Web Scraping Developer with expertise in complex DOM parsing and data extraction | Task: Implement scrapeTimeSlots method that extracts all facility availability data from time slot page by iterating .item .calendar elements, parsing facility name from h3, extracting court names from .shisetsu cells, parsing time slot labels (○ for available, × for unavailable), calculating time ranges (starting 8:30, 30-min increments), and returning FacilityAvailability[] with proper date grouping | Restrictions: Must parse all facilities in single page load, extract facility names from h3 within .item, get court names from tr .shisetsu cells, calculate time slots correctly (8:30-9:00, 9:00-9:30, etc.), map ○ to available: true and other statuses to available: false, return properly typed FacilityAvailability[], handle missing or malformed calendar elements | Success: All facilities parsed correctly, court names extracted properly, time slot calculation accurate (8:30 start, 30-min increments), availability status correctly mapped, returns valid FacilityAvailability[], handles edge cases (missing elements, changed structure)_

- [x] 3.6.4 scrapeFacilities メソッドの全面改修
  - ファイル: src/lib/scraper/index.ts
  - 4ステップフローへの完全な書き換え
  - 旧フロー（施設ごと→日付ごとループ）を削除
  - 新フロー（全施設→全日付→一括取得）に変更
  - 目的: スクレイピングフロー全体のオーケストレーション完成
  - _活用: docs/design/scraping-flow-design.md, 3.6.1-3.6.3で実装した新メソッド_
  - _要件: 要件3（スクレイピング）_
  - _プロンプト: Role: Senior Backend Developer with expertise in workflow orchestration and refactoring | Task: Completely rewrite scrapeFacilities method to implement 4-step flow (Step 1: navigate + select sports + search → Step 2: selectAllFacilitiesAndNavigate → Step 3: selectDatesOnFacilityCalendar → Step 4: scrapeTimeSlots), removing old facility/date loops, adding dialog handler (auto-accept), implementing optional TimeRange filtering on results, and ensuring browser cleanup in finally block | Restrictions: Must remove all old loop-based logic (no facility loop, no date loop), use new methods from 3.6.1-3.6.3, maintain dialog auto-accept handler, apply TimeRange filter only if provided, ensure browser cleanup in finally block, log progress at each step, handle errors gracefully without breaking cleanup | Success: Old loop logic completely removed, 4-step flow implemented correctly, all new methods integrated, dialog handler works, TimeRange filtering optional and correct, browser always cleaned up, comprehensive error handling, progress logging clear_

- [x] 3.6.5 統合テストスクリプトの作成
  - ファイル: scripts/test-phase2-flow.ts
  - 新しい4ステップフローの動作確認スクリプト
  - 1日、複数日、時間範囲フィルタリングのテストケース
  - 目的: Phase 2実装の動作確認とデバッグ支援
  - _活用: src/lib/scraper/index.ts (FacilityScraper)_
  - _要件: 要件3（スクレイピング - Phase 2）_
  - _プロンプト: Role: QA Engineer with expertise in integration testing and debugging | Task: Create test-phase2-flow.ts script that tests new 4-step scraping flow with 3 scenarios: (1) single date search (12/11), (2) multiple dates search (12/11-12/15), (3) time range filtering (9:00-12:00), logging detailed progress and results, saving results to JSON files for inspection | Restrictions: Must use actual FacilityScraper.scrapeFacilities method, test with real dates (not mocked), log each step's progress and timing, save results to test-results/ directory as JSON, include error handling and clear success/failure reporting, use headless: false for visual debugging | Success: Script tests all 3 scenarios successfully, logs are detailed and helpful, results saved to JSON files, errors are caught and reported clearly, visual debugging mode works_

- [x] 3.6.6 既存の不要なメソッドの削除
  - ファイル: src/lib/scraper/index.ts
  - `selectFacilityAndNavigate` メソッドの削除（旧フロー用）
  - `navigateBack` メソッドの削除（不要と判明）
  - `selectDateAndNavigate` メソッドの削除（旧フロー用）
  - `scrapeAvailability` メソッドの削除（旧フロー用）
  - `scrapeAvailabilityFromPage` メソッドの削除（旧フロー用）
  - 目的: 旧フローの完全削除とコードクリーンアップ
  - _要件: 非機能要件（メンテナンス性）_
  - _プロンプト: Role: Code Maintenance Engineer with expertise in refactoring and technical debt reduction | Task: Remove all old flow methods (selectFacilityAndNavigate, navigateBack, selectDateAndNavigate, scrapeAvailability, scrapeAvailabilityFromPage) from FacilityScraper class, verify no remaining references to these methods exist in codebase, update any JSDoc comments referencing old flow, ensure TypeScript compilation succeeds after deletion | Restrictions: Must remove methods completely (not just comment out), search codebase for any references before deleting, verify no broken imports or calls, ensure tests don't reference deleted methods, maintain git history (don't squash this commit) | Success: All old flow methods deleted, no references remain in codebase, TypeScript compiles without errors, tests pass (or are updated), git history preserved, code is cleaner and easier to understand_

## フェーズ4: APIエンドポイントの実装

### 4.1 API /api/scrape の実装

- [x] 4.1.1 APIルートの基本構造作成
  - ファイル: src/app/api/scrape/route.ts
  - POST ハンドラの骨格作成
  - リクエスト/レスポンス型の適用
  - 目的: APIエンドポイントの基盤構築
  - _活用: src/lib/types/api.ts_
  - _要件: 要件3（スクレイピング）_
  - _プロンプト: Role: API Developer with expertise in Next.js App Router API routes | Task: Create /api/scrape route.ts with POST handler skeleton, applying ScrapeRequest and ScrapeResponse types, following Next.js 15 API route conventions | Restrictions: Must use Next.js 15 App Router API route format (export async function POST), properly type request and response, return NextResponse objects, handle CORS if needed | Success: API route structure created, request/response properly typed, follows Next.js 15 conventions, basic handler responds successfully_

- [x] 4.1.2 リクエストバリデーションの実装
  - ファイル: src/app/api/scrape/route.ts（継続）
  - リクエストボディの検証
  - エラーレスポンスの実装
  - 目的: 不正なリクエストの拒否
  - _活用: src/lib/utils/validation.ts_
  - _要件: 要件1（バリデーション）, 要件5（エラー表示）_
  - _プロンプト: Role: API Developer with expertise in input validation and error handling | Task: Implement request validation in POST handler using validation.ts functions, returning 400 Bad Request with ErrorResponse for invalid inputs (empty dates, invalid time range) | Restrictions: Must validate all inputs before processing, use existing validation utilities, return proper HTTP status codes (400 for validation, 429 for rate limit), provide user-friendly Japanese error messages | Success: All invalid requests properly rejected, validation errors return 400 with clear messages, uses existing validation utilities, error responses match ErrorResponse type_

- [x] 4.1.3 レート制限の統合
  - ファイル: src/app/api/scrape/route.ts（継続）
  - RateLimiterの統合
  - 429エラーレスポンスの実装
  - 目的: スクレイピング先への負荷制御
  - _活用: src/lib/scraper/rateLimiter.ts_
  - _要件: 要件3（スクレイピング）_
  - _プロンプト: Role: API Developer with expertise in rate limiting and API security | Task: Integrate rateLimiter.checkRateLimit() in POST handler before scraping, catching rate limit errors and returning 429 Too Many Requests with ErrorResponse and retryable: true | Restrictions: Must call checkRateLimit before scraping, always call releaseRequest in finally block, return 429 status code for rate limit errors, provide Japanese error message | Success: Rate limiting integrated correctly, 429 returned when limit exceeded, request always released in finally, proper error response structure_

- [x] 4.1.4 スクレイピング実行の統合
  - ファイル: src/app/api/scrape/route.ts（継続）
  - FacilityScraper.scrapeFacilities の呼び出し
  - レスポンスの返却
  - 目的: スクレイピング処理の実行とデータ返却
  - _活用: src/lib/scraper/index.ts_
  - _要件: 要件3（スクレイピング）_
  - _プロンプト: Role: API Developer with expertise in async operations and data transformation | Task: Integrate FacilityScraper.scrapeFacilities() in POST handler, transforming dates from ISO 8601 strings to Date objects, handling scraping errors, and returning ScrapeResponse with 200 status | Restrictions: Must parse ISO dates correctly, handle all scraping errors gracefully, return 500 for scraping errors with retryable flag, ensure proper async/await usage, always release rate limiter | Success: Scraping integrated successfully, date parsing works correctly, errors handled appropriately, proper response structure, rate limiter always released_

- [x] 4.1.5 エラーハンドリングの完成
  - ファイル: src/app/api/scrape/route.ts（継続）
  - 包括的なtry-catchブロック
  - エラータイプ別のレスポンス
  - 目的: 堅牢なエラーハンドリング
  - _活用: design.md（エラーハンドリング）_
  - _要件: 要件3（エラーハンドリング）, 要件5（エラー表示）_
  - _プロンプト: Role: Senior Backend Developer with expertise in comprehensive error handling | Task: Implement complete error handling in POST handler with try-catch-finally, categorizing errors (NetworkError, TimeoutError, ScrapingError) and returning appropriate ErrorResponse with correct HTTP status codes and retryable flags | Restrictions: Must categorize errors by type, use finally for cleanup (releaseRequest), return user-friendly Japanese messages, log errors for debugging, never expose internal errors to client | Success: All error scenarios handled correctly, errors categorized appropriately, proper status codes and retryable flags, cleanup always executes, no internal error leakage_

## フェーズ5: UIコンポーネントの実装

### 5.1 基本UIコンポーネント

- [x] 5.1.1 LoadingSpinnerコンポーネントの作成
  - ファイル: src/components/ui/LoadingSpinner.tsx
  - アニメーション付きスピナー
  - 進行状況メッセージ表示
  - 目的: ローディング状態の視覚化
  - _活用: TailwindCSS_
  - _要件: 要件4（ローディング状態）_
  - _プロンプト: Role: Frontend Developer with expertise in React components and CSS animations | Task: Create LoadingSpinner component with animated spinner (TailwindCSS animate-spin) and optional message prop, optimized for mobile viewing | Restrictions: Must be a client component ('use client'), use TailwindCSS for styling, ensure animation is smooth (60fps), support optional message string, maintain accessibility (aria-label) | Success: Component renders spinner correctly, animation is smooth, message displays properly, accessible, mobile-optimized_

- [x] 5.1.2 ErrorMessageコンポーネントの作成
  - ファイル: src/components/ui/ErrorMessage.tsx
  - エラータイプ別メッセージ表示
  - 再試行ボタン
  - 目的: ユーザーフレンドリーなエラー表示
  - _要件: 要件5（エラー表示とフォールバック）_
  - _プロンプト: Role: Frontend Developer with expertise in error UX and React components | Task: Create ErrorMessage component that displays error type-specific messages (network, timeout, scraping, validation) with optional onRetry callback for retry button, following mobile-first design | Restrictions: Must be a client component, provide clear Japanese messages for each error type, style retry button with min 44px tap target, use TailwindCSS, support optional retry callback | Success: Component displays correct messages per error type, retry button works and meets tap target size, mobile-optimized, accessible_

### 5.2 フォームコンポーネント

- [x] 5.2.1 DatePickerコンポーネントの作成
  - ファイル: src/components/ui/DatePicker.tsx
  - カレンダーグリッドUI
  - 複数日選択機能
  - 目的: 日付選択UI提供
  - _活用: date-fns, TailwindCSS_
  - _要件: 要件1（複数日選択）_
  - _プロンプト: Role: Frontend Developer with expertise in calendar UIs and touch interactions | Task: Create DatePicker component with calendar grid layout using TailwindCSS, supporting multiple date selection with visual highlighting, using date-fns for date calculations, optimized for mobile touch | Restrictions: Must be a client component, use date-fns for date math, implement minDate prop to restrict past dates, use TailwindCSS grid for layout, ensure tap targets are 44px+, show clear selection state | Success: Calendar displays correctly, multiple dates selectable, selection visually clear, touch-optimized, respects minDate, uses date-fns_

- [x] 5.2.2 QuickDateSelectコンポーネントの作成
  - ファイル: src/components/ui/QuickDateSelect.tsx
  - 「本日から1週間」ボタン
  - 日付配列の自動生成
  - 目的: クイック日付選択機能
  - _活用: date-fns, src/lib/utils/date.ts_
  - _要件: 要件1（クイック日付選択）_
  - _プロンプト: Role: Frontend Developer with expertise in React hooks and date utilities | Task: Create QuickDateSelect component with "本日から1週間" button that generates 7-day Date array using date.ts generateDateRange utility and calls onQuickSelect callback | Restrictions: Must be a client component, use existing generateDateRange utility, style button with 44px+ tap target, use clear Japanese label, integrate with parent form state | Success: Button renders correctly, generates 7-day array on click, callback fires with correct dates, meets tap target size, integrates smoothly_

- [x] 5.2.3 TimePickerコンポーネントの作成
  - ファイル: src/components/ui/TimePicker.tsx
  - From-To時刻選択ドロップダウン
  - バリデーション（Toは Fromより後）
  - 目的: 時間範囲選択UI提供
  - _活用: TailwindCSS_
  - _要件: 要件1（時間帯指定）_
  - _プロンプト: Role: Frontend Developer with expertise in form inputs and validation | Task: Create TimePicker component with From/To dropdowns (8:30 to 21:30 in 30-min increments), validating To > From, supporting undefined (全時間帯), optimized for mobile touch | Restrictions: Must be a client component, generate time options dynamically (8:30-21:30, 30min steps), validate To is after From, style dropdowns for mobile (large tap target), allow clearing (全時間帯), use controlled component pattern | Success: Dropdowns display correctly, validation works (To > From), supports undefined state, mobile-optimized, validation feedback clear_

- [x] 5.2.4 SearchFormコンポーネントの作成
  - ファイル: src/components/SearchForm.tsx
  - フォームレイアウトの構築
  - DatePicker, TimePicker, QuickDateSelectの統合
  - バリデーションとsubmit処理
  - 目的: 検索フォームの統合
  - _活用: DatePicker, TimePicker, QuickDateSelect, validation.ts_
  - _要件: 要件1（日付と時間帯による検索）_
  - _プロンプト: Role: React Developer with expertise in form state management and validation | Task: Create SearchForm component integrating DatePicker, TimePicker, QuickDateSelect with useState for form state, validation.ts for validation, and onSubmit callback, with loading state support | Restrictions: Must be a client component, use controlled components for all inputs, validate with validation.ts before submit, disable form during loading (isLoading prop), display validation errors in Japanese, mobile-first layout | Success: Form integrates all subcomponents, validation works correctly, submit fires with SearchParams, loading state disables form, mobile-optimized layout, validation errors clear_

### 5.3 結果表示コンポーネント

- [x] 5.3.1 AvailabilityListコンポーネントの作成
  - ファイル: src/components/AvailabilityList.tsx
  - 時間帯リスト表示
  - 空き/空いていないの視覚的区別
  - 展開/折りたたみボタン
  - 目的: 時間帯ごとの空き状況表示
  - _要件: 要件2（時間帯の展開/折りたたみ）_
  - _プロンプト: Role: Frontend Developer with expertise in list rendering and interactive UI | Task: Create AvailabilityList component displaying TimeSlot[] with visual distinction (green for available, gray for unavailable), toggle button to show all slots or available only, optimized for mobile scrolling | Restrictions: Must be a client component, use TailwindCSS for color coding (green=空き, gray=空いていない), implement showAll toggle state, render efficiently for long lists, use semantic HTML, 44px+ tap target for toggle | Success: List renders time slots correctly, color coding clear, toggle works smoothly, mobile-optimized scrolling, accessible, efficient rendering_

- [x] 5.3.2 FacilityCardコンポーネントの作成
  - ファイル: src/components/FacilityCard.tsx
  - 施設名表示
  - 日付ごとの空き状況セクション
  - AvailabilityListの統合
  - 目的: 施設単位の空き状況表示
  - _活用: AvailabilityList, date-fns_
  - _要件: 要件2（施設情報の表示）_
  - _プロンプト: Role: React Developer with expertise in component composition and card layouts | Task: Create FacilityCard component displaying facility name and availability grouped by date using AvailabilityList, with expand/collapse per date, formatted with date-fns (Japanese locale), mobile-first card design | Restrictions: Must be a client component, use AvailabilityList for slot rendering, format dates with date-fns (2025年12月5日), implement expand/collapse state per date, use TailwindCSS card styling, vertical-only scroll | Success: Card displays facility info correctly, dates formatted properly, AvailabilityList integrated, expand/collapse works per date, mobile-optimized card layout_

## フェーズ6: ページの実装

### 6.1 トップページ（検索フォーム）

- [x] 6.1.1 トップページの作成
  - ファイル: src/app/page.tsx
  - SearchFormの統合
  - 検索実行とAPIコール
  - 結果ページへのナビゲーション
  - 目的: ユーザーのエントリーポイント
  - _活用: SearchForm, Next.js App Router_
  - _要件: 要件1（日付と時間帯による検索）, 要件4（ローディング状態）_
  - _プロンプト: Role: Full-stack Developer with expertise in Next.js App Router and API integration | Task: Create homepage (app/page.tsx) as client component with SearchForm, handling form submit by calling /api/scrape, showing LoadingSpinner during API call, navigating to /results with search params on success, handling errors with ErrorMessage | Restrictions: Must be a client component ('use client'), use fetch for API calls, pass search params via URL to /results page, manage loading state, handle all error types, use Next.js navigation (useRouter), mobile-first layout | Success: Page renders SearchForm correctly, API call works on submit, loading state displays, navigates to results on success, errors handled with ErrorMessage, mobile-optimized_

### 6.2 検索結果ページ

- [x] 6.2.1 結果ページの作成
  - ファイル: src/app/results/page.tsx
  - FacilityCardのマップレンダリング
  - 「空きなし」メッセージ
  - 検索条件の表示
  - 目的: 検索結果の表示
  - _活用: FacilityCard, Next.js App Router_
  - _要件: 要件2（検索結果表示）_
  - _プロンプト: Role: React Developer with expertise in Next.js pages and data rendering | Task: Create results page (app/results/page.tsx) as client component receiving search results from URL params (or state), rendering FacilityCard[] with vertical scrolling, showing "空きがありません" if no facilities, displaying search criteria at top | Restrictions: Must be a client component, retrieve results from URL params or router state, render FacilityCard for each facility, handle empty results gracefully, vertical-only scrolling, mobile-first layout, show search params (dates, time range) | Success: Page renders facility cards correctly, empty state displays properly, search criteria shown clearly, vertical-only scroll, mobile-optimized layout_

## フェーズ7: スタイリングと最適化

### 7.1 グローバルスタイルとレイアウト

- [x] 7.1.1 グローバルスタイルの調整
  - ファイル: src/styles/globals.css
  - 日本語フォント設定
  - モバイル最適化スタイル
  - カラーパレット定義
  - 目的: アプリケーション全体のスタイル統一
  - _要件: 要件6（レスポンシブデザイン）_
  - _プロンプト: Role: Frontend Developer with expertise in CSS and typography for Japanese web design | Task: Customize globals.css with Japanese font stack (system fonts), mobile-first base styles (16px minimum font size), TailwindCSS custom utilities (tap-target-44 class for 44px min-width/height), color palette variables | Restrictions: Must use system fonts for Japanese (Hiragino Sans, Meiryo, etc.), ensure 16px+ body text, define 44px tap target utility, maintain 4.5:1 contrast ratio, optimize for mobile viewport | Success: Fonts render correctly in Japanese, mobile typography optimized, tap target utility available, color palette defined, high contrast maintained_

- [x] 7.1.2 レイアウトコンポーネントの作成
  - ファイル: src/app/layout.tsx
  - HTMLメタタグの設定
  - フォント最適化（next/font）
  - 共通レイアウト構造
  - 目的: アプリケーションレイアウトの基盤
  - _活用: Next.js App Router, next/font_
  - _要件: 要件6（レスポンシブデザイン）, 非機能要件（パフォーマンス）_
  - _プロンプト: Role: Next.js Developer with expertise in App Router layouts and font optimization | Task: Configure root layout (app/layout.tsx) with next/font for Japanese fonts (Noto Sans JP from Google Fonts), viewport meta tags for mobile, basic HTML structure, integrating globals.css | Restrictions: Must use next/font/google for font optimization, set viewport meta tag (width=device-width, initial-scale=1), include proper lang="ja" attribute, import globals.css, keep layout minimal (no unnecessary wrapping) | Success: Layout configured correctly, fonts optimized with next/font, mobile viewport meta tags set, Japanese language attribute present, globals.css applied_

### 7.2 エラーとローディングページ

- [x] 7.2.1 エラーページの作成
  - ファイル: src/app/error.tsx
  - Next.js App Routerエラーバウンダリ
  - エラーメッセージと再試行ボタン
  - 目的: アプリケーションレベルのエラーハンドリング
  - _活用: ErrorMessage コンポーネント_
  - _要件: 要件5（エラー表示）_
  - _プロンプト: Role: React Developer with expertise in Next.js error boundaries | Task: Create error.tsx error boundary for App Router with ErrorMessage component, displaying generic error with reset button, following Next.js error.tsx conventions | Restrictions: Must be a client component, use Next.js error/reset props signature, integrate ErrorMessage component, provide generic user-friendly Japanese message, trigger reset on retry button | Success: Error boundary catches errors correctly, ErrorMessage displays properly, reset button works, follows Next.js conventions, mobile-optimized_

- [x] 7.2.2 ローディングページの作成
  - ファイル: src/app/loading.tsx
  - Next.js App Routerローディング状態
  - LoadingSpinnerの統合
  - 目的: ページ遷移時のローディング表示
  - _活用: LoadingSpinner コンポーネント_
  - _要件: 要件4（ローディング状態）_
  - _プロンプト: Role: React Developer with expertise in Next.js loading states | Task: Create loading.tsx for App Router showing LoadingSpinner with "読み込み中..." message, following Next.js loading.tsx conventions | Restrictions: Must export default function, use LoadingSpinner component, provide appropriate message, center spinner on screen, mobile-optimized | Success: Loading state displays correctly during navigation, LoadingSpinner integrated, centered and mobile-optimized, follows Next.js conventions_

## フェーズ8: テストとドキュメント

### 8.1 ユニットテストの完成

- [x] 8.1.1 ユーティリティ関数のテスト完成
  - ファイル: すべての src/lib/utils/__tests__/*.test.ts
  - 全ユーティリティのテストカバレッジ確認
  - エッジケースの追加テスト
  - 目的: ユーティリティレイヤーの品質保証
  - _要件: 非機能要件（メンテナンス性）_
  - _プロンプト: Role: QA Engineer with expertise in test coverage and code quality | Task: Review and complete all utility function tests (date, validation, retry, timeFilter), ensuring 90%+ coverage, adding edge case tests where missing, verifying all tests pass | Restrictions: Must achieve 90%+ coverage for utilities, test all edge cases, ensure tests are fast (<100ms each), use descriptive test names in Japanese, maintain test isolation | Success: All utility tests pass, 90%+ coverage achieved, edge cases covered comprehensively, tests run fast, well-documented_

- [x] 8.1.2 スクレイパーのテスト完成
  - ファイル: src/lib/scraper/__tests__/*.test.ts
  - HTMLパーサーのテスト完成
  - RateLimiterのテスト完成
  - 目的: スクレイピングレイヤーの品質保証
  - _要件: 非機能要件（メンテナンス性）_
  - _プロンプト: Role: QA Engineer with expertise in web scraping testing | Task: Complete all scraper tests (parser, rateLimiter) ensuring 80%+ coverage, using realistic HTML fixtures, testing error scenarios (changed HTML structure, network errors), verifying all tests pass | Restrictions: Must achieve 80%+ coverage for scraper, use realistic HTML fixtures from actual site, test error detection for HTML changes, mock Puppeteer for speed, maintain test reliability | Success: All scraper tests pass, 80%+ coverage, HTML fixtures realistic, error detection tested, tests are reliable and fast_

### 8.2 統合テストと手動検証

- [x] 8.2.1 API統合テストの作成
  - ファイル: src/app/api/scrape/__tests__/route.test.ts
  - /api/scrape エンドポイントの統合テスト
  - バリデーション、レート制限、エラーハンドリングのテスト
  - 目的: APIレイヤーの品質保証
  - _要件: 要件3（スクレイピング）, 要件5（エラー表示）_
  - _プロンプト: Role: QA Engineer with expertise in API testing and Next.js integration testing | Task: Create integration tests for /api/scrape endpoint testing request validation (empty dates returns 400), rate limiting (returns 429), scraping errors (returns 500), and successful scraping (returns 200 with ScrapeResponse), mocking FacilityScraper | Restrictions: Must mock FacilityScraper for speed, test all HTTP status codes (200, 400, 429, 500), verify response structures match types, test error messages in Japanese, ensure tests are isolated | Success: API integration tests pass, all status codes tested, response structures validated, error messages verified, mocked scraper works reliably_

- [x] 8.2.2 コンポーネントのテスト作成
  - ファイル: src/components/__tests__/*.test.tsx
  - 主要コンポーネント（SearchForm, FacilityCard）のテスト
  - ユーザーインタラクションのテスト
  - 目的: UIコンポーネントの品質保証
  - _要件: 要件1（検索フォーム）, 要件2（結果表示）_
  - _プロンプト: Role: Frontend QA Engineer with expertise in React Testing Library and component testing | Task: Create component tests for SearchForm (form submission, validation errors, loading state) and FacilityCard (rendering availability, expand/collapse), using React Testing Library and user interaction simulations | Restrictions: Must use React Testing Library and @testing-library/user-event, test user interactions (clicks, form inputs), verify UI updates, test accessibility (roles, labels), avoid testing implementation details | Success: Component tests pass, user interactions tested, UI updates verified, accessibility checked, tests are maintainable and follow best practices_

- [x] 8.2.3 手動E2Eテスト手順書の作成
  - ファイル: docs/testing/e2e-manual.md
  - 手動テストシナリオの文書化
  - モバイルデバイスでのテスト手順
  - 目的: リリース前の品質確認手順確立
  - _要件: すべての要件_
  - _プロンプト: Role: QA Lead with expertise in test documentation and E2E testing | Task: Create comprehensive manual E2E test document covering all user scenarios (date selection, time filtering, search execution, result display, error handling), with specific steps for mobile device testing (iOS Safari, Android Chrome), including expected results for each scenario | Restrictions: Must cover all requirements, provide step-by-step instructions in Japanese, specify expected results clearly, include both success and error scenarios, target mobile browsers (iOS 14+, Android Chrome 90+) | Success: Manual test document complete, covers all scenarios, steps are clear and actionable, expected results specified, mobile-specific instructions included_

### 8.3 ドキュメントの作成

- [x] 8.3.1 README.mdの作成
  - ファイル: README.md
  - プロジェクト概要
  - セットアップ手順
  - 開発コマンド
  - 目的: 開発者向けドキュメント提供
  - _要件: 非機能要件（メンテナンス性）_
  - _プロンプト: Role: Technical Writer with expertise in developer documentation | Task: Create comprehensive README.md covering project overview (purpose, tech stack), setup instructions (pnpm install, environment variables), development commands (dev, build, test, lint), deployment instructions (Vercel), and project structure overview | Restrictions: Must write in Japanese, provide clear step-by-step setup, document all pnpm scripts, include troubleshooting section, keep concise but comprehensive, use markdown formatting | Success: README is comprehensive and clear, setup instructions work for new developers, all commands documented, written in Japanese, well-formatted_

- [x] 8.3.2 API仕様書の作成
  - ファイル: docs/api/scrape-endpoint.md
  - /api/scrape の詳細仕様
  - リクエスト/レスポンス例
  - エラーコード一覧
  - 目的: APIの明確な仕様定義
  - _要件: 要件3（スクレイピング）, 要件5（エラー表示）_
  - _プロンプト: Role: API Documentation Specialist with expertise in REST API documentation | Task: Create detailed API specification document for /api/scrape endpoint including endpoint URL, HTTP method, request body schema (ScrapeRequest), response schema (ScrapeResponse), error responses (ErrorResponse with all error types), example requests/responses in JSON, rate limiting details | Restrictions: Must write in Japanese, provide complete JSON examples, document all error codes (400, 429, 500) with scenarios, specify rate limiting (5 seconds, single concurrent request), use clear formatting | Success: API spec is complete and clear, all schemas documented, examples are accurate, error scenarios covered, rate limiting explained, well-formatted_

- [x] 8.3.3 ユーザーマニュアルの作成
  - ファイル: docs/user-guide.md
  - 使い方の説明
  - スクリーンショット（将来追加）
  - よくある質問
  - 目的: エンドユーザー向けガイド提供
  - _要件: すべての要件_
  - _プロンプト: Role: Technical Writer with expertise in end-user documentation | Task: Create user guide explaining how to search facilities (date selection, time range filtering, quick select), interpret results (availability colors, expand/collapse), handle errors (retry button), with FAQ section (what if no results, why does it take time, etc.), written for non-technical users | Restrictions: Must write in simple Japanese for general users, explain all UI elements clearly, provide clear instructions for each feature, include FAQ for common scenarios, note screenshot placeholders (to be added after deployment) | Success: User guide is clear for non-technical users, all features explained, FAQ covers common questions, written in simple Japanese, easy to follow_

## フェーズ9: デプロイメントと最終調整

### 9.1 Vercelデプロイ設定

- [x] 9.1.1 next.config.js の最適化
  - ファイル: next.config.js
  - Puppeteer用のserverComponentsExternalPackages設定
  - ビルド最適化設定
  - 目的: 本番環境向けの最適化
  - _活用: design.md（デプロイ設計）_
  - _要件: 非機能要件（パフォーマンス）_
  - _プロンプト: Role: DevOps Engineer with expertise in Next.js production optimization and Vercel deployment | Task: Configure next.config.js with production optimizations (reactStrictMode, swcMinify, compress, poweredByHeader: false) and Puppeteer configuration (experimental.serverComponentsExternalPackages: ['puppeteer']) for Vercel deployment | Restrictions: Must enable all recommended optimizations, configure Puppeteer for serverless, ensure compatibility with Next.js 15 and Vercel, maintain security settings, optimize bundle size | Success: next.config.js configured correctly, Puppeteer works in Vercel environment, optimizations enabled, builds successfully, bundle size minimized_

- [x] 9.1.2 vercel.json の作成
  - ファイル: vercel.json
  - ビルドコマンドの設定
  - リージョン設定（hnd1）
  - 目的: Vercelデプロイの設定
  - _活用: design.md（デプロイ設計）_
  - _要件: tech.md（デプロイメント）_
  - _プロンプト: Role: DevOps Engineer with expertise in Vercel configuration | Task: Create vercel.json with build settings (buildCommand: pnpm build, installCommand: pnpm install, devCommand: pnpm dev), framework: nextjs, regions: ["hnd1"] for Tokyo region, following Vercel best practices | Restrictions: Must use pnpm commands, specify Tokyo region (hnd1) for low latency, follow Vercel configuration schema, ensure compatibility with Next.js 15 | Success: vercel.json created correctly, build commands use pnpm, Tokyo region specified, validates against Vercel schema, deployment succeeds_

### 9.2 パフォーマンス最適化

- [x] 9.2.1 バンドルサイズの最適化
  - ファイル: 各種コンポーネントファイル
  - Dynamic Importの検討と実装
  - Tree Shakingの確認
  - 目的: JavaScriptバンドルサイズの削減
  - _要件: 非機能要件（パフォーマンス）_
  - _プロンプト: Role: Performance Engineer with expertise in bundle size optimization and code splitting | Task: Analyze bundle size, implement dynamic imports for heavy components (DatePicker, FacilityCard if needed), verify tree shaking works for all dependencies, ensure total bundle <300KB gzipped, using Next.js bundle analyzer | Restrictions: Must keep bundle under 300KB gzipped, use next/dynamic for code splitting where beneficial, verify no unused dependencies, maintain functionality, use @next/bundle-analyzer for analysis | Success: Bundle size under 300KB gzipped, dynamic imports implemented strategically, tree shaking verified, no unused dependencies, bundle analyzer report shows optimization_

- [x] 9.2.2 画像とフォントの最適化
  - ファイル: src/app/layout.tsx, 各種コンポーネント
  - next/fontの最適化確認
  - next/imageの適用（画像がある場合）
  - 目的: リソース読み込みの最適化
  - _要件: 非機能要件（パフォーマンス）_
  - _プロンプト: Role: Frontend Performance Engineer with expertise in web font and image optimization | Task: Verify next/font is properly configured with font subsetting for Japanese characters, apply next/image for any images (icons, logos if added), ensure font display: swap for font loading, optimize font preloading | Restrictions: Must use next/font/google with subset for Japanese, ensure font display strategy prevents layout shift, use next/image for all images, optimize image formats (WebP), preload critical fonts | Success: Fonts optimized with next/font and proper subset, font loading doesn't block rendering, images use next/image, font display strategy prevents CLS, LCP under 2.5s_

### 9.3 Lighthouseテストと最終調整

- [x] 9.3.1 Lighthouseパフォーマンステスト
  - ファイル: N/A（テスト実行）
  - Lighthouse Mobileスコアの測定
  - パフォーマンス指標の確認（FCP, LCP）
  - 目的: 非機能要件の検証
  - _要件: 非機能要件（パフォーマンス）_
  - _プロンプト: Role: Performance QA Engineer with expertise in Lighthouse and Core Web Vitals | Task: Run Lighthouse tests on deployed Vercel preview (mobile configuration), verify Performance score 90+, FCP <1.8s, LCP <2.5s, identify and document any issues for optimization, create performance report | Restrictions: Must test on mobile configuration, test on real Vercel deployment (not localhost), verify all Core Web Vitals meet targets, test multiple pages (/home, /results), document all metrics | Success: Lighthouse Performance score 90+, FCP <1.8s, LCP <2.5s achieved, all issues documented, performance report created, meets non-functional requirements_

- [x] 9.3.2 アクセシビリティとSEOの確認
  - ファイル: 各種コンポーネントファイル
  - Lighthouse Accessibilityスコアの確認
  - セマンティックHTML、ARIA属性の確認
  - 目的: 基本的なアクセシビリティ確保
  - _要件: 非機能要件（ユーザビリティ）_
  - _プロンプト: Role: Accessibility Specialist with expertise in WCAG and semantic HTML | Task: Run Lighthouse accessibility audit, verify semantic HTML usage (header, nav, main, section), check ARIA labels on interactive elements, ensure color contrast 4.5:1+, verify keyboard navigation works, fix any accessibility issues found | Restrictions: Must achieve Lighthouse Accessibility score 90+, use semantic HTML5 elements, add ARIA labels where needed, ensure 4.5:1 contrast ratio, test keyboard navigation (tab, enter), fix all identified issues | Success: Lighthouse Accessibility score 90+, semantic HTML used correctly, ARIA labels present, contrast ratio meets standard, keyboard navigation works, no critical accessibility issues_

- [x] 9.3.3 モバイルデバイス実機テスト
  - ファイル: N/A（手動テスト）
  - iOS Safari 14+ での動作確認
  - Android Chrome 90+ での動作確認
  - 目的: 実機での互換性検証
  - _要件: 要件6（レスポンシブデザイン）, 非機能要件（互換性）_
  - _プロンプト: Role: Mobile QA Engineer with expertise in cross-browser and device testing | Task: Perform manual testing on real devices (iOS Safari 14+ on iPhone, Android Chrome 90+ on Android), verify all functionality works (date selection, search, results display), check touch interactions (tap targets, scrolling), verify layout on various screen sizes (320px to 1920px), document any issues | Restrictions: Must test on actual devices (not just emulators), test minimum supported versions (iOS Safari 14, Android Chrome 90), verify tap targets are 44px+, test vertical-only scrolling, verify Japanese text renders correctly, test in both portrait and landscape | Success: App works correctly on iOS Safari 14+ and Android Chrome 90+, all touch interactions work smoothly, tap targets meet 44px requirement, layouts work on all screen sizes, no critical device-specific issues_

## フェーズ10: リリースと監視

### 10.1 本番デプロイメント

- [ ] 10.1.1 本番環境へのデプロイ
  - ファイル: N/A（Vercelデプロイ）
  - Vercel本番デプロイの実行
  - カスタムドメインの設定（オプション）
  - 目的: アプリケーションの公開
  - _要件: tech.md（デプロイメント）_
  - _プロンプト: Role: DevOps Engineer with expertise in Vercel production deployments | Task: Deploy application to Vercel production environment, verify deployment succeeds, configure custom domain if provided (or use Vercel default .vercel.app), verify HTTPS works, test production URL with all features, create deployment checklist | Restrictions: Must deploy to production (not preview), verify all environment variables set (if any), test full user journey on production URL, ensure HTTPS certificate works, document production URL | Success: Deployment to production succeeds, HTTPS works correctly, all features functional on production, custom domain configured (if applicable), production URL documented_

### 10.2 ポストデプロイ検証

- [ ] 10.2.1 本番環境での動作確認
  - ファイル: N/A（手動テスト）
  - すべての機能の動作確認
  - スクレイピングの実際の動作確認
  - エラーハンドリングの確認
  - 目的: 本番環境での品質保証
  - _要件: すべての要件_
  - _プロンプト: Role: QA Lead with expertise in production validation and smoke testing | Task: Execute comprehensive smoke test on production environment, test all user scenarios (search with various date/time combinations, view results, error scenarios), verify actual scraping from 宇美町システム works, test on mobile devices, document any production-specific issues | Restrictions: Must test on production URL, verify real scraping works (not mocked), test all error scenarios (invalid input, rate limiting), test on mobile browsers (iOS Safari, Android Chrome), validate Japanese text displays correctly | Success: All features work correctly in production, real scraping succeeds, error handling works as expected, mobile testing passes, no production-specific issues found_

- [ ] 10.2.2 パフォーマンスモニタリングの確認
  - ファイル: N/A（モニタリング）
  - Vercel Analyticsの確認
  - 初期のエラーログ確認
  - 目的: 本番環境の健全性確認
  - _要件: 非機能要件（信頼性）_
  - _プロンプト: Role: DevOps Engineer with expertise in application monitoring and Vercel Analytics | Task: Set up basic monitoring using Vercel's built-in analytics and logs, verify no errors in production logs, check initial performance metrics (response times, error rates), document how to access logs and analytics, create monitoring checklist for ongoing maintenance | Restrictions: Must use Vercel's free tier monitoring tools, verify no errors in first 24 hours, document log access procedures, note any performance anomalies, create simple monitoring runbook | Success: Vercel Analytics accessible, no errors in production logs, initial performance metrics normal, log access documented, monitoring runbook created_

## 完了基準

すべてのタスクが完了し、以下の基準を満たすことで本プロジェクトは完了とします：

### 機能要件
- ✅ 日付と時間帯による検索機能が動作
- ✅ モバイル最適化された検索結果表示
- ✅ スクレイピングによるデータ取得が成功
- ✅ ローディング状態の表示
- ✅ エラー表示とフォールバック機能
- ✅ レスポンシブデザイン（モバイルファースト）

### 非機能要件
- ✅ Lighthouseスコア90以上（Performance, Accessibility）
- ✅ 初回表示時間2秒以内
- ✅ バンドルサイズ300KB以下（gzip）
- ✅ iOS Safari 14+、Android Chrome 90+ で動作確認
- ✅ タップターゲット44px以上
- ✅ 本文フォントサイズ16px以上

### テストとドキュメント
- ✅ ユニットテストカバレッジ: ユーティリティ90%+、スクレイパー80%+
- ✅ すべてのテストがパス
- ✅ README.md、API仕様書、ユーザーマニュアルが完成

### デプロイメント
- ✅ Vercel本番環境へのデプロイ成功
- ✅ 本番環境での動作確認完了
- ✅ 監視とログの設定完了

## 備考

- 各タスクはTDD（テスト駆動開発）アプローチに従い、テスト作成→実装の順序で進めます
- モバイルファーストの原則を常に意識して実装します
- スクレイピング先への配慮（レート制限、User-Agent設定）を厳守します
- すべてのUI要素は日本語で提供します
