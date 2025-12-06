/**
 * 施設一覧ページの調査
 */

import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';

async function investigateFacilityList() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (compatible; UmiFacilitySearch/1.0)');
    page.on('console', (msg) => console.log('PAGE:', msg.text()));

    console.log('📍 Step 1: 初期ページにアクセス');
    await page.goto('https://www.11489.jp/Umi/web/Home/WgR_ModeSelect', {
      waitUntil: 'networkidle0',
    });

    console.log('📍 Step 2: 屋内スポーツを選択');
    await page.evaluate(() => {
      const radio = document.querySelector('#radioPurposeLarge02') as HTMLInputElement;
      radio.checked = true;
      radio.click();
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('📍 Step 3: バスケットボールを選択');
    await page.evaluate(() => {
      const label505 = document.querySelector('label[for="checkPurposeMiddle505"]') as HTMLElement;
      const label510 = document.querySelector('label[for="checkPurposeMiddle510"]') as HTMLElement;
      label505.click();
      label510.click();
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('📍 Step 4: searchMokuteki()を呼び出して施設一覧ページへ遷移');

    const navigationPromise = page.waitForNavigation({
      waitUntil: 'networkidle0',
      timeout: 30000,
    }).catch(err => {
      console.log('⚠️ ナビゲーションタイムアウト（処理を続行します）');
      return null;
    });

    await page.evaluate(() => {
      (window as any).searchMokuteki();
    });

    await navigationPromise;

    // 少し待機してページが安定するまで待つ
    await new Promise(resolve => setTimeout(resolve, 3000));

    const currentUrl = page.url();
    console.log('\n✅ 施設一覧ページに到達しました');
    console.log('現在のURL:', currentUrl);

    // HTMLを保存
    const html = await page.content();
    await fs.writeFile(
      path.join(process.cwd(), 'docs/investigation/facility-list-page.html'),
      html
    );

    // スクリーンショット
    await page.screenshot({
      path: path.join(process.cwd(), 'docs/investigation/facility-list-page.png'),
      fullPage: true,
    });

    console.log('\n📊 施設一覧ページの構造を解析中...');

    // ページ構造の分析
    const pageStructure = await page.evaluate(() => {
      // テーブルを探す
      const tables = Array.from(document.querySelectorAll('table')).map((table, index) => ({
        index,
        id: table.id,
        className: table.className,
        rowCount: table.rows.length,
        firstRowCells: table.rows[0] ? table.rows[0].cells.length : 0,
      }));

      // フォームを探す
      const forms = Array.from(document.querySelectorAll('form')).map((form, index) => ({
        index,
        id: form.id,
        action: form.action,
        method: form.method,
      }));

      // チェックボックスを探す（施設選択用）
      const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]')).map(cb => ({
        id: cb.id,
        name: (cb as HTMLInputElement).name,
        value: (cb as HTMLInputElement).value,
        label: cb.parentElement?.textContent?.trim().substring(0, 50) || '',
      }));

      // ボタンを探す
      const buttons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]')).map(btn => ({
        tag: btn.tagName,
        type: (btn as HTMLInputElement).type || 'button',
        value: (btn as HTMLInputElement).value || btn.textContent?.trim(),
        id: btn.id,
        name: (btn as HTMLInputElement).name,
      }));

      return {
        tables,
        forms,
        checkboxes,
        buttons,
      };
    });

    console.log('\nテーブル:', JSON.stringify(pageStructure.tables, null, 2));
    console.log('\nフォーム:', JSON.stringify(pageStructure.forms, null, 2));
    console.log('\nチェックボックス（最初の10件）:', JSON.stringify(pageStructure.checkboxes.slice(0, 10), null, 2));
    console.log('\nボタン:', JSON.stringify(pageStructure.buttons, null, 2));

    // 施設名を含む要素を探す
    const facilityElements = await page.evaluate(() => {
      const text = document.body.textContent || '';
      const keywords = ['体育館', '運動', 'スポーツ', '施設'];

      const results: any[] = [];

      // すべてのテキストノードを探索
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null
      );

      let node;
      while (node = walker.nextNode()) {
        const text = node.textContent?.trim() || '';
        if (text.length > 3 && keywords.some(kw => text.includes(kw))) {
          const parent = node.parentElement;
          if (parent) {
            results.push({
              tag: parent.tagName,
              className: parent.className,
              id: parent.id,
              text: text.substring(0, 100),
            });
          }
        }
      }

      return results.slice(0, 20);
    });

    console.log('\n施設名を含む要素:', JSON.stringify(facilityElements, null, 2));

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
  .then(() => investigateFacilityList())
  .then(() => {
    console.log('\n✅ 調査完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 調査失敗:', error);
    process.exit(1);
  });
