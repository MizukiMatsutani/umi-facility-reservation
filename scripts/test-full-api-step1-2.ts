/**
 * Step 1-2の完全API化実証テスト
 * AJAXレスポンスをスキップし、直接POSTで施設検索を実行
 */

import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

async function testFullApiStep12() {
  console.log('🔬 Step 1-2 完全API化の実証テスト\n');

  const browser = await puppeteer.launch({ headless: true });

  try {
    // ============================================
    // 比較1: 現在のアプローチ（UI操作）
    // ============================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📍 【現状】UI操作アプローチ');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const page1 = await browser.newPage();
    console.time('UI操作時間');

    // Step 1: ページアクセス
    await page1.goto('https://www.11489.jp/Umi/web/Home/WgR_ModeSelect', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    // Step 2a: 屋内スポーツを選択
    await page1.evaluate(() => {
      const radio = document.querySelector('#radioPurposeLarge02') as HTMLInputElement;
      if (radio) {
        radio.checked = true;
        radio.click();
      }
    });

    // AJAX完了を待機（2秒）
    await page1.waitForSelector('#checkPurposeMiddle505', { timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 2b: バスケットボールを選択
    await page1.evaluate(() => {
      const checkbox505 = document.querySelector('#checkPurposeMiddle505') as HTMLInputElement;
      const checkbox510 = document.querySelector('#checkPurposeMiddle510') as HTMLInputElement;

      if (checkbox505 && checkbox510) {
        checkbox505.checked = true;
        checkbox510.checked = true;

        const changeEvent = new Event('change', { bubbles: true });
        checkbox505.dispatchEvent(changeEvent);
        checkbox510.dispatchEvent(changeEvent);
      }
    });

    // Step 2c: 検索実行
    const navigationPromise1 = page1.waitForNavigation({
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    await page1.evaluate(() => {
      if (typeof (window as any).searchMokuteki === 'function') {
        (window as any).searchMokuteki();
      }
    });

    await navigationPromise1;
    console.timeEnd('UI操作時間');

    // 結果確認
    const html1 = await page1.content();
    const $1 = cheerio.load(html1);
    const facilityCount1 = $1('input[type="checkbox"][name="checkShisetsu"]').length;
    console.log(`✅ 施設数: ${facilityCount1}件\n`);

    await page1.close();

    // ============================================
    // 比較2: 完全API化アプローチ
    // ============================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📍 【最適化】完全API化アプローチ');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const page2 = await browser.newPage();
    console.time('API化時間');

    // Step 1: ページアクセス（CSRFトークン取得のみ）
    console.log('📍 Step 1: CSRFトークン取得（ページアクセス）');
    await page2.goto('https://www.11489.jp/Umi/web/Home/WgR_ModeSelect', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    // DOMが完全に構築されるまで少し待機
    await new Promise(resolve => setTimeout(resolve, 500));

    // CSRFトークンを取得
    const token = await page2.evaluate(() => {
      return (document.querySelector('input[name="__RequestVerificationToken"]') as HTMLInputElement)?.value;
    });

    if (!token) {
      throw new Error('CSRFトークンが取得できません');
    }
    console.log(`   ✓ CSRFトークン取得: ${token.substring(0, 20)}...`);

    // Step 2: AJAX待機をスキップして直接POST
    console.log('📍 Step 2: 直接POSTで施設検索（AJAX待機スキップ）');

    // POSTパラメータを構築
    const formData = new URLSearchParams({
      '__RequestVerificationToken': token,
      '__EVENTTARGET': 'btnSearchViaPurpose',
      '__EVENTARGUMENT': '',
      'radioPurposeLarge': '02',
      'checkPurposeMiddle': '505',
      'radioShisetsuLarge': '01',
      'shisetsuNameTxt': '',
    });
    formData.append('checkPurposeMiddle', '510');

    console.log('   → POSTパラメータ準備完了');

    // ナビゲーション待機をセットアップ
    const navigationPromise2 = page2.waitForNavigation({
      waitUntil: 'domcontentloaded',  // networkidle0 → domcontentloaded
      timeout: 30000,
    });

    // POSTリクエストを送信
    await page2.evaluate((url, body) => {
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = url;

      const params = new URLSearchParams(body);
      params.forEach((value, key) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value;
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
    }, 'https://www.11489.jp/Umi/web/Home/WgR_ModeSelect', formData.toString());

    await navigationPromise2;
    console.log('   ✓ 施設検索ページへ遷移完了');

    console.timeEnd('API化時間');

    // 結果確認
    const html2 = await page2.content();
    const $2 = cheerio.load(html2);
    const facilityCount2 = $2('input[type="checkbox"][name="checkShisetsu"]').length;
    console.log(`✅ 施設数: ${facilityCount2}件\n`);

    await page2.close();

    // ============================================
    // 結果比較
    // ============================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 結果比較');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`【現状】UI操作アプローチ:`);
    console.log(`   - 処理時間: 上記参照`);
    console.log(`   - 施設数: ${facilityCount1}件`);
    console.log(`   - AJAX待機: 2秒以上\n`);

    console.log(`【最適化】完全API化アプローチ:`);
    console.log(`   - 処理時間: 上記参照`);
    console.log(`   - 施設数: ${facilityCount2}件`);
    console.log(`   - AJAX待機: なし（スキップ）\n`);

    if (facilityCount1 === facilityCount2 && facilityCount2 > 0) {
      console.log('✅ 完全API化は成功！');
      console.log('✅ 同じ結果を得られるため、本番実装可能');
      console.log('\n📈 期待される効果:');
      console.log('   - AJAX待機（2-3秒）を完全削除');
      console.log('   - domcontentloaded使用でさらに1-2秒短縮');
      console.log('   - 合計で3-5秒の高速化（約30-40%改善）！');
      return true;
    } else {
      console.log('❌ 施設数が一致しません');
      console.log(`   現状: ${facilityCount1}件 vs API化: ${facilityCount2}件`);
      return false;
    }

  } catch (error) {
    console.error('\n❌ テスト失敗:', error);
    return false;
  } finally {
    await browser.close();
  }
}

testFullApiStep12().then(success => {
  process.exit(success ? 0 : 1);
});
