# Tasks Document

## Phase 1: 直接API呼び出しの基盤実装（最優先）

- [x] 1. 定数ファイルに施設IDを定義
  - File: src/lib/scraper/constants.ts
  - 固定の施設ID配列（341007, 341009など全10施設）を定義
  - エクスポートして他のモジュールから参照可能にする
  - Purpose: 施設IDをハードコードから管理された定数に移行
  - _Leverage: 既存のconstants.tsがあれば拡張、なければ新規作成_
  - _Requirements: 1.2_
  - _Prompt: Role: TypeScript開発者 | Task: 宇美町システムの全施設ID（341007=宇美勤労者体育センター、341009=宇美南町民センター など10施設）を定数配列として定義し、エクスポートする。施設名もコメントで記載すること。 | Restrictions: 値は文字列配列として定義、変更不可（as const）とする | Success: FACILITY_IDSがエクスポートされ、TypeScript型推論が正しく機能する_

- [x] 2. DirectApiClientクラスの基本構造を作成
  - File: src/lib/scraper/DirectApiClient.ts
  - クラス定義とコンストラクタを実装
  - Puppeteer Pageオブジェクトを受け取る構造を設計
  - Purpose: 直接API呼び出しのための専用クラスを準備
  - _Leverage: src/lib/scraper/index.ts (FacilityScraperの構造を参考)_
  - _Requirements: 1.1_
  - _Prompt: Role: オブジェクト指向設計に精通したTypeScript開発者 | Task: DirectApiClientクラスを作成し、Puppeteer Pageオブジェクトを保持するコンストラクタを実装する。エラーハンドリング用のprivateメソッドスタブも用意すること。 | Restrictions: 外部依存はPuppeteerのみ、クラスはエクスポート可能、メソッドは後続タスクで実装 | Success: クラスがインポート可能で、型エラーがない状態_

- [x] 3. fetchToken メソッドを実装
  - File: src/lib/scraper/DirectApiClient.ts
  - 初回アクセス時にセッションCookieと__RequestVerificationTokenを取得
  - トークンをHTMLから抽出してキャッシュ
  - Purpose: CSRF保護トークンを取得して後続リクエストで使用可能にする
  - _Leverage: src/lib/scraper/index.ts の既存DOM操作パターン_
  - _Requirements: 1.3_
  - _Prompt: Role: Webスクレイピングに精通したNode.js開発者 | Task: 宇美町システムの検索ページ (https://www.11489.jp/Umi/web/Home/WgR_ModeSelect) にアクセスし、ページ内の`input[name="__RequestVerificationToken"]`からトークン値を抽出して返すメソッドを実装。エラー時は適切な例外をスロー。 | Restrictions: タイムアウトは30秒、トークンが見つからない場合はエラー | Success: トークンが正しく取得でき、後続リクエストで使用可能_

- [x] 4. postToFacilityCalendar メソッドを実装
  - File: src/lib/scraper/DirectApiClient.ts
  - 施設別空き状況ページ（WgR_ShisetsubetsuAkiJoukyou）へ直接POSTリクエスト送信
  - 施設ID配列と日付配列からcheckedateパラメータを生成
  - __RequestVerificationTokenとCookieを含めてリクエスト
  - Purpose: 3ステップをスキップして直接施設カレンダーページへ遷移
  - _Leverage: scripts/investigate-api-structure.ts の調査結果_
  - _Requirements: 1.1, 1.2_
  - _Prompt: Role: HTTPプロトコルとPuppeteer APIに精通した開発者 | Task: 施設ID配列と日付配列を受け取り、POST /Umi/web/Yoyaku/WgR_ShisetsubetsuAkiJoukyouに`__EVENTTARGET=next`、`checkdate=YYYYMMDD施設ID+++0`（施設×日付の組み合わせ）、`__RequestVerificationToken`を含むリクエストを送信。ページ遷移を待機してから返す。 | Restrictions: POSTデータはapplication/x-www-form-urlencoded形式、ネットワーク完了を待機 | Success: 施設別空き状況ページに正しく遷移し、HTMLが取得できる_

- [x] 5. selectDateAndFetchTimeSlots メソッドを実装
  - File: src/lib/scraper/DirectApiClient.ts
  - 日付を選択して時間帯別空き状況ページ（WgR_JikantaibetsuAkiJoukyou）へPOST
  - HTMLをパースしてFacilityAvailability[]を返す
  - Purpose: 最終データ取得APIを呼び出してスクレイピング結果を構築
  - _Leverage: src/lib/scraper/index.ts の parseTimeSlotAvailability メソッド_
  - _Requirements: 1.4_
  - _Prompt: Role: Webスクレイピングとデータパース処理に精通した開発者 | Task: 施設別空き状況ページから指定日付のチェックボックスをすべて選択し、「次へ」ボタンをクリックして時間帯別空き状況ページへ遷移。HTMLから施設・時間帯・空き状況（○/△/×）を抽出してFacilityAvailability配列に変換。 | Restrictions: DOMセレクタは既存実装を参考、エラー時は空配列を返す | Success: 時間帯別空き状況が正しくパースされ、FacilityAvailability型の配列が返される_

- [x] 6. scrapeFacilitiesDirectMode メソッドを実装
  - File: src/lib/scraper/index.ts
  - DirectApiClientを使用した直接API呼び出しモードのフロー全体を実装
  - 複数日付をループ処理して結果を集約
  - Purpose: 直接APIモードのエントリーポイントを提供
  - _Leverage: src/lib/scraper/DirectApiClient.ts_
  - _Requirements: 1.1, 1.4_
  - _Prompt: Role: 非同期処理とエラーハンドリングに精通したTypeScript開発者 | Task: FacilityScraperにscrapeFacilitiesDirectModeメソッドを追加。DirectApiClientインスタンスを生成してfetchTokenを呼び出し、postToFacilityCalendarで施設カレンダーページへ遷移。各日付に対してselectDateAndFetchTimeSlotsを呼び出し、結果をマージして返す。 | Restrictions: try-catchでエラーをキャッチし、失敗時はエラーをスロー（フォールバック処理は呼び出し元で実装） | Success: 直接APIモードで7日検索が正常に動作し、結果が正しく返される_

## Phase 2: フォールバック機能とモード切り替え

- [x] 7. scrapeFacilitiesLegacyMode メソッドにリファクタリング
  - File: src/lib/scraper/index.ts
  - 既存のscrapeFacilitiesメソッドの実装をscrapeFacilitiesLegacyModeに移動
  - メソッド名変更のみで、ロジックは変更しない
  - Purpose: レガシーモードを明示的に分離し、フォールバック時に呼び出し可能にする
  - _Leverage: 既存のscrapeFacilities実装_
  - _Requirements: 1.6_
  - _Prompt: Role: リファクタリングに精通したTypeScript開発者 | Task: FacilityScraper.scrapeFacilitiesメソッドの実装を新しいprivateメソッドscrapeFacilitiesLegacyModeに移動。元のメソッド名を変更し、内部ロジックは一切変更しない。 | Restrictions: 機能を変更しない、既存テストが壊れないよう注意 | Success: リファクタリング後も既存の動作が完全に維持される_

- [x] 8. scrapeFacilities メソッドにモード切り替えロジックを実装
  - File: src/lib/scraper/index.ts
  - ScraperOptionsを受け取り、useDirectApi フラグに応じてモードを切り替え
  - 直接APIモードでエラーが発生した場合、fallbackOnErrorがtrueならレガシーモードにフォールバック
  - Purpose: 2つのモードをシームレスに切り替え、堅牢性を向上させる
  - _Leverage: scrapeFacilitiesDirectMode, scrapeFacilitiesLegacyMode_
  - _Requirements: 1.6_
  - _Prompt: Role: エラーハンドリングとフォールバック機能に精通した開発者 | Task: scrapeFacilitiesメソッドを再実装し、ScraperOptions.useDirectApi（デフォルトtrue）に応じてscrapeFacilitiesDirectModeまたはscrapeFacilitiesLegacyModeを呼び出す。直接APIモードで例外が発生し、fallbackOnError=trueの場合はレガシーモードを実行。コンソールに切り替えログを出力。 | Restrictions: 両モードで同じ型の結果を返す、例外は適切に伝播 | Success: 直接APIモード失敗時にレガシーモードへ自動フォールバックし、エラーログが出力される_

- [x] 9. ScraperOptions インターフェースを拡張
  - File: src/lib/scraper/types.ts (または該当する型定義ファイル)
  - useDirectApi, enableResourceBlocking, reportProgress, fallbackOnError フラグを追加
  - デフォルト値をドキュメント化
  - Purpose: スクレイパーの動作をオプションで制御可能にする
  - _Leverage: 既存の型定義パターン_
  - _Requirements: Design Section 2.3_
  - _Prompt: Role: TypeScript型システムに精通した開発者 | Task: ScraperOptionsインターフェースに4つのオプションフラグ（useDirectApi?: boolean, enableResourceBlocking?: boolean, reportProgress?: boolean, fallbackOnError?: boolean）を追加。各フラグにJSDocコメントでデフォルト値と説明を記載。 | Restrictions: 既存のScraperOptionsと互換性を保つ、オプショナルプロパティとして定義 | Success: 型定義が正しくエクスポートされ、IDE補完でドキュメントが表示される_

## Phase 3: 補助的な最適化機能

- [x] 10. リソースブロッキング機能を実装
  - File: src/lib/scraper/index.ts
  - page.setRequestInterception(true) を有効化
  - 画像・CSS・フォントのリクエストをabort()、HTML・JavaScript・XHRはcontinue()
  - Purpose: 不要なリソース読み込みをブロックしてページ遷移を高速化
  - _Leverage: Puppeteer Request Interception API_
  - _Requirements: 3_
  - _Prompt: Role: Puppeteerとブラウザネットワークに精通した開発者 | Task: FacilityScraper初期化時にScraperOptions.enableResourceBlocking=trueの場合、page.setRequestInterception(true)を設定し、'image', 'stylesheet', 'font'リソースタイプのリクエストをrequest.abort()、それ以外はrequest.continue()する。 | Restrictions: リクエストインターセプションによるページ機能への影響を最小化 | Success: 画像・CSS・フォントがブロックされ、ページ遷移が高速化される（ページ機能は正常動作）_

- [x] 11. プログレス報告機能の基盤を実装
  - File: src/lib/scraper/index.ts
  - ProgressCallback型を定義（ステップ名、進捗率、現在処理中の日付などを引数に取る関数型）
  - ScraperOptionsにprogressCallback?: ProgressCallbackを追加
  - Purpose: スクレイピング進捗をリアルタイムで外部に通知可能にする
  - _Leverage: TypeScript関数型、既存のScraperOptions_
  - _Requirements: 4_
  - _Prompt: Role: イベント駆動アーキテクチャに精通したTypeScript開発者 | Task: ProgressCallback型（引数: step: string, progress: number, currentDate?: Date）を定義し、ScraperOptions.progressCallbackプロパティとして追加。scrapeFacilitiesメソッド内で各ステップ実行時にコールバックを呼び出す実装を追加。 | Restrictions: コールバックはオプショナル、呼び出しエラーでスクレイピングを中断しない | Success: プログレスコールバックが各ステップで正しく呼び出され、外部からリアルタイムで進捗を取得できる_

- [x] 12. プログレス報告の詳細ログ出力を実装
  - File: src/lib/scraper/index.ts
  - 各処理ステップの開始・完了時にタイムスタンプ付きログを出力
  - 合計所要時間と各ステップの内訳を最終的にログ出力
  - Purpose: パフォーマンス計測とボトルネック特定を容易にする
  - _Leverage: console.log, Date.now()_
  - _Requirements: 5_
  - _Prompt: Role: パフォーマンス計測とロギングに精通した開発者 | Task: scrapeFacilitiesメソッド内の各ステップ（トークン取得、施設カレンダー遷移、日付ループなど）の開始時と完了時にDate.now()で時刻を記録し、「[ステップ名] 開始」「[ステップ名] 完了 (X秒)」形式でログ出力。最後に合計時間と内訳サマリーを出力。 | Restrictions: ログは日本語で記述、本番環境でも有効 | Success: ログから各ステップの所要時間が明確に把握でき、ボトルネックが特定可能_

## Phase 4: フロントエンド統合

- [x] 13. SearchFormにプログレス表示UIを追加（基礎）
  - File: src/components/SearchForm.tsx
  - ローディング状態に加えて、現在の処理ステップと進捗率を表示する領域を追加
  - Purpose: ユーザーに検索進捗を可視化し、体感速度を改善
  - _Leverage: 既存のisLoading state_
  - _Requirements: 4_
  - _Prompt: Role: Reactとユーザー体験設計に精通したフロントエンド開発者 | Task: SearchFormコンポーネントに検索中の進捗を表示するUIを追加。useState で progressState: { step: string, progress: number } を管理し、ローディング中にステップ名と進捗率（プログレスバーまたはパーセント表示）を表示。 | Restrictions: 既存のSearchFormレイアウトを大きく崩さない、モバイルレスポンシブ対応 | Success: 検索中に「施設カレンダー取得中...」「X/Y日目を処理中...」などが表示され、ユーザーが進捗を把握できる_

- [x] 14. API RouteでProgressCallbackを統合
  - File: src/app/api/scrape/route.ts
  - FacilityScraper呼び出し時にprogressCallbackを渡し、リアルタイムでクライアントに進捗を送信
  - Server-Sent Events (SSE) またはWebSocketを使用して進捗をストリーミング
  - Purpose: バックエンドからフロントエンドへ進捗情報をリアルタイム配信
  - _Leverage: Next.js API Routes, Server-Sent Events_
  - _Requirements: 4_
  - _Prompt: Role: Next.jsとリアルタイム通信に精通したフルスタック開発者 | Task: 検索APIエンドポイントでFacilityScraperを呼び出す際にprogressCallbackを渡し、コールバック内でServer-Sent Events (text/event-stream) を使用してクライアントに進捗データを送信。検索完了時に最終結果を返す。 | Restrictions: SSE接続はタイムアウトを考慮、エラー時も適切にクライアントへ通知 | Success: クライアントがリアルタイムで進捗を受信し、SearchFormに反映される_

- [x] 15. フロントエンドでSSE進捗を受信して表示
  - File: src/app/page.tsx
  - EventSourceを使用してSSEストリームを購読
  - 受信した進捗データでprogressStateを更新
  - Purpose: リアルタイムプログレス表示の完成
  - _Leverage: Browser EventSource API_
  - _Requirements: 4_
  - _Prompt: Role: リアルタイムWeb通信とReactに精通したフロントエンド開発者 | Task: SearchFormコンポーネントのonSubmitハンドラで、EventSource('/api/search?dates=...')を使用してSSEストリームを購読。`message`イベントでprogressStateを更新し、`error`または`close`イベントで最終結果を処理。 | Restrictions: コンポーネントアンマウント時にEventSourceをclose()、エラーハンドリングを適切に実装 | Success: 検索実行時にリアルタイムで進捗が表示され、完了後に結果画面に遷移_

## Phase 5: テストと検証

- [x] 16. DirectApiClient 単体テストを作成
  - File: src/lib/scraper/__tests__/DirectApiClient.test.ts
  - initBrowser, closeBrowser, execute, selectDateAndNavigate, getBrowser の各メソッドをテスト
  - Puppeteerモックを使用してネットワークアクセスなしでテスト
  - Purpose: 直接API呼び出しロジックの正確性を保証
  - _Leverage: Vitest, Puppeteer mocks_
  - _Requirements: 1.1-1.4_
  - _Status: 実装完了。BrowserManagerをvi.mockでモック化し、主要メソッドの動作を検証。エッジケースも含めて13個のテストケースを作成。_

- [x] 17. フォールバック機能の統合テストを作成
  - File: src/lib/scraper/__tests__/FacilityScraper.fallback.test.ts
  - 直接APIモード失敗時の動作とエラーハンドリングをテスト
  - モックを使用してメソッド呼び出しを検証
  - Purpose: エラーハンドリングとフォールバック機能の堅牢性を保証
  - _Leverage: Vitest, 既存のFacilityScraper_
  - _Requirements: 1.6_
  - _Status: 実装完了。scrapeFacilitiesメソッドの動作、エラーハンドリング、並列呼び出しの安全性、入力データ検証など9つのテストグループを作成。_

- [x] 18. 実環境でのパフォーマンス測定
  - File: scripts/benchmark-search-performance.ts (新規作成)
  - 直接APIモードとレガシーモードで7日検索を実行し、所要時間を比較
  - 結果をJSONで出力（benchmark-results.json）
  - Purpose: 実際の速度改善を定量的に検証
  - _Leverage: src/lib/scraper/index.ts_
  - _Requirements: Performance Non-Functional Requirements_
  - _Status: 実装完了。各モードで3回ずつ実行し、平均・最小・最大・標準偏差を計測。結果をJSONとコンソールに出力。レート制限遵守（5秒間隔）。_

- [x] 19. 既存テストの回帰テスト実行
  - Command: pnpm test
  - すべての既存テストがパスすることを確認
  - 失敗したテストがあれば修正
  - Purpose: 最適化による既存機能への影響がないことを保証
  - _Leverage: 既存のテストスイート_
  - _Requirements: Reliability Non-Functional Requirements_
  - _Prompt: Role: QAエンジニア | Task: pnpm testを実行し、全テストがパスすることを確認。失敗したテストがある場合は、最適化によって壊れた箇所を特定して修正。 | Restrictions: 既存機能を変更せず、テストのみ修正 | Success: すべてのテストがパスし、CI/CDパイプラインでもグリーン_

## Phase 6: ドキュメント更新とデプロイ

- [-] 20. README.mdにパフォーマンス最適化の説明を追加
  - File: README.md
  - 直接API呼び出しモードとレガシーモードの説明
  - ScraperOptionsの使い方を記載
  - ベンチマーク結果を掲載
  - Purpose: 開発者と利用者に最適化内容を周知
  - _Leverage: 既存のREADME.md構造_
  - _Requirements: Usability Non-Functional Requirements_
  - _Prompt: Role: 技術ドキュメントライター | Task: README.mdに「検索パフォーマンス最適化」セクションを追加。直接API呼び出しモードの説明、ScraperOptionsの各フラグの用途、ベンチマーク結果（7日検索: 120〜180秒 → 20〜40秒）、トラブルシューティング（フォールバック機能の説明）を記載。 | Restrictions: 日本語で記述、技術的に正確かつ分かりやすい表現 | Success: ドキュメントが明確で、開発者が最適化内容を理解できる_

- [x] 21. 確認ダイアログのメッセージを更新
  - File: src/components/SearchForm.tsx
  - 複数日検索時のメッセージを「2〜3分程度」から「30秒〜1分程度」に更新
  - Purpose: 最適化後の実際の所要時間をユーザーに正しく伝える
  - _Leverage: 既存のConfirmDialog_
  - _Requirements: 4_
  - _Prompt: Role: UI/UX開発者 | Task: SearchFormコンポーネントのConfirmDialogメッセージを「複数日を検索する場合、30秒〜1分程度お時間をいただく場合があります。検索を続けますか？」に更新。 | Restrictions: 文言は簡潔で分かりやすく | Success: ユーザーが最適化後の待ち時間を正しく認識できる_

- [-] 22. 本番環境へのデプロイとモニタリング
  - Command: git push origin main (自動デプロイ)
  - Render.comまたはVercelでのデプロイ完了を確認
  - 本番環境で7日検索を実行し、速度改善を検証
  - エラーログをモニタリングし、フォールバックが正しく動作することを確認
  - Purpose: 最適化を本番環境に反映し、実際のユーザーに提供
  - _Leverage: Render.com/Vercel自動デプロイ_
  - _Requirements: All_
  - _Prompt: Role: DevOpsエンジニア | Task: mainブランチにプッシュして自動デプロイを実行。デプロイ完了後、本番環境で複数日検索をテストし、所要時間とエラーログを確認。直接APIモードが失敗した場合のフォールバック動作も検証。 | Restrictions: 本番環境でのテストは慎重に実施、エラー発生時は即座にロールバック | Success: 本番環境で7日検索が20〜40秒で完了し、エラーなく動作する_

## Phase 7: 並列処理による更なる高速化（将来実装）

- [ ] 23. 並列処理の設計と実装方針の策定
  - File: docs/parallel-processing-design.md (新規作成)
  - 2-3並列処理のアーキテクチャ設計
  - リスク評価とサーバー負荷への影響分析
  - 実装スコープと優先度の決定
  - Purpose: 並列処理実装の青写真を作成
  - _Leverage: 現在のログ分析結果（88秒→75秒の改善データ）_
  - _Requirements: Performance Optimization_
  - _Context: フェーズ1で15%削減達成。さらに40-50%の高速化が見込まれる並列処理を安全に実装するための設計_
  - _Prompt: Role: システムアーキテクト | Task: 7日間検索の並列処理アーキテクチャを設計。(1)複数ブラウザコンテキストの並列実行、(2)2-3並列の推奨並列度、(3)サーバー負荷軽減のためのバッチ間遅延(2秒)、(4)エラーハンドリングと部分失敗時のリトライ戦略を含む設計書を作成。7並列は高リスクとして却下理由を明記。 | Restrictions: 公共システムへの過負荷を避ける、既存の直接APIモードと共存可能な設計 | Success: 実装ガイドとして使用可能な詳細設計書が完成_

- [ ] 24. 並列処理用のBrowserContextマネージャーを実装
  - File: src/lib/scraper/ParallelBrowserManager.ts (新規作成)
  - 複数のブラウザコンテキストを管理するクラスを作成
  - コンテキストプールの初期化と再利用機能
  - 各コンテキストにリソースブロッキングを適用
  - Purpose: 並列処理の基盤となるブラウザコンテキスト管理を提供
  - _Leverage: src/lib/scraper/BrowserManager.ts_
  - _Requirements: Performance Optimization_
  - _Context: 現在は単一ページで順次処理。複数コンテキストで並列処理するための管理層を追加_
  - _Prompt: Role: Puppeteer並列処理に精通した開発者 | Task: ParallelBrowserManagerクラスを作成。browser.createIncognitoBrowserContext()で並列度分のコンテキストを生成し、各コンテキストでページを作成・管理。リソースブロッキングとエラーハンドリングを実装。 | Restrictions: コンテキスト数は設定可能（デフォルト2）、各コンテキストは独立したセッションを持つ | Success: 複数コンテキストが正常に動作し、互いに干渉しない_

- [ ] 25. 日付をバッチに分割する関数を実装
  - File: src/lib/scraper/utils/batchDates.ts (新規作成)
  - 日付配列を並列度に応じてバッチに分割
  - 各バッチに遅延時間を設定可能にする
  - Purpose: 並列処理のための日付グループ化ロジックを提供
  - _Leverage: 既存の日付処理ロジック_
  - _Requirements: Performance Optimization_
  - _Context: 7日分の日付を2-3並列で処理するため、[日付1,2], [日付3,4], [日付5,6], [日付7]のようにグループ化_
  - _Prompt: Role: アルゴリズム設計に精通した開発者 | Task: 日付配列とバッチサイズを受け取り、配列を均等に分割する関数batchDates(dates: Date[], batchSize: number): Date[][]を実装。バッチ間の遅延時間も設定可能なオプションを追加。 | Restrictions: バッチサイズが日付数より大きい場合は1バッチにまとめる | Success: 7日分が2並列の場合、4バッチ（2+2+2+1）に正しく分割される_

- [ ] 26. scrapeFacilitiesParallelMode メソッドを実装
  - File: src/lib/scraper/index.ts
  - ParallelBrowserManagerを使用して複数コンテキストで並列処理
  - 日付をバッチに分割し、各バッチを並列実行
  - バッチ間に2秒の遅延を挿入
  - Purpose: 並列処理モードのメインロジックを実装
  - _Leverage: scrapeFacilitiesDirectMode, ParallelBrowserManager_
  - _Requirements: Performance Optimization_
  - _Context: 現在の直接APIモード（75秒）をさらに高速化。2並列で約45秒、3並列で約30秒を目標_
  - _Prompt: Role: 並列処理とエラーハンドリングに精通した開発者 | Task: FacilityScraper.scrapeFacilitiesParallelModeメソッドを実装。(1)ParallelBrowserManagerで複数コンテキストを初期化、(2)日付をバッチ分割、(3)Promise.allで各バッチを並列実行、(4)バッチ間に2秒遅延、(5)全結果をマージして返す。各コンテキストでDirectApiClientを使用。 | Restrictions: 並列度は2-3（デフォルト2）、エラー時は部分的にリトライ | Success: 7日検索が2並列で約45秒、3並列で約30秒で完了_

- [ ] 27. ScraperOptionsに並列処理フラグを追加
  - File: src/lib/scraper/types.ts
  - parallelMode?: boolean (デフォルト false)
  - parallelDegree?: number (デフォルト 2、最大3)
  - batchDelay?: number (デフォルト 2000ms)
  - Purpose: 並列処理モードを外部から制御可能にする
  - _Leverage: 既存のScraperOptions_
  - _Requirements: Performance Optimization_
  - _Context: useDirectApi=trueに加えて、並列処理を有効化するための新しいフラグ_
  - _Prompt: Role: TypeScript型設計に精通した開発者 | Task: ScraperOptionsインターフェースに並列処理関連のフラグ3つを追加。parallelMode（並列処理の有効化）、parallelDegree（並列度2-3）、batchDelay（バッチ間遅延ms）。JSDocで推奨値と注意事項を記載。 | Restrictions: 既存オプションとの互換性を維持、オプショナルプロパティ | Success: 型定義が正しくエクスポートされ、ドキュメントが明確_

- [ ] 28. scrapeFacilities メソッドに並列モード分岐を追加
  - File: src/lib/scraper/index.ts
  - ScraperOptions.parallelMode=trueの場合、scrapeFacilitiesParallelModeを呼び出す
  - 並列モードでエラーが発生した場合、直接APIモードにフォールバック
  - Purpose: 並列処理モードを既存フローに統合
  - _Leverage: scrapeFacilitiesParallelMode, scrapeFacilitiesDirectMode_
  - _Requirements: Performance Optimization_
  - _Context: 3段階フォールバック: 並列モード → 直接APIモード → レガシーモード_
  - _Prompt: Role: フォールバック設計に精通した開発者 | Task: scrapeFacilitiesメソッドにparallelMode判定を追加。parallelMode=trueならscrapeFacilitiesParallelModeを呼び出し、エラー時は直接APIモードにフォールバック（ログ出力）。並列モード無効時は既存のフロー。 | Restrictions: フォールバック階層を明確にログ出力 | Success: 並列モードが正常動作し、失敗時は直接APIモードに自動フォールバック_

- [ ] 29. 並列処理モードの統合テストを作成
  - File: tests/lib/scraper/parallel-mode.test.ts (新規作成)
  - 並列処理モードが正しく動作することをテスト
  - エラー時のフォールバック動作をテスト
  - 並列度とバッチ分割のロジックをテスト
  - Purpose: 並列処理の正確性と堅牢性を保証
  - _Leverage: Jest, Puppeteer mocks_
  - _Requirements: Testing_
  - _Context: 複雑な並列処理ロジックのテストカバレッジを確保_
  - _Prompt: Role: 並列処理とテストに精通したQAエンジニア | Task: 並列処理モードの統合テストを作成。(1)2並列で正しくバッチ分割される、(2)Promise.allで並列実行される、(3)一部コンテキストでエラー時に全体が失敗する（または部分リトライ）、(4)フォールバックが正しく動作することを検証。 | Restrictions: モックを使用して実際のネットワークアクセスを回避 | Success: 全テストがパスし、並列処理の動作が保証される_

- [ ] 30. 本番環境で並列処理モードの性能測定
  - File: scripts/benchmark-parallel-mode.ts (新規作成)
  - 並列度2と3でベンチマークを実行
  - 直接APIモード（順次）との速度比較
  - サーバー負荷とエラー率のモニタリング
  - Purpose: 並列処理の実際の効果を定量的に検証
  - _Leverage: scripts/benchmark-search-performance.ts_
  - _Requirements: Performance Verification_
  - _Context: フェーズ1で75秒達成。並列処理で45秒（2並列）または30秒（3並列）を目標_
  - _Prompt: Role: パフォーマンス測定に精通した開発者 | Task: 並列度2と3で7日検索を各3回実行し、所要時間の平均・最小・最大を計測。直接APIモード（75秒）との比較結果をJSON出力。エラー率とサーバー応答時間もモニタリング。 | Restrictions: 実環境（宇美町システム）へアクセス、レート制限遵守、本番時間帯を避ける | Success: 2並列で約45秒、3並列で約30秒を達成し、エラー率が5%未満_
