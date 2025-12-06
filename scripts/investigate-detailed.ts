/**
 * 詳細な調査スクリプト - ブラウザでの実際の操作をトレース
 */

import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';

async function investigateDetailed() {
  const browser = await puppeteer.launch({
    headless: false, // デバッグのためブラウザを表示
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    slowMo: 500, // 操作を遅くして確認しやすくする
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    console.log('📍 初期ページにアクセス中...');
    await page.goto('https://www.11489.jp/Umi/web/Home/WgR_ModeSelect', {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    console.log('\n✋ 手動で操作を行ってください:');
    console.log('1. 「カテゴリーから探す」タブを選択');
    console.log('2. 「体育施設」ボタンをクリック');
    console.log('3. または「使用目的から探す」で屋内スポーツ → バスケットボール を選択');
    console.log('4. 検索ボタンをクリック');
    console.log('5. 施設一覧が表示されたら、この画面に戻ってEnterキーを押してください\n');

    // ブラウザでの操作を60秒待機
    console.log('⏳ 60秒間、手動操作を待機します...');
    await new Promise(resolve => setTimeout(resolve, 60000));

    // 現在のURLを確認
    const currentUrl = page.url();
    console.log('\n現在のURL:', currentUrl);

    // HTMLを保存
    const html = await page.content();
    await fs.writeFile(
      path.join(process.cwd(), 'docs/investigation/manual-operation-result.html'),
      html
    );

    // スクリーンショット
    await page.screenshot({
      path: path.join(process.cwd(), 'docs/investigation/manual-operation-result.png'),
      fullPage: true,
    });

    // ページ内の重要な要素を取得
    console.log('\n📊 ページ解析:');

    // フォームを確認
    const formInfo = await page.evaluate(() => {
      const form = document.querySelector('form');
      return form ? {
        action: form.action,
        method: form.method,
        id: form.id,
      } : null;
    });
    console.log('フォーム情報:', formInfo);

    // テーブルを確認
    const tables = await page.$$eval('table', (tables) =>
      tables.map((table, index) => ({
        index,
        id: table.id,
        className: table.className,
        rowCount: table.rows.length,
      }))
    );
    console.log('テーブル:', JSON.stringify(tables, null, 2));

    // チェックボックスを確認（施設選択用）
    const checkboxes = await page.$$eval('input[type="checkbox"]', (inputs) =>
      inputs
        .filter(input => {
          const parent = input.parentElement;
          return parent && window.getComputedStyle(parent).display !== 'none';
        })
        .map((input) => ({
          name: (input as HTMLInputElement).name,
          value: (input as HTMLInputElement).value,
          id: input.id,
          checked: (input as HTMLInputElement).checked,
          label: input.parentElement?.textContent?.trim().substring(0, 50) || '',
        }))
    );
    console.log('表示されているチェックボックス:', JSON.stringify(checkboxes, null, 2));

    console.log('\n✅ 調査完了。HTMLとスクリーンショットを保存しました。');

  } catch (error) {
    console.error('❌ エラー:', error);
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
  .then(() => investigateDetailed())
  .then(() => {
    console.log('\n✅ すべて完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 失敗:', error);
    process.exit(1);
  });
