/**
 * 7日分のスクレイピングテスト
 *
 * 本日から1週間のデータを取得
 */

import { FacilityScraper } from '../src/lib/scraper';

async function test7Days() {
  try {
    console.log('🧪 7日分スクレイピングテスト開始\n');

    // 本日から7日分の日付を生成
    const today = new Date();
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }

    console.log(`📅 テスト対象日付: ${dates.map(d => d.toISOString().split('T')[0]).join(', ')}\n`);

    const scraper = new FacilityScraper();
    const results = await scraper.scrapeFacilities(dates);

    console.log('\n✅ スクレイピング結果:');
    console.log(`施設数: ${results.length}`);

    results.forEach((result, i) => {
      console.log(`\n施設 ${i + 1}: ${result.facility.name}`);
      console.log(`  日付数: ${result.availability.length}`);

      result.availability.forEach((avail) => {
        const dateStr = avail.date.toISOString().split('T')[0];
        const availableSlots = avail.slots.filter(s => s.available).length;
        console.log(`  - ${dateStr}: ${availableSlots}/${avail.slots.length} 時間帯が空き`);
      });
    });

    console.log('\n🎉 テスト成功');
  } catch (error) {
    console.error('\n❌ テスト失敗:', error);
    process.exit(1);
  }
}

test7Days();
