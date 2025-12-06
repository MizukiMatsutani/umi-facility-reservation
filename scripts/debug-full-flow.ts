/**
 * 完全フローのデバッグスクリプト
 *
 * チェックボックス選択から検索ボタンクリックまでを確認
 */

import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';

async function debugFullFlow() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (compatible; UmiFacilitySearch/1.0)');

    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));

    console.log('📍 Step 1: 初期ページにアクセス');
    await page.goto('https://www.11489.jp/Umi/web/Home/WgR_ModeSelect', {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    console.log('\n📍 Step 2: 屋内スポーツを選択');
    await page.evaluate(() => {
      const radio = document.querySelector('#radioPurposeLarge02') as HTMLInputElement;
      console.log('ラジオボタンをクリック');
      radio.checked = true;
      radio.click();
    });

    console.log('⏳ AJAX完了を待機（5秒）...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('\n📍 Step 3: バスケットボールを選択');

    // 選択前の状態を確認
    const beforeSelection = await page.evaluate(() => {
      const basketball = document.querySelector('#checkPurposeMiddle505') as HTMLInputElement;
      const miniBasketball = document.querySelector('#checkPurposeMiddle510') as HTMLInputElement;

      return {
        basketball: {
          exists: !!basketball,
          checked: basketball?.checked,
          value: basketball?.value,
        },
        miniBasketball: {
          exists: !!miniBasketball,
          checked: miniBasketball?.checked,
          value: miniBasketball?.value,
        },
      };
    });

    console.log('選択前の状態:', JSON.stringify(beforeSelection, null, 2));

    // チェックボックスを選択
    await page.evaluate(() => {
      const basketball = document.querySelector('#checkPurposeMiddle505') as HTMLInputElement;
      const miniBasketball = document.querySelector('#checkPurposeMiddle510') as HTMLInputElement;

      console.log('バスケットボールをチェック');
      basketball.checked = true;
      basketball.click();

      console.log('ミニバスケットボールをチェック');
      miniBasketball.checked = true;
      miniBasketball.click();
    });

    // 少し待機
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 選択後の状態を確認
    const afterSelection = await page.evaluate(() => {
      const basketball = document.querySelector('#checkPurposeMiddle505') as HTMLInputElement;
      const miniBasketball = document.querySelector('#checkPurposeMiddle510') as HTMLInputElement;

      // すべての選択されたチェックボックスを取得
      const allChecked = Array.from(
        document.querySelectorAll('input[name="checkPurposeMiddle"]:checked')
      ).map(cb => ({
        id: cb.id,
        value: (cb as HTMLInputElement).value,
        label: cb.parentElement?.textContent?.trim(),
      }));

      return {
        basketball: {
          checked: basketball?.checked,
        },
        miniBasketball: {
          checked: miniBasketball?.checked,
        },
        allChecked,
      };
    });

    console.log('\n選択後の状態:', JSON.stringify(afterSelection, null, 2));

    await page.screenshot({
      path: 'docs/investigation/debug-after-selection.png',
      fullPage: true,
    });

    console.log('\n📍 Step 4: フォームのバリデーションを確認');

    // フォームのバリデーション状態を確認
    const validationState = await page.evaluate(() => {
      // ラジオボタンの選択状態
      const selectedRadio = document.querySelector(
        'input[name="radioPurposeLarge"]:checked'
      ) as HTMLInputElement;

      // チェックボックスの選択状態
      const checkedBoxes = Array.from(
        document.querySelectorAll('input[name="checkPurposeMiddle"]:checked')
      );

      return {
        radioSelected: selectedRadio ? selectedRadio.value : null,
        checkboxCount: checkedBoxes.length,
        checkboxValues: checkedBoxes.map(cb => (cb as HTMLInputElement).value),
      };
    });

    console.log('バリデーション状態:', JSON.stringify(validationState, null, 2));

    if (validationState.checkboxCount === 0) {
      console.error('❌ チェックボックスが選択されていません！');
      console.log('\n💡 別の方法を試します: labelをクリック');

      // labelをクリックする方法を試す
      await page.evaluate(() => {
        const label505 = document.querySelector('label[for="checkPurposeMiddle505"]');
        const label510 = document.querySelector('label[for="checkPurposeMiddle510"]');

        if (label505 && label510) {
          console.log('labelをクリックします');
          (label505 as HTMLElement).click();
          (label510 as HTMLElement).click();
        } else {
          console.log('label要素が見つかりません');
        }
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      // 再度確認
      const afterLabelClick = await page.evaluate(() => {
        const checkedBoxes = Array.from(
          document.querySelectorAll('input[name="checkPurposeMiddle"]:checked')
        );
        return {
          checkboxCount: checkedBoxes.length,
          checkboxValues: checkedBoxes.map(cb => (cb as HTMLInputElement).value),
        };
      });

      console.log('label クリック後:', JSON.stringify(afterLabelClick, null, 2));
    }

    console.log('\n📍 Step 5: 検索ボタンをクリック');

    // 検索ボタンの状態を確認
    const buttonState = await page.evaluate(() => {
      const btn = document.querySelector('#btnSearchViaPurpose') as HTMLInputElement;
      return {
        exists: !!btn,
        disabled: btn?.disabled,
        visible: btn ? window.getComputedStyle(btn).display !== 'none' : false,
      };
    });

    console.log('検索ボタンの状態:', JSON.stringify(buttonState, null, 2));

    // ナビゲーションの待機をセットアップ
    const navigationPromise = page.waitForNavigation({
      waitUntil: 'networkidle0',
      timeout: 30000,
    }).catch(err => {
      console.log('⚠️ ナビゲーションタイムアウト（ページ遷移しない可能性）:', err.message);
      return null;
    });

    // 検索ボタンをクリック
    await page.evaluate(() => {
      const btn = document.querySelector('#btnSearchViaPurpose') as HTMLInputElement;
      console.log('検索ボタンをクリックします');
      btn.click();
    });

    console.log('⏳ ページ遷移を待機中...');
    await navigationPromise;

    // 現在のURL
    const currentUrl = page.url();
    console.log('\n現在のURL:', currentUrl);

    // エラーダイアログが表示されているか確認
    const errorDialog = await page.evaluate(() => {
      const dlg = document.querySelector('#messageDlg');
      if (dlg && window.getComputedStyle(dlg).display !== 'none') {
        const titleEl = dlg.querySelector('h2');
        const messageEl = dlg.querySelector('div p');
        return {
          title: titleEl?.textContent?.trim() || '',
          message: messageEl?.textContent?.trim() || '',
        };
      }
      return null;
    });

    if (errorDialog) {
      console.error('\n❌ エラーダイアログ:', JSON.stringify(errorDialog, null, 2));
    } else {
      console.log('\n✅ エラーダイアログは表示されていません');
    }

    await page.screenshot({
      path: 'docs/investigation/debug-after-search.png',
      fullPage: true,
    });

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
  .then(() => debugFullFlow())
  .then(() => {
    console.log('\n✅ デバッグ完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ デバッグ失敗:', error);
    process.exit(1);
  });
