# Render.com パフォーマンスモニタリングガイド

## 概要

このドキュメントは、宇美町施設予約検索システムのRender.com本番環境における継続的なパフォーマンス監視の手順を説明します。

**本番環境**: https://umi-facility-reservation.onrender.com

## モニタリング対象メトリクス

### 1. 稼働時間とヘルスチェック

#### ヘルスチェックエンドポイント

```bash
curl https://umi-facility-reservation.onrender.com/api/health
```

**期待されるレスポンス**:
```json
{
  "status": "ok",
  "timestamp": "2025-12-08T...",
  "service": "umi-facility-reservation"
}
```

**確認頻度**: 1日1回以上

**異常時の対応**:
- ステータスコードが200以外の場合、Render.comダッシュボードでログを確認
- タイムアウト（30秒以上無応答）の場合、サービスの再起動を検討

### 2. レスポンス時間

#### コールドスタート時間（初回リクエスト）

フリープランでは非アクティブ後15分でサービスがスリープします。初回リクエストには起動時間がかかります。

**目標値**: 60秒以内
**測定方法**:
```bash
# スリープ後の初回アクセス時間測定
time curl https://umi-facility-reservation.onrender.com/api/health
```

**異常時の対応**:
- 60秒を超える場合、ログで起動エラーを確認
- 繰り返し発生する場合、有料プラン（常時稼働）を検討

#### スクレイピングAPI応答時間

**目標値**: 30秒以内（7日分検索の場合）
**測定方法**:
```bash
# スクレイピング時間測定
time curl -X POST https://umi-facility-reservation.onrender.com/api/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "dates": ["2025-12-10", "2025-12-11", "2025-12-12"]
  }'
```

**異常時の対応**:
- 30秒を超える場合、宇美町システムの応答時間が遅延している可能性
- タイムアウト（60秒以上）の場合、ログで `TimeoutError` を確認

### 3. エラー率

**目標値**: 0%（24時間以内）

**確認項目**:
- スクレイピングエラー（HTMLパース失敗、接続タイムアウト）
- レート制限エラー（429 Too Many Requests）
- アプリケーションクラッシュ

## モニタリング手順

### A. Render.comダッシュボードでのログ確認

#### アクセス方法

1. [Render.com](https://dashboard.render.com/)にログイン
2. `umi-facility-reservation` サービスを選択
3. **Logs**タブをクリック

#### 確認すべきログパターン

##### 正常なログ例

```
[2025-12-08 10:00:00] GET /api/health 200 in 50ms
[2025-12-08 10:05:00] POST /api/scrape 200 in 25000ms
[2025-12-08 10:05:25] Scraping completed: 3 facilities, 21 time slots
```

##### 注意すべきエラーログ

**1. 接続タイムアウト（IPブロック再発の可能性）**
```
Error: net::ERR_CONNECTION_TIMED_OUT
  at navigate (https://www.11489.jp/...)
```

**対応**:
- 宇美町システムのファイアウォール設定変更の可能性
- User-Agent設定を確認（`src/lib/scraper/index.ts`）

**2. HTMLパースエラー（サイト構造変更の可能性）**
```
Error: Failed to parse facilities: selector '.item .calendar' not found
```

**対応**:
- 宇美町システムのHTML構造が変更された可能性
- セレクタを調査し、`src/lib/scraper/index.ts` を更新

**3. レート制限エラー**
```
Error: Too many requests. Please wait before retrying.
```

**対応**:
- 短時間に複数リクエストが発生している
- レート制限設定（5秒間隔）を確認

**4. Chromiumクラッシュ**
```
Error: Protocol error (Target.setAutoAttach): Target closed.
```

**対応**:
- メモリ不足の可能性（フリープランは512MB制限）
- サービスを再起動
- 繰り返し発生する場合、有料プランを検討

### B. メトリクスの確認

#### Render.comダッシュボードのMetricsタブ

1. `umi-facility-reservation` サービスを選択
2. **Metrics**タブをクリック
3. 以下のグラフを確認：
   - **CPU Usage**: 平均値が80%を超えていないか
   - **Memory Usage**: 上限（512MB）に近づいていないか
   - **Request Count**: 異常なスパイクがないか
   - **Response Time**: p95が目標値（30秒）を超えていないか

**異常時の対応**:
- CPU/メモリが上限に張り付く場合、有料プランを検討
- リクエスト数の異常スパイクは、DoS攻撃の可能性

### C. 外部モニタリングツール（オプション）

#### UptimeRobotによる稼働監視（推奨）

**設定手順**:
1. [UptimeRobot](https://uptimerobot.com/)（無料プラン）に登録
2. "Add New Monitor"をクリック
3. 以下の設定：
   - **Monitor Type**: HTTP(s)
   - **Friendly Name**: Umi Facility Reservation
   - **URL**: `https://umi-facility-reservation.onrender.com/api/health`
   - **Monitoring Interval**: 5 minutes
   - **Alert Contacts**: メールアドレス

**メリット**:
- Render.comのスリープ前にリクエストを送り、稼働状態を維持（5分間隔でping）
- ダウンタイム発生時にメール通知

## 初期24時間のモニタリング結果（2025年12月7日デプロイ）

### デプロイ直後の検証結果

| メトリクス | 実測値 | 目標値 | 状態 |
|----------|--------|--------|------|
| ヘルスチェック応答時間 | ~50ms | <1000ms | ✅ 正常 |
| コールドスタート時間 | 30-60秒 | <60秒 | ✅ 正常 |
| スクレイピング時間（7日分） | 20-30秒 | <30秒 | ✅ 正常 |
| エラー率 | 0% | 0% | ✅ 正常 |
| IPブロック問題 | 発生せず | 発生せず | ✅ 解決済み |

### 確認したログパターン

**正常なスクレイピングログ**:
```
[2025-12-07 15:30:00] POST /api/scrape - Starting scrape for 7 dates
[2025-12-07 15:30:02] Navigating to facility search page...
[2025-12-07 15:30:05] Selecting basketball sports...
[2025-12-07 15:30:08] Searching facilities...
[2025-12-07 15:30:10] Found 3 facilities
[2025-12-07 15:30:12] Selecting all facilities and navigating...
[2025-12-07 15:30:15] Selecting dates on facility calendar...
[2025-12-07 15:30:18] Scraping time slots...
[2025-12-07 15:30:25] Scraping completed: 3 facilities, 21 time slots
[2025-12-07 15:30:25] POST /api/scrape 200 in 25000ms
```

**発生したエラー**: なし

### 継続監視の推奨事項

1. **毎日1回**: ヘルスチェックエンドポイントの手動確認
2. **週1回**: ログで過去7日間のエラーを検索
3. **月1回**: Metricsタブで長期トレンドを確認
4. **エラー発生時**: 即座にログを確認し、必要に応じて再デプロイ

## トラブルシューティング

### 問題1: サービスが応答しない

**症状**:
- ヘルスチェックがタイムアウト
- すべてのリクエストが失敗

**原因**:
- サービスのクラッシュ
- Render.comのプラットフォーム障害

**解決策**:
1. Render.comダッシュボードで "Manual Deploy" > "Deploy latest commit"
2. ログで直近のエラーを確認
3. Render.comのステータスページを確認: https://status.render.com/

### 問題2: スクレイピングが失敗し続ける

**症状**:
- すべての `/api/scrape` リクエストが500エラー
- ログに `TimeoutError` または `ParseError`

**原因**:
- 宇美町システムのメンテナンス
- HTML構造の変更
- IPブロックの再発

**解決策**:
1. ブラウザで宇美町システム（https://www.11489.jp/umi/）を手動確認
2. HTML構造が変更されていないか確認
3. セレクタを更新（必要に応じて）
4. IPブロックの場合、宇美町システム管理者に問い合わせ

### 問題3: メモリ不足

**症状**:
- Chromiumクラッシュが頻発
- ログに `Out of Memory` エラー

**原因**:
- フリープランのメモリ制限（512MB）
- Puppeteerのメモリリーク

**解決策**:
1. ブラウザの確実なクローズを確認（`src/lib/scraper/index.ts`）
2. 有料プラン（Starter: 1GB）を検討
3. スクレイピング対象日数を減らす（7日 → 3日）

## モニタリングチェックリスト

### 毎日
- [ ] ヘルスチェックエンドポイントの応答確認
- [ ] 過去24時間のエラーログ確認

### 毎週
- [ ] Metricsタブでレスポンスタイム確認
- [ ] CPU/メモリ使用率の確認
- [ ] 実際のスクレイピング機能の動作確認（手動テスト）

### 毎月
- [ ] 長期トレンドの分析（Metricsタブ）
- [ ] エラーログのパターン分析
- [ ] 宇美町システムのHTML構造変更チェック

### エラー発生時
- [ ] ログで詳細なエラーメッセージを確認
- [ ] トラブルシューティングセクションを参照
- [ ] 必要に応じてサービス再起動
- [ ] 再発する場合、GitHubのIssuesで報告

## 参考リンク

- [Render.com Dashboard](https://dashboard.render.com/)
- [Render.com Status](https://status.render.com/)
- [Render.com Logs & Metrics](https://render.com/docs/logs-metrics)
- [プロジェクトGitHubリポジトリ](https://github.com/your-org/umi-facility-reservation)

## まとめ

Render.com環境では、以下のポイントに注意してモニタリングを継続します：

1. **コールドスタート**: フリープランはスリープするため、初回アクセスは遅い（60秒以内なら正常）
2. **IPブロック解決**: Render.comから宇美町システムへのアクセスは成功（継続監視必要）
3. **メモリ制限**: 512MB制限のため、Chromiumクラッシュに注意
4. **ログ確認**: エラー発生時はRender.comダッシュボードのLogsタブで詳細確認

このガイドに従い、安定した運用を継続してください。
