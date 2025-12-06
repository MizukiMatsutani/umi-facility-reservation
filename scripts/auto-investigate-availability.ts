import puppeteer from 'puppeteer';
import fs from 'fs';

async function autoInvestigateAvailability() {
  console.log('📍 空き状況ページの自動調査を開始します\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 800 },
  });

  try {
    const page = await browser.newPage();

    console.log('Step 1: 施設検索ページにアクセス');
    await page.goto('https://www.11489.jp/Umi/web/Home/WgR_ModeSelect', {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    // beforeunload無効化
    await page.evaluate(() => {
      window.addEventListener('beforeunload', (e) => {
        e.preventDefault();
        delete e['returnValue'];
      });
    });

    console.log('\nStep 2: 屋内スポーツを選択');
    await page.evaluate(() => {
      const radio = document.querySelector('#radioPurposeLarge02') as HTMLInputElement;
      if (radio) {
        radio.checked = true;
        radio.click();
      }
    });

    await page.waitForSelector('#checkPurposeMiddle505', { timeout: 15000 });
    await page.waitForFunction(
      () => {
        const checkbox = document.querySelector('#checkPurposeMiddle505');
        if (!checkbox) return false;
        const parent = checkbox.parentElement;
        if (!parent) return false;
        return window.getComputedStyle(parent).display !== 'none';
      },
      { timeout: 15000 }
    );
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\nStep 3: バスケットボールを選択');
    await page.evaluate(() => {
      const checkbox505 = document.querySelector('#checkPurposeMiddle505') as HTMLInputElement;
      const checkbox510 = document.querySelector('#checkPurposeMiddle510') as HTMLInputElement;

      if (checkbox505 && checkbox510) {
        checkbox505.checked = true;
        checkbox510.checked = true;

        const changeEvent = new Event('change', { bubbles: true });
        checkbox505.dispatchEvent(changeEvent);
        checkbox510.dispatchEvent(changeEvent);

        const clickEvent = new Event('click', { bubbles: true });
        checkbox505.dispatchEvent(clickEvent);
        checkbox510.dispatchEvent(clickEvent);
      }
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('\nStep 4: 検索を実行');

    // ページ遷移の待機をセットアップ（searchMokuteki()を呼び出す前に設定）
    const navigationPromise = page.waitForNavigation({
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    // searchMokuteki()を呼び出す
    await page.evaluate(() => {
      if (typeof (window as any).searchMokuteki === 'function') {
        (window as any).searchMokuteki();
      } else {
        throw new Error('searchMokuteki関数が見つかりません');
      }
    });

    console.log('⏳ ページ遷移を待機中...');
    await navigationPromise;

    console.log('\n✅ 施設一覧ページに到達');
    console.log('URL:', page.url());

    // ページHTMLを保存
    const facilityListHtml = await page.content();
    fs.writeFileSync('docs/investigation/facility-list-auto.html', facilityListHtml);
    await page.screenshot({ path: 'docs/investigation/facility-list-auto.png', fullPage: true });

    console.log('\nStep 5: 施設一覧ページの情報を取得');

    const pageInfo = await page.evaluate(() => {
      // すべてのボタンを取得
      const buttons = Array.from(document.querySelectorAll('input[type="button"], button'));
      return buttons.map(btn => ({
        text: (btn as HTMLInputElement).value || btn.textContent?.trim(),
        id: btn.id,
        name: (btn as HTMLInputElement).name,
        className: btn.className,
        onclick: btn.getAttribute('onclick'),
      }));
    });

    console.log('\nページ内のすべてのボタン:');
    pageInfo.forEach((btn, i) => {
      console.log(`${i + 1}. "${btn.text}" (onclick: ${btn.onclick?.substring(0, 50)})`);
    });

    // 最初の施設を選択
    console.log('\nStep 6: 最初の施設を選択');
    const firstFacilityId = await page.evaluate(() => {
      const checkbox = document.querySelector('input[name="checkShisetsu"]') as HTMLInputElement;
      if (checkbox) {
        checkbox.checked = true;
        checkbox.click();
        return checkbox.value;
      }
      return null;
    });

    console.log(`選択した施設ID: ${firstFacilityId}`);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 「次へ進む」ボタンをクリック
    console.log('\nStep 7: 「次へ進む」ボタンをクリック');

    // btnNextボタンが見えるまでスクロール
    await page.evaluate(() => {
      const button = document.querySelector('#btnNext');
      if (button) {
        button.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
    await new Promise(resolve => setTimeout(resolve, 1000));

    // スクリーンショット
    await page.screenshot({ path: 'docs/investigation/before-click-next.png', fullPage: true });

    // 「次へ進む」ボタンの存在を確認
    const buttonExists = await page.evaluate(() => {
      const button = document.querySelector('#btnNext');
      return {
        exists: !!button,
        text: button?.textContent?.trim(),
        href: button?.getAttribute('href'),
      };
    });

    console.log('\n「次へ進む」ボタン:', buttonExists);

    if (buttonExists.exists) {
      // ページ遷移の準備
      const navigationPromise = page.waitForNavigation({
        waitUntil: 'networkidle0',
        timeout: 30000,
      }).catch(() => {
        console.log('ナビゲーションタイムアウト - ページ内更新の可能性');
      });

      // ボタンをクリック
      await page.click('#btnNext');
      console.log('\n「次へ進む」ボタンをクリックしました');

      // ページ遷移を待つ
      await navigationPromise;
      await new Promise(resolve => setTimeout(resolve, 3000));

      console.log('\n現在のURL:', page.url());

        // 空き状況ページのHTMLとスクリーンショットを保存
        const availabilityHtml = await page.content();
        fs.writeFileSync('docs/investigation/availability-page-auto.html', availabilityHtml);
        await page.screenshot({ path: 'docs/investigation/availability-page-auto.png', fullPage: true });

        console.log('\n✅ 空き状況ページの情報を保存しました');

        // ページ構造を解析
        const structure = await page.evaluate(() => {
          // すべてのテーブル
          const tables = Array.from(document.querySelectorAll('table'));
          const tableInfo = tables.map((table, index) => {
            const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent?.trim());
            const firstRowCells = Array.from(table.querySelectorAll('tbody tr:first-child td')).map(td =>
              td.textContent?.trim().substring(0, 30)
            );
            return {
              index,
              id: table.id,
              className: table.className,
              headers: headers.slice(0, 20),
              firstRowCells: firstRowCells.slice(0, 20),
              rowCount: table.querySelectorAll('tbody tr').length,
            };
          });

          // 日付選択要素
          const dateSelectors = Array.from(document.querySelectorAll('select, input[type="date"], [class*="date"], [id*="date"]'))
            .slice(0, 20)
            .map(el => ({
              tag: el.tagName,
              type: (el as HTMLInputElement).type,
              id: el.id,
              name: (el as HTMLInputElement).name,
              className: el.className,
              value: (el as HTMLInputElement).value,
            }));

          // カレンダーセル
          const calendarCells = Array.from(document.querySelectorAll('td[onclick], td[data-date]'))
            .slice(0, 20)
            .map(el => ({
              className: el.className,
              dataDate: el.getAttribute('data-date'),
              onclick: el.getAttribute('onclick')?.substring(0, 100),
              text: el.textContent?.trim(),
            }));

          return {
            tableCount: tables.length,
            tables: tableInfo,
            dateSelectors,
            calendarCells,
          };
        });

      console.log('\n📋 ページ構造:');
      console.log(JSON.stringify(structure, null, 2));

    } else {
      console.log('\n❌ 「次へ進む」ボタンが見つかりませんでした');
    }

    console.log('\n⏳ 30秒間ブラウザを開いたままにします（確認できます）...');
    await new Promise(resolve => setTimeout(resolve, 30000));

  } catch (error) {
    console.error('\n❌ エラー:', error);
    console.log('⏳ 30秒待機します...');
    await new Promise(resolve => setTimeout(resolve, 30000));
  } finally {
    await browser.close();
    console.log('\n✅ 調査完了');
  }
}

autoInvestigateAvailability();
