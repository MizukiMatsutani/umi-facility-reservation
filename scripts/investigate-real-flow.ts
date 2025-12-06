import puppeteer from 'puppeteer';
import { writeFile } from 'fs/promises';

/**
 * 実際のフローを手動で確認するための調査スクリプト
 *
 * このスクリプトは、施設一覧ページまで自動で進み、
 * その後は手動操作で次のページに進むことができます。
 */
async function investigateRealFlow() {
  console.log('🔍 実際のフローを調査します...');
  console.log('このスクリプトは施設一覧ページまで自動で進み、その後は手動操作が可能です。\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1400, height: 900 },
  });

  try {
    const page = await browser.newPage();

    // ダイアログを自動受け入れ
    page.on('dialog', async (dialog) => {
      console.log('📋 ダイアログ:', dialog.message());
      await dialog.accept();
    });

    // 1. 検索ページ
    console.log('1️⃣ 検索ページへアクセス...');
    await page.goto('https://www.11489.jp/Umi/web/Home/WgR_ModeSelect', {
      waitUntil: 'networkidle0',
    });

    // 2. 屋内スポーツを選択
    console.log('2️⃣ 屋内スポーツを選択...');
    await page.evaluate(() => {
      const radio = document.querySelector('#radioPurposeLarge02') as HTMLInputElement;
      if (radio) {
        radio.checked = true;
        radio.click();
      }
    });

    await page.waitForSelector('#checkPurposeMiddle505', { timeout: 10000 });
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 3. バスケットボールを選択
    console.log('3️⃣ バスケットボールを選択...');
    await page.evaluate(() => {
      const checkbox505 = document.querySelector('#checkPurposeMiddle505') as HTMLInputElement;
      const checkbox510 = document.querySelector('#checkPurposeMiddle510') as HTMLInputElement;

      if (checkbox505 && checkbox510) {
        checkbox505.checked = true;
        checkbox510.checked = true;
      }
    });

    // 4. 検索
    console.log('4️⃣ 検索ボタンをクリック...');
    await page.evaluate(() => {
      const btn = document.querySelector('#btnSearchViaPurpose') as HTMLElement;
      if (btn) {
        btn.click();
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 3000));
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});

    console.log('✅ 施設一覧ページへ遷移しました');
    console.log('現在のURL:', page.url());

    console.log('\n─────────────────────────────────────');
    console.log('📝 ここからは手動で操作してください：');
    console.log('─────────────────────────────────────');
    console.log('1. 1つの施設にチェックを入れる');
    console.log('2. 「次へ進む」ボタンをクリック');
    console.log('3. 次のページでどのような画面が表示されるか確認');
    console.log('4. 日付選択UIがあるか確認');
    console.log('5. そのページのURLを確認');
    console.log('─────────────────────────────────────\n');

    // ページURLの変化を監視
    let lastUrl = page.url();
    const urlCheckInterval = setInterval(async () => {
      const currentUrl = page.url();
      if (currentUrl !== lastUrl) {
        console.log('\n🔗 URLが変更されました:');
        console.log('  前:', lastUrl);
        console.log('  後:', currentUrl);

        // ページHTMLを保存
        const timestamp = Date.now();
        const html = await page.content();
        const filename = `manual-investigation-${timestamp}.html`;
        await writeFile(filename, html);
        console.log(`  📄 ${filename} に保存しました`);

        // スクリーンショット
        const screenshotFilename = `manual-investigation-${timestamp}.png`;
        await page.screenshot({ path: screenshotFilename, fullPage: true });
        console.log(`  📸 ${screenshotFilename} に保存しました\n`);

        lastUrl = currentUrl;
      }
    }, 1000);

    console.log('⏳ 300秒間（5分間）ブラウザを開いたままにします...');
    console.log('   調査が完了したら、手動でブラウザを閉じてください。\n');

    await new Promise((resolve) => setTimeout(resolve, 300000));

    clearInterval(urlCheckInterval);

    console.log('\n✅ 調査完了！');
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  } finally {
    await browser.close();
  }
}

investigateRealFlow();
