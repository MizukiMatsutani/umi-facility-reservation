import puppeteer from 'puppeteer';
import { writeFile } from 'fs/promises';

async function investigateDatePage() {
  console.log('🔍 日付選択ページを調査します...\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 800 },
  });

  try {
    const page = await browser.newPage();

    // ダイアログを自動受け入れ
    page.on('dialog', async (dialog) => {
      console.log('ダイアログ:', dialog.message());
      await dialog.accept();
    });

    // 1. 初期ページ
    console.log('1️⃣ 検索ページへアクセス...');
    await page.goto('https://www.11489.jp/Umi/web/Home/WgR_ModeSelect', {
      waitUntil: 'networkidle0',
      timeout: 10000,
    });

    // 2. 屋内スポーツを選択
    console.log('2️⃣ 屋内スポーツを選択...');
    await page.evaluate(() => {
      const radio = document.querySelector(
        '#radioPurposeLarge02'
      ) as HTMLInputElement;
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
      const checkbox505 = document.querySelector(
        '#checkPurposeMiddle505'
      ) as HTMLInputElement;
      const checkbox510 = document.querySelector(
        '#checkPurposeMiddle510'
      ) as HTMLInputElement;

      if (checkbox505 && checkbox510) {
        checkbox505.checked = true;
        checkbox510.checked = true;
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    // 4. 検索ボタンをクリック
    console.log('4️⃣ 検索ボタンをクリック...');
    await page.evaluate(() => {
      const btn = document.querySelector('#btnSearchViaPurpose') as HTMLElement;
      if (btn) {
        btn.click();
      }
    });

    // ナビゲーション完了を待つ
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // ダイアログがあった可能性があるため、URLを確認
    console.log('現在のURL:', page.url());

    // ナビゲーションが完了するまで待機
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {
      console.log('ナビゲーション完了済み');
    });

    console.log('✅ 施設一覧ページへ遷移しました');

    // 5. 施設を選択
    console.log('5️⃣ 1つ目の施設を選択...');

    // まず施設リストを確認
    const facilitiesInfo = await page.evaluate(() => {
      const checkboxes = Array.from(
        document.querySelectorAll('input[name="checkShisetsu"]')
      );
      return checkboxes.map((cb) => ({
        id: cb.id,
        value: (cb as HTMLInputElement).value,
      }));
    });

    console.log('施設リスト:', facilitiesInfo);

    if (facilitiesInfo.length === 0) {
      console.error('施設が見つかりません。ページHTMLを保存します...');
      const html = await page.content();
      await writeFile('facility-list-error.html', html);
      await page.screenshot({ path: 'facility-list-error.png', fullPage: true });
      throw new Error('施設が見つかりません');
    }

    const facilityId = facilitiesInfo[0].value;

    await page.evaluate((id) => {
      const checkbox = document.querySelector(
        `#checkShisetsu${id}`
      ) as HTMLInputElement;
      if (checkbox) {
        checkbox.checked = true;
        checkbox.click();
      }
    }, facilityId);

    console.log(`施設ID: ${facilityId} を選択しました`);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 6. 「次へ進む」をクリック
    console.log('6️⃣ 「次へ進む」ボタンをクリック...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }),
      page.click('#btnNext'),
    ]);

    console.log('✅ 日付選択ページへ遷移しました');
    console.log('現在のURL:', page.url());

    // 7. 日付選択ページのHTML構造を調査
    console.log('\n7️⃣ 日付選択ページの構造を調査...');

    const datePageInfo = await page.evaluate(() => {
      // すべてのinput要素
      const inputs = Array.from(document.querySelectorAll('input')).map(
        (input) => ({
          id: input.id,
          name: input.name,
          type: input.type,
          value: input.value,
          className: input.className,
        })
      );

      // カレンダー要素の候補
      const calendarElements = Array.from(
        document.querySelectorAll('table, div[class*="calendar"], div[class*="date"]')
      ).map((el) => ({
        tagName: el.tagName,
        id: el.id,
        className: el.className,
        innerHTML: el.innerHTML.substring(0, 200), // 最初の200文字のみ
      }));

      // data-date属性を持つ要素
      const dataDateElements = Array.from(
        document.querySelectorAll('[data-date]')
      ).map((el) => ({
        tagName: el.tagName,
        dataDate: el.getAttribute('data-date'),
        textContent: el.textContent?.trim(),
        className: el.className,
      }));

      // ボタン要素
      const buttons = Array.from(
        document.querySelectorAll('button, input[type="button"], a.btn, a[class*="btn"]')
      ).map((btn) => ({
        tagName: btn.tagName,
        id: btn.id,
        type: btn.getAttribute('type'),
        value: btn.getAttribute('value'),
        textContent: btn.textContent?.trim(),
        className: btn.className,
      }));

      return {
        url: window.location.href,
        inputs,
        calendarElements,
        dataDateElements,
        buttons,
      };
    });

    console.log('\n📋 日付選択ページ情報:');
    console.log(JSON.stringify(datePageInfo, null, 2));

    // 8. HTMLを保存
    console.log('\n8️⃣ HTMLとスクリーンショットを保存...');
    const html = await page.content();
    await writeFile('date-selection-page.html', html);
    console.log('✅ date-selection-page.html に保存しました');

    await page.screenshot({ path: 'date-selection-page.png', fullPage: true });
    console.log('✅ date-selection-page.png に保存しました');

    console.log('\n✅ 調査完了！');
    console.log('60秒後にブラウザを閉じます...');
    await new Promise((resolve) => setTimeout(resolve, 60000));
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  } finally {
    await browser.close();
  }
}

investigateDatePage();
