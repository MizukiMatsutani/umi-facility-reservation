/**
 * 宇美町施設予約システムのHTML構造調査スクリプト
 *
 * このスクリプトはPuppeteerを使用して実際のページにアクセスし、
 * HTML構造を取得して分析します。
 */

import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';

async function investigateHTML() {
  const browser = await puppeteer.launch({
    headless: false, // デバッグのためブラウザを表示
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();

    // User-Agent設定
    await page.setUserAgent(
      'Mozilla/5.0 (compatible; UmiFacilitySearch/1.0)'
    );

    console.log('📍 Step 1: 初期ページにアクセス中...');
    await page.goto('https://www.11489.jp/Umi/web/Home/WgR_ModeSelect', {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    // 初期ページのHTMLを保存
    const step1Html = await page.content();
    await fs.writeFile(
      path.join(process.cwd(), 'docs/investigation/step1-mode-select.html'),
      step1Html
    );
    console.log('✅ Step 1のHTMLを保存しました');

    // ページ構造の概要を出力
    console.log('\n📊 Step 1: ページ構造の概要');

    // すべてのフォーム要素を取得
    const forms = await page.$$eval('form', (forms) =>
      forms.map((form, index) => ({
        index,
        id: form.id,
        name: form.name,
        action: form.action,
        method: form.method,
      }))
    );
    console.log('フォーム:', JSON.stringify(forms, null, 2));

    // すべてのボタンを取得
    const buttons = await page.$$eval('button, input[type="button"], input[type="submit"]', (buttons) =>
      buttons.map((btn) => ({
        tag: btn.tagName,
        type: (btn as HTMLInputElement).type || 'button',
        value: (btn as HTMLInputElement).value || btn.textContent?.trim(),
        id: btn.id,
        name: (btn as HTMLInputElement).name,
        className: btn.className,
      }))
    );
    console.log('ボタン:', JSON.stringify(buttons, null, 2));

    // ラジオボタンとチェックボックスを取得
    const inputs = await page.$$eval('input[type="radio"], input[type="checkbox"]', (inputs) =>
      inputs.map((input) => ({
        type: (input as HTMLInputElement).type,
        name: (input as HTMLInputElement).name,
        value: (input as HTMLInputElement).value,
        id: input.id,
        checked: (input as HTMLInputElement).checked,
        label: input.parentElement?.textContent?.trim() || '',
      }))
    );
    console.log('入力要素:', JSON.stringify(inputs, null, 2));

    // セレクトボックスを取得
    const selects = await page.$$eval('select', (selects) =>
      selects.map((select) => ({
        name: (select as HTMLSelectElement).name,
        id: select.id,
        options: Array.from((select as HTMLSelectElement).options).map(opt => ({
          value: opt.value,
          text: opt.text,
        })),
      }))
    );
    console.log('セレクトボックス:', JSON.stringify(selects, null, 2));

    console.log('\n⏳ 10秒待機します（手動で操作を確認できます）...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // スクリーンショットを保存
    await page.screenshot({
      path: path.join(process.cwd(), 'docs/investigation/step1-screenshot.png'),
      fullPage: true,
    });
    console.log('✅ スクリーンショットを保存しました');

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
  .then(() => investigateHTML())
  .then(() => {
    console.log('\n✅ 調査完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 調査失敗:', error);
    process.exit(1);
  });
