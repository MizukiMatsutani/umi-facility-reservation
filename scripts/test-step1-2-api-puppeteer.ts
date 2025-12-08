/**
 * Step 1-2のAPI化実証テスト（Puppeteer版）
 * ANALYSIS.mdの調査結果を基に、UI操作を最小限にして施設検索まで実行できるかテスト
 */

import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

const BASE_URL = 'https://www.11489.jp/Umi/web';

async function testHybridApproach() {
  console.log('🔬 Step 1-2の最適化検証テスト開始\n');

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // ============================================
    // 現状のアプローチ：UI操作でStep 1-2を実行
    // ============================================
    console.log('📍 【現状】UI操作によるStep 1-2');
    console.time('UI操作時間');

    // Step 1: ページアクセス
    await page.goto(`${BASE_URL}/Home/WgR_ModeSelect`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    // Step 2a: 屋内スポーツを選択
    await page.evaluate(() => {
      const radio = document.querySelector('#radioPurposeLarge02') as HTMLInputElement;
      if (radio) {
        radio.checked = true;
        radio.click();
      }
    });

    // AJAX完了を待機
    await page.waitForSelector('#checkPurposeMiddle505', { timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 2b: バスケットボールを選択
    await page.evaluate(() => {
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
    const navigationPromise = page.waitForNavigation({
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    await page.evaluate(() => {
      if (typeof (window as any).searchMokuteki === 'function') {
        (window as any).searchMokuteki();
      }
    });

    await navigationPromise;

    console.timeEnd('UI操作時間');

    // 結果を確認
    const html1 = await page.content();
    const $1 = cheerio.load(html1);
    const facilityCount1 = $1('input[type="checkbox"][name="checkShisetsu"]').length;
    console.log(`  ✓ 施設数: ${facilityCount1}件`);

    // ============================================
    // 最適化アプローチの検証：POST APIを使ってStep 2を実行
    // ============================================
    console.log('\n📍 【最適化案】POST APIによるStep 2');
    console.log('   ※Step 1は同じ（ページアクセス必須）\n');
    console.time('最適化時間');

    // 新しいページで検証
    const page2 = await browser.newPage();

    // Step 1: ページアクセス（CSRFトークン取得）
    await page2.goto(`${BASE_URL}/Home/WgR_ModeSelect`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    // CSRFトークンを取得
    const token = await page2.evaluate(() => {
      return (document.querySelector('input[name="__RequestVerificationToken"]') as HTMLInputElement)?.value;
    });

    if (!token) {
      throw new Error('CSRFトークンが取得できません');
    }

    console.log(`  ✓ CSRFトークン取得: ${token.substring(0, 20)}...`);

    // Step 2: POST APIで直接検索（UI操作なし）
    console.log('  → POST APIで直接検索実行（UI操作スキップ）');

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

    // ナビゲーション待機をセットアップ
    const nav2 = page2.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 });

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
    }, `${BASE_URL}/Home/WgR_ModeSelect`, formData.toString());

    await nav2;

    console.timeEnd('最適化時間');

    // 結果を確認
    const html2 = await page2.content();
    const $2 = cheerio.load(html2);
    const facilityCount2 = $2('input[type="checkbox"][name="checkShisetsu"]').length;
    console.log(`  ✓ 施設数: ${facilityCount2}件`);

    await page2.close();

    // ============================================
    // 結果比較
    // ============================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 結果比較');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`現状（UI操作）: ${facilityCount1}件の施設を取得`);
    console.log(`最適化案（POST API）: ${facilityCount2}件の施設を取得`);

    if (facilityCount1 === facilityCount2 && facilityCount2 > 0) {
      console.log('\n✅ 最適化は実現可能！');
      console.log('   POST APIを使えばUI操作（AJAX待機、チェックボックス操作）を省略できます');
      return true;
    } else {
      console.log('\n❌ 最適化は困難');
      console.log('   POST APIでは同じ結果が得られません');
      return false;
    }

  } catch (error) {
    console.error('\n❌ テスト失敗:', error);
    return false;
  } finally {
    await browser.close();
  }
}

// 実行
testHybridApproach().then(success => {
  process.exit(success ? 0 : 1);
});
