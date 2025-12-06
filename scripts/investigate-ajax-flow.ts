/**
 * AJAX対応版: 宇美町施設予約システムの操作フロー調査
 *
 * AJAXによる動的読み込みを考慮した実装
 */

import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';

async function investigateAjaxFlow() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    console.log('📍 Step 1: 初期ページにアクセス中...');
    await page.goto('https://www.11489.jp/Umi/web/Home/WgR_ModeSelect', {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    // Step1のHTMLを保存
    const step1Html = await page.content();
    await fs.writeFile(
      path.join(process.cwd(), 'docs/investigation/ajax-step1-initial.html'),
      step1Html
    );
    console.log('✅ Step 1のHTMLを保存しました');

    console.log('\n📍 Step 2: 屋内スポーツのラジオボタンをクリック...');

    // ラジオボタンのlabelをクリック（これが正しい操作方法）
    await page.click('label[for="radioPurposeLarge02"]');

    console.log('⏳ AJAXリクエストが完了するまで待機中...');

    // AJAXでスポーツ種目が読み込まれるまで待機
    await page.waitForSelector('#checkPurposeMiddle505', {
      visible: true,
      timeout: 10000,
    });

    console.log('✅ スポーツ種目が表示されました');

    // 少し待機（DOMが完全に更新されるまで）
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step2のHTMLを保存
    const step2Html = await page.content();
    await fs.writeFile(
      path.join(process.cwd(), 'docs/investigation/ajax-step2-sports-loaded.html'),
      step2Html
    );

    // スクリーンショット
    await page.screenshot({
      path: path.join(process.cwd(), 'docs/investigation/ajax-step2-screenshot.png'),
      fullPage: true,
    });

    // 表示されたスポーツ種目を取得
    const sportsOptions = await page.$$eval('input[name="checkPurposeMiddle"]', (inputs) =>
      inputs
        .filter(input => {
          const parent = input.parentElement;
          return parent && window.getComputedStyle(parent).display !== 'none';
        })
        .map((input) => ({
          value: (input as HTMLInputElement).value,
          id: input.id,
          label: input.parentElement?.textContent?.trim() || '',
        }))
    );
    console.log('\n表示されたスポーツ種目:', JSON.stringify(sportsOptions, null, 2));

    console.log('\n📍 Step 3: バスケットボールとミニバスケットボールを選択...');

    // チェックボックスのlabelをクリック
    await page.click('label[for="checkPurposeMiddle505"]');
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.click('label[for="checkPurposeMiddle510"]');
    await new Promise(resolve => setTimeout(resolve, 500));

    // スクリーンショット
    await page.screenshot({
      path: path.join(process.cwd(), 'docs/investigation/ajax-step3-basketball-selected.png'),
      fullPage: true,
    });

    console.log('\n📍 Step 4: 検索ボタンをクリック...');

    // ナビゲーションの待機をセットアップ（クリック前に設定）
    const navigationPromise = page.waitForNavigation({
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    // 検索ボタンをクリック
    await page.click('#btnSearchViaPurpose');

    console.log('⏳ ページ遷移を待機中...');

    // ページ遷移を待つ
    try {
      await navigationPromise;
      console.log('✅ ページ遷移が完了しました');
    } catch (error) {
      console.warn('⚠️ ナビゲーションタイムアウトまたは失敗:', error);
    }

    // 現在のURL
    const currentUrl = page.url();
    console.log('現在のURL:', currentUrl);

    // エラーメッセージが表示されているか確認
    const errorMessage = await page.evaluate(() => {
      const dlg = document.querySelector('#messageDlg');
      if (dlg && window.getComputedStyle(dlg).display !== 'none') {
        const titleEl = dlg.querySelector('h2');
        const messageEl = dlg.querySelector('div p');
        return {
          title: titleEl?.textContent || '',
          message: messageEl?.textContent || '',
        };
      }
      return null;
    });

    if (errorMessage) {
      console.error('❌ エラーダイアログが表示されました:', errorMessage);
    } else {
      console.log('✅ エラーは表示されていません');
    }

    // Step4のHTMLを保存
    const step4Html = await page.content();
    await fs.writeFile(
      path.join(process.cwd(), 'docs/investigation/ajax-step4-result.html'),
      step4Html
    );

    // スクリーンショット
    await page.screenshot({
      path: path.join(process.cwd(), 'docs/investigation/ajax-step4-result.png'),
      fullPage: true,
    });

    // 施設一覧のチェックボックスを探す
    const facilities = await page.evaluate(() => {
      // 様々なパターンで施設のチェックボックスを探す
      const selectors = [
        'input[type="checkbox"][name*="shisetsu"]',
        'input[type="checkbox"][name*="Shisetsu"]',
        'input[type="checkbox"][name*="facility"]',
        '.facilities input[type="checkbox"]',
        '.facility-list input[type="checkbox"]',
      ];

      for (const selector of selectors) {
        const elements = Array.from(document.querySelectorAll(selector));
        if (elements.length > 0) {
          return {
            selector,
            count: elements.length,
            facilities: elements.slice(0, 5).map((el) => {
              const input = el as HTMLInputElement;
              return {
                id: input.id,
                name: input.name,
                value: input.value,
                label: input.parentElement?.textContent?.trim().substring(0, 50) || '',
              };
            }),
          };
        }
      }

      return null;
    });

    console.log('\n施設一覧:', JSON.stringify(facilities, null, 2));

    console.log('\n⏳ 10秒待機します（確認用）...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    console.log('\n✅ 調査完了');

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
  .then(() => investigateAjaxFlow())
  .then(() => {
    console.log('\n✅ すべて完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 失敗:', error);
    process.exit(1);
  });
