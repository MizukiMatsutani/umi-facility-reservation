/**
 * Phase 2 スクレイピングフロー統合テストスクリプト
 *
 * 新しい4ステップフローの動作確認を行います。
 *
 * テストシナリオ:
 * 1. 単一日付検索（12/11）
 * 2. 複数日付検索（12/11-12/15）
 * 3. 時間範囲フィルタリング（9:00-12:00）
 */

import { FacilityScraper } from '../src/lib/scraper/index';
import { addDays } from 'date-fns';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

async function runTests() {
  const scraper = new FacilityScraper();

  // 結果保存ディレクトリを作成
  const resultsDir = join(process.cwd(), 'test-results');
  try {
    mkdirSync(resultsDir, { recursive: true });
  } catch (error) {
    // ディレクトリが既に存在する場合は無視
  }

  console.log('🧪 Phase 2 フロー統合テスト開始\n');
  console.log('=' .repeat(60));

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // テスト1: 単一日付検索
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  try {
    console.log('\n\n📝 テスト1: 単一日付検索');
    console.log('-'.repeat(60));

    const startTime1 = Date.now();
    const today = new Date();
    const testDate = addDays(today, 5); // 5日後

    console.log(`対象日付: ${testDate.toLocaleDateString('ja-JP')}`);

    const results1 = await scraper.scrapeFacilities([testDate]);

    const duration1 = ((Date.now() - startTime1) / 1000).toFixed(2);

    console.log(`\n✅ テスト1完了 (${duration1}秒)`);
    console.log(`   施設数: ${results1.length}`);
    console.log(`   総データポイント数: ${results1.reduce((sum, f) =>
      sum + f.availability.reduce((s, a) => s + a.slots.length, 0), 0
    )}`);

    // 結果をJSONファイルに保存
    const resultPath1 = join(resultsDir, 'test1-single-date.json');
    writeFileSync(resultPath1, JSON.stringify(results1, null, 2), 'utf-8');
    console.log(`   結果保存: ${resultPath1}`);

  } catch (error) {
    console.error('❌ テスト1失敗:', error);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // テスト2: 複数日付検索
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  try {
    console.log('\n\n📝 テスト2: 複数日付検索');
    console.log('-'.repeat(60));

    const startTime2 = Date.now();
    const today = new Date();
    const dates = [
      addDays(today, 5),
      addDays(today, 6),
      addDays(today, 7),
      addDays(today, 8),
      addDays(today, 9),
    ];

    console.log(`対象日付: ${dates.map(d => d.toLocaleDateString('ja-JP')).join(', ')}`);

    const results2 = await scraper.scrapeFacilities(dates);

    const duration2 = ((Date.now() - startTime2) / 1000).toFixed(2);

    console.log(`\n✅ テスト2完了 (${duration2}秒)`);
    console.log(`   施設数: ${results2.length}`);
    console.log(`   総データポイント数: ${results2.reduce((sum, f) =>
      sum + f.availability.reduce((s, a) => s + a.slots.length, 0), 0
    )}`);

    // 結果をJSONファイルに保存
    const resultPath2 = join(resultsDir, 'test2-multiple-dates.json');
    writeFileSync(resultPath2, JSON.stringify(results2, null, 2), 'utf-8');
    console.log(`   結果保存: ${resultPath2}`);

  } catch (error) {
    console.error('❌ テスト2失敗:', error);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // テスト3: 時間範囲フィルタリング
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  try {
    console.log('\n\n📝 テスト3: 時間範囲フィルタリング');
    console.log('-'.repeat(60));

    const startTime3 = Date.now();
    const today = new Date();
    const testDate = addDays(today, 5);

    const timeRange = {
      from: '9:00',
      to: '12:00',
    };

    console.log(`対象日付: ${testDate.toLocaleDateString('ja-JP')}`);
    console.log(`時間範囲: ${timeRange.from} - ${timeRange.to}`);

    const results3 = await scraper.scrapeFacilities([testDate], timeRange);

    const duration3 = ((Date.now() - startTime3) / 1000).toFixed(2);

    console.log(`\n✅ テスト3完了 (${duration3}秒)`);
    console.log(`   施設数: ${results3.length}`);
    console.log(`   総データポイント数: ${results3.reduce((sum, f) =>
      sum + f.availability.reduce((s, a) => s + a.slots.length, 0), 0
    )}`);

    // 時間範囲フィルタリングが正しく動作しているか確認
    let allSlotsInRange = true;
    results3.forEach((facility) => {
      facility.availability.forEach((dateData) => {
        dateData.slots.forEach((slot) => {
          const [start] = slot.time.split('-');
          if (start < timeRange.from || start > timeRange.to) {
            console.warn(`⚠️  範囲外の時間帯: ${slot.time}`);
            allSlotsInRange = false;
          }
        });
      });
    });

    if (allSlotsInRange) {
      console.log('   ✅ 全ての時間帯が指定範囲内');
    } else {
      console.log('   ❌ 範囲外の時間帯が含まれています');
    }

    // 結果をJSONファイルに保存
    const resultPath3 = join(resultsDir, 'test3-time-filter.json');
    writeFileSync(resultPath3, JSON.stringify(results3, null, 2), 'utf-8');
    console.log(`   結果保存: ${resultPath3}`);

  } catch (error) {
    console.error('❌ テスト3失敗:', error);
  }

  console.log('\n\n' + '='.repeat(60));
  console.log('✅ 全テスト完了');
  console.log('='.repeat(60));
}

// テスト実行
runTests().catch((error) => {
  console.error('致命的エラー:', error);
  process.exit(1);
});
