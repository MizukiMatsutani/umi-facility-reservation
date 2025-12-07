/**
 * 複数日のスクレイピングテスト
 *
 * 日付ごとにループして処理することで、施設×日付が10個までの制限に対応
 */

import { FacilityScraper } from '../src/lib/scraper';

async function testMultipleDates() {
  try {
    console.log('🧪 複数日スクレイピングテスト開始\n');

    // テスト対象の日付（2日分）
    const dates = [
      new Date('2025-12-11'),
      new Date('2025-12-12'),
    ];

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

testMultipleDates();
