/**
 * 宇美町施設予約システムの操作フロー調査スクリプト
 *
 * Step 1: 初期ページ
 * Step 2: 屋内スポーツを選択してスポーツ種目を表示
 * Step 3: バスケットボール、ミニバスケットボールを選択して検索
 * Step 4: 施設一覧を取得
 */

import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';

async function investigateFlow() {
  const browser = await puppeteer.launch({
    headless: false, // デバッグのためブラウザを表示
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (compatible; UmiFacilitySearch/1.0)');

    console.log('📍 Step 1: 初期ページにアクセス中...');
    await page.goto('https://www.11489.jp/Umi/web/Home/WgR_ModeSelect', {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    console.log('📍 Step 2: 屋内スポーツを選択...');

    // 屋内スポーツのラジオボタンを選択（JavaScriptで操作）
    await page.evaluate(() => {
      const radio = document.querySelector('#radioPurposeLarge02') as HTMLInputElement;
      if (radio) {
        radio.checked = true;
        radio.click();
      }
    });

    // 少し待機（JavaScriptが実行されるまで）
    await new Promise(resolve => setTimeout(resolve, 2000));

    // スクリーンショット
    await page.screenshot({
      path: path.join(process.cwd(), 'docs/investigation/step2-indoor-sports.png'),
      fullPage: true,
    });

    // この時点でのチェックボックスを確認
    const sportsCheckboxes = await page.$$eval('input[name="checkPurposeMiddle"]', (inputs) =>
      inputs
        .filter((input) => {
          const parent = input.parentElement;
          // visible なものだけを取得
          return parent && window.getComputedStyle(parent).display !== 'none';
        })
        .map((input) => ({
          value: (input as HTMLInputElement).value,
          id: input.id,
          label: input.parentElement?.textContent?.trim() || '',
        }))
    );
    console.log('屋内スポーツのチェックボックス:', JSON.stringify(sportsCheckboxes, null, 2));

    // HTMLを保存
    const step2Html = await page.content();
    await fs.writeFile(
      path.join(process.cwd(), 'docs/investigation/step2-indoor-sports.html'),
      step2Html
    );

    console.log('📍 Step 3: バスケットボール関連を選択...');

    // バスケットボールとミニバスケットボールのチェックボックスを探す
    const basketballCheckboxes = sportsCheckboxes.filter(
      (cb) => cb.label.includes('バスケ')
    );
    console.log('バスケットボール関連:', JSON.stringify(basketballCheckboxes, null, 2));

    // チェックボックスを選択（JavaScriptで操作）
    for (const cb of basketballCheckboxes) {
      await page.evaluate((id) => {
        const checkbox = document.querySelector(`#${id}`) as HTMLInputElement;
        if (checkbox) {
          checkbox.checked = true;
          checkbox.click();
        }
      }, cb.id);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // スクリーンショット
    await page.screenshot({
      path: path.join(process.cwd(), 'docs/investigation/step3-basketball-selected.png'),
      fullPage: true,
    });

    console.log('📍 Step 4: 検索ボタンをクリック...');

    // 検索ボタンをクリック（JavaScriptで操作）
    await page.evaluate(() => {
      const btn = document.querySelector('#btnSearchViaPurpose') as HTMLInputElement;
      if (btn) {
        btn.click();
      }
    });

    // ページ遷移を待機
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 });

    // 遷移後のURL
    const currentUrl = page.url();
    console.log('遷移後のURL:', currentUrl);

    // HTMLを保存
    const step4Html = await page.content();
    await fs.writeFile(
      path.join(process.cwd(), 'docs/investigation/step4-facility-list.html'),
      step4Html
    );

    // スクリーンショット
    await page.screenshot({
      path: path.join(process.cwd(), 'docs/investigation/step4-facility-list.png'),
      fullPage: true,
    });

    // 施設一覧を取得
    const facilities = await page.evaluate(() => {
      // テーブルやリストから施設情報を抽出
      const facilityElements = Array.from(
        document.querySelectorAll('input[type="checkbox"][name*="shisetsu"], input[type="checkbox"][name*="Shisetsu"]')
      );

      return facilityElements.map((el) => {
        const input = el as HTMLInputElement;
        return {
          id: input.id,
          name: input.name,
          value: input.value,
          label: input.parentElement?.textContent?.trim() || '',
        };
      });
    });

    console.log('施設一覧:', JSON.stringify(facilities, null, 2));

    console.log('\n⏳ 10秒待機します（手動で操作を確認できます）...');
    await new Promise(resolve => setTimeout(resolve, 10000));

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// ディレクトリ作成
async function setup() {
  const dir = path.join(process.cwd(), 'docs/investigation');
  await fs.mkdir(dir, { recursive: true });
}

setup()
  .then(() => investigateFlow())
  .then(() => {
    console.log('\n✅ 調査完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 調査失敗:', error);
    process.exit(1);
  });
