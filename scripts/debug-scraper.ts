/**
 * デバッグ用スクレイピングスクリプト
 *
 * 各ステップで詳細なログとスクリーンショットを出力して問題を特定します
 */

import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';

async function debugScraper() {
  const browser = await puppeteer.launch({
    headless: false, // ブラウザを表示
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();

    // User-Agent設定
    await page.setUserAgent('Mozilla/5.0 (compatible; UmiFacilitySearch/1.0)');

    // デバッグログを有効化
    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));

    console.log('📍 Step 1: 初期ページにアクセス');
    await page.goto('https://www.11489.jp/Umi/web/Home/WgR_ModeSelect', {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    await page.screenshot({
      path: 'docs/investigation/debug-step1.png',
      fullPage: true,
    });

    console.log('✅ Step 1完了');

    console.log('\n📍 Step 2: 屋内スポーツのラジオボタンを選択');

    // まず要素が存在するか確認
    const radioExists = await page.evaluate(() => {
      const radio = document.querySelector('#radioPurposeLarge02');
      console.log('ラジオボタンの存在:', !!radio);
      console.log('ラジオボタンの詳細:', radio ? {
        id: radio.id,
        value: (radio as HTMLInputElement).value,
        checked: (radio as HTMLInputElement).checked,
        visible: window.getComputedStyle(radio).display !== 'none',
      } : null);
      return !!radio;
    });

    if (!radioExists) {
      throw new Error('ラジオボタン #radioPurposeLarge02 が見つかりません');
    }

    // ラジオボタンをクリック
    await page.evaluate(() => {
      const radio = document.querySelector('#radioPurposeLarge02') as HTMLInputElement;
      console.log('ラジオボタンをクリックします');
      radio.checked = true;
      radio.click();
      console.log('クリック完了');
    });

    console.log('⏳ AJAXリクエストの完了を待機（5秒）...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    await page.screenshot({
      path: 'docs/investigation/debug-step2.png',
      fullPage: true,
    });

    // AJAXリクエストの結果を確認
    const ajaxResult = await page.evaluate(() => {
      const purposeTag = document.querySelector('#purposetag');
      console.log('purposetagの内容:', purposeTag?.innerHTML.substring(0, 200));

      // すべてのチェックボックスを取得
      const allCheckboxes = Array.from(document.querySelectorAll('input[name="checkPurposeMiddle"]'));
      console.log('全チェックボックス数:', allCheckboxes.length);

      const visibleCheckboxes = allCheckboxes.filter(cb => {
        const parent = cb.parentElement;
        return parent && window.getComputedStyle(parent).display !== 'none';
      });

      console.log('表示されているチェックボックス数:', visibleCheckboxes.length);

      return {
        purposeTagExists: !!purposeTag,
        totalCheckboxes: allCheckboxes.length,
        visibleCheckboxes: visibleCheckboxes.length,
        checkboxes: visibleCheckboxes.map(cb => ({
          id: cb.id,
          value: (cb as HTMLInputElement).value,
          label: cb.parentElement?.textContent?.trim(),
        })),
      };
    });

    console.log('\nAJAX結果:', JSON.stringify(ajaxResult, null, 2));

    // バスケットボールのチェックボックスを探す
    const basketballCheckbox = await page.evaluate(() => {
      const checkbox505 = document.querySelector('#checkPurposeMiddle505');
      const checkbox510 = document.querySelector('#checkPurposeMiddle510');

      console.log('バスケットボール (505):', !!checkbox505);
      console.log('ミニバスケットボール (510):', !!checkbox510);

      if (checkbox505) {
        const parent = checkbox505.parentElement;
        console.log('505の親要素のdisplay:', parent ? window.getComputedStyle(parent).display : 'N/A');
      }

      return {
        checkbox505Exists: !!checkbox505,
        checkbox510Exists: !!checkbox510,
      };
    });

    console.log('\nバスケットボールチェックボックス:', basketballCheckbox);

    if (!basketballCheckbox.checkbox505Exists) {
      console.error('❌ バスケットボールのチェックボックスが見つかりません');
      console.log('\n💡 代替方法を試します: 全チェックボックスからテキストで検索');

      const basketballByText = await page.evaluate(() => {
        const allCheckboxes = Array.from(document.querySelectorAll('input[name="checkPurposeMiddle"]'));
        const basketball = allCheckboxes.find(cb =>
          cb.parentElement?.textContent?.includes('バスケットボール') &&
          !cb.parentElement?.textContent?.includes('ミニ')
        );
        const miniBasketball = allCheckboxes.find(cb =>
          cb.parentElement?.textContent?.includes('ミニバスケットボール')
        );

        return {
          basketball: basketball ? {
            id: basketball.id,
            value: (basketball as HTMLInputElement).value,
            label: basketball.parentElement?.textContent?.trim(),
          } : null,
          miniBasketball: miniBasketball ? {
            id: miniBasketball.id,
            value: (miniBasketball as HTMLInputElement).value,
            label: miniBasketball.parentElement?.textContent?.trim(),
          } : null,
        };
      });

      console.log('テキスト検索結果:', JSON.stringify(basketballByText, null, 2));
    }

    console.log('\n⏳ 20秒待機します（ブラウザで確認できます）...');
    await new Promise(resolve => setTimeout(resolve, 20000));

  } catch (error) {
    console.error('❌ エラー:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

async function setup() {
  const dir = path.join(process.cwd(), 'docs/investigation');
  await fs.mkdir(dir, { recursive: true });
}

setup()
  .then(() => debugScraper())
  .then(() => {
    console.log('\n✅ デバッグ完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ デバッグ失敗:', error);
    process.exit(1);
  });
