/**
 * 4ステップPOSTフローのテストスクリプト
 *
 * 新しいDirectApiClient実装をテストして、
 * 調査結果に基づいた4ステップフローが正しく動作するか確認します。
 */

import { FacilityScraper } from '../src/lib/scraper';
import { addDays, startOfTomorrow } from 'date-fns';

async function main() {
  console.log('🧪 4ステップPOSTフローのテスト開始\n');

  try {
    const scraper = new FacilityScraper();

    // テスト対象: 明日から3日分のデータを取得
    const tomorrow = startOfTomorrow();
    const dates = [
      tomorrow,
      addDays(tomorrow, 1),
      addDays(tomorrow, 2),
    ];

    console.log('📅 テスト対象日付:');
    dates.forEach((date, index) => {
      console.log(`  ${index + 1}. ${date.toLocaleDateString('ja-JP')}`);
    });
    console.log('');

    // 直接APIモードでスクレイピング実行
    const startTime = Date.now();
    const results = await scraper.scrapeFacilities(dates);
    const duration = Date.now() - startTime;

    // 結果サマリー
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 テスト結果サマリー');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ 取得施設数: ${results.length}`);
    console.log(`⏱️  所要時間: ${(duration / 1000).toFixed(1)}秒`);
    console.log(`📈 1日あたりの平均時間: ${(duration / 1000 / dates.length).toFixed(1)}秒`);

    // 施設ごとの詳細
    console.log('\n📋 施設別データ:');
    results.forEach((result, index) => {
      const totalSlots = result.availability.reduce(
        (sum, avail) => sum + avail.slots.length,
        0
      );
      console.log(
        `  ${index + 1}. ${result.facility.name}: ${result.availability.length}日分、合計${totalSlots}スロット`
      );
    });

    console.log('\n✅ テスト完了！');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ テスト失敗:', error);
    process.exit(1);
  }
}

main();
