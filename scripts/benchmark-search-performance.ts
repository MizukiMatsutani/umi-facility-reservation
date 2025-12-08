/**
 * 検索パフォーマンスベンチマークスクリプト
 *
 * 直接APIモードとレガシーモードの両方で7日検索を実行し、
 * 所要時間を比較してパフォーマンス改善を定量的に検証する。
 *
 * 実行方法:
 *   npx tsx scripts/benchmark-search-performance.ts
 *
 * 出力:
 *   - コンソールに結果を表示
 *   - benchmark-results.json にJSON形式で結果を保存
 */

import { FacilityScraper } from '../src/lib/scraper/index';
import { addDays, format } from 'date-fns';
import * as fs from 'fs';
import * as path from 'path';

interface BenchmarkResult {
  mode: 'direct' | 'legacy';
  run: number;
  dates: string[];
  startTime: string;
  endTime: string;
  durationMs: number;
  durationSec: number;
  success: boolean;
  error?: string;
  facilityCount: number;
  totalTimeSlots: number;
}

interface BenchmarkSummary {
  mode: 'direct' | 'legacy';
  runs: number;
  successfulRuns: number;
  failedRuns: number;
  avgDurationSec: number;
  minDurationSec: number;
  maxDurationSec: number;
  stdDeviation: number;
}

/**
 * 標準偏差を計算
 */
function calculateStdDeviation(values: number[], avg: number): number {
  const squareDiffs = values.map((value) => Math.pow(value - avg, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(avgSquareDiff);
}

/**
 * ベンチマークサマリーを計算
 */
function calculateSummary(results: BenchmarkResult[]): BenchmarkSummary {
  const successfulResults = results.filter((r) => r.success);
  const durations = successfulResults.map((r) => r.durationSec);

  const avgDuration =
    durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

  const minDuration = durations.length > 0 ? Math.min(...durations) : 0;
  const maxDuration = durations.length > 0 ? Math.max(...durations) : 0;
  const stdDeviation =
    durations.length > 1 ? calculateStdDeviation(durations, avgDuration) : 0;

  return {
    mode: results[0]?.mode || 'direct',
    runs: results.length,
    successfulRuns: successfulResults.length,
    failedRuns: results.length - successfulResults.length,
    avgDurationSec: parseFloat(avgDuration.toFixed(2)),
    minDurationSec: parseFloat(minDuration.toFixed(2)),
    maxDurationSec: parseFloat(maxDuration.toFixed(2)),
    stdDeviation: parseFloat(stdDeviation.toFixed(2)),
  };
}

/**
 * 結果をJSON形式でファイルに保存
 */
function saveResults(
  results: BenchmarkResult[],
  summaries: BenchmarkSummary[]
): void {
  const outputPath = path.join(process.cwd(), 'benchmark-results.json');
  const output = {
    timestamp: new Date().toISOString(),
    results,
    summaries,
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\n✅ ベンチマーク結果を保存しました: ${outputPath}`);
}

/**
 * 単一のベンチマーク実行
 */
async function runBenchmark(
  mode: 'direct' | 'legacy',
  run: number,
  dates: Date[]
): Promise<BenchmarkResult> {
  console.log(
    `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
  );
  console.log(`🏃 ${mode === 'direct' ? '直接APIモード' : 'レガシーモード'} - 実行 ${run + 1}`);
  console.log(`📅 対象日数: ${dates.length}日`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  const scraper = new FacilityScraper();
  const startTime = new Date();
  const startTimeMs = Date.now();

  let success = false;
  let error: string | undefined;
  let facilityCount = 0;
  let totalTimeSlots = 0;

  try {
    const results =
      mode === 'direct'
        ? await scraper.scrapeFacilities(dates)
        : await (scraper as any).scrapeFacilitiesLegacyMode(dates);

    facilityCount = results.length;
    totalTimeSlots = results.reduce(
      (sum: number, r: any) => sum + r.timeSlots.length,
      0
    );

    success = true;
    console.log(`✅ 完了: ${facilityCount}施設、${totalTimeSlots}時間帯`);
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
    console.error(`❌ エラー: ${error}`);
  } finally {
    await scraper.closeBrowser();
  }

  const endTime = new Date();
  const endTimeMs = Date.now();
  const durationMs = endTimeMs - startTimeMs;
  const durationSec = parseFloat((durationMs / 1000).toFixed(2));

  console.log(`⏱️  所要時間: ${durationSec}秒`);

  return {
    mode,
    run: run + 1,
    dates: dates.map((d) => format(d, 'yyyy-MM-dd')),
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    durationMs,
    durationSec,
    success,
    error,
    facilityCount,
    totalTimeSlots,
  };
}

/**
 * メイン処理
 */
async function main() {
  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                     検索パフォーマンスベンチマーク                            ║
║                                                                              ║
║  直接APIモードとレガシーモードで7日検索を3回ずつ実行し、                     ║
║  所要時間を比較します。                                                      ║
║                                                                              ║
║  注意: 実環境（宇美町システム）にアクセスするため、                          ║
║        レート制限を遵守し、本番時間帯を避けて実行してください。              ║
╚══════════════════════════════════════════════════════════════════════════════╝
  `);

  // 7日間の日付を生成（今日から）
  const today = new Date();
  const dates = Array.from({ length: 7 }, (_, i) => addDays(today, i));

  console.log('\n📅 対象期間:');
  dates.forEach((date, index) => {
    console.log(`  ${index + 1}. ${format(date, 'yyyy-MM-dd (E)', { locale: require('date-fns/locale/ja') })}`);
  });

  const totalRuns = 3;
  const allResults: BenchmarkResult[] = [];

  // 直接APIモードのベンチマーク
  console.log('\n\n🚀 直接APIモードのベンチマーク開始\n');
  for (let i = 0; i < totalRuns; i++) {
    const result = await runBenchmark('direct', i, dates);
    allResults.push(result);

    // レート制限遵守のため、次の実行まで5秒待機
    if (i < totalRuns - 1) {
      console.log('\n⏳ 5秒待機中...\n');
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  // レガシーモードのベンチマーク
  console.log('\n\n🔄 レガシーモードのベンチマーク開始\n');
  for (let i = 0; i < totalRuns; i++) {
    const result = await runBenchmark('legacy', i, dates);
    allResults.push(result);

    // レート制限遵守のため、次の実行まで5秒待機
    if (i < totalRuns - 1) {
      console.log('\n⏳ 5秒待機中...\n');
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  // サマリー計算
  const directResults = allResults.filter((r) => r.mode === 'direct');
  const legacyResults = allResults.filter((r) => r.mode === 'legacy');

  const directSummary = calculateSummary(directResults);
  const legacySummary = calculateSummary(legacyResults);

  // 結果表示
  console.log('\n\n╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                          ベンチマーク結果サマリー                             ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

  console.log('📊 直接APIモード:');
  console.log(`  成功: ${directSummary.successfulRuns}/${directSummary.runs} 回`);
  console.log(`  平均時間: ${directSummary.avgDurationSec}秒`);
  console.log(`  最小時間: ${directSummary.minDurationSec}秒`);
  console.log(`  最大時間: ${directSummary.maxDurationSec}秒`);
  console.log(`  標準偏差: ${directSummary.stdDeviation}秒`);

  console.log('\n📊 レガシーモード:');
  console.log(`  成功: ${legacySummary.successfulRuns}/${legacySummary.runs} 回`);
  console.log(`  平均時間: ${legacySummary.avgDurationSec}秒`);
  console.log(`  最小時間: ${legacySummary.minDurationSec}秒`);
  console.log(`  最大時間: ${legacySummary.maxDurationSec}秒`);
  console.log(`  標準偏差: ${legacySummary.stdDeviation}秒`);

  // パフォーマンス改善の計算
  if (directSummary.successfulRuns > 0 && legacySummary.successfulRuns > 0) {
    const improvement = legacySummary.avgDurationSec - directSummary.avgDurationSec;
    const improvementPercent = ((improvement / legacySummary.avgDurationSec) * 100).toFixed(1);

    console.log('\n🎯 パフォーマンス改善:');
    console.log(`  時間短縮: ${improvement.toFixed(2)}秒`);
    console.log(`  改善率: ${improvementPercent}%`);

    if (improvement > 100) {
      console.log('\n✨ 目標達成！ 100秒以上の高速化を実現しました。');
    } else if (improvement > 0) {
      console.log('\n✅ パフォーマンス改善が確認されました。');
    } else {
      console.log('\n⚠️  期待した改善が見られませんでした。');
    }
  }

  // 結果を保存
  saveResults(allResults, [directSummary, legacySummary]);

  console.log('\n✅ ベンチマーク完了\n');
}

// スクリプト実行
main().catch((error) => {
  console.error('❌ ベンチマーク実行中にエラーが発生しました:', error);
  process.exit(1);
});
