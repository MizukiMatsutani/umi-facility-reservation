import puppeteer from 'puppeteer';
import fs from 'fs';

async function investigateAvailabilityPage() {
  console.log('📍 空き状況ページの構造を調査します\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 800 },
  });

  try {
    const page = await browser.newPage();

    console.log('Step 1: 施設一覧ページまで移動');
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

    // 屋内スポーツを選択
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

    // バスケットボールを選択
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

    // 検索
    const navigationPromise = page.waitForNavigation({
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    await page.evaluate(() => {
      if (typeof (window as any).searchMokuteki === 'function') {
        (window as any).searchMokuteki();
      }
    });

    await navigationPromise;

    console.log('\nStep 2: 施設一覧ページに到達');
    console.log('URL:', page.url());

    // 施設一覧を取得
    const facilities = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      return rows.slice(0, 3).map((row, index) => {
        const checkbox = row.querySelector('input[type="checkbox"]') as HTMLInputElement;
        const nameCell = row.querySelector('td:nth-child(2)');
        return {
          index,
          id: checkbox?.value || '',
          name: nameCell?.textContent?.trim() || '',
          checkboxExists: !!checkbox,
        };
      });
    });

    console.log('\n最初の3施設:', JSON.stringify(facilities, null, 2));

    if (facilities.length === 0) {
      console.error('❌ 施設が見つかりません');
      console.log('⏳ 30秒待機します...');
      await new Promise(resolve => setTimeout(resolve, 30000));
      return;
    }

    console.log('\nStep 3: 最初の施設を選択して空き状況を表示');

    // 最初の施設のチェックボックスを選択
    const firstFacilityId = facilities[0].id;
    console.log(`施設ID: ${firstFacilityId} を選択`);

    await page.evaluate((id) => {
      const checkbox = document.querySelector(`input[type="checkbox"][value="${id}"]`) as HTMLInputElement;
      if (checkbox) {
        checkbox.checked = true;
        checkbox.click();
      }
    }, firstFacilityId);

    await new Promise(resolve => setTimeout(resolve, 500));

    // 「選択した施設を表示」ボタンを探す
    const buttonInfo = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('input[type="button"], button'));
      return buttons.map(btn => ({
        text: (btn as HTMLInputElement).value || btn.textContent?.trim(),
        id: btn.id,
        className: btn.className,
        onclick: btn.getAttribute('onclick'),
      }));
    });

    console.log('\nページ内のボタン:', JSON.stringify(buttonInfo, null, 2));

    // 空き状況を表示するボタンを探してクリック
    const showAvailabilityButton = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('input[type="button"], button'));
      for (const btn of buttons) {
        const text = (btn as HTMLInputElement).value || btn.textContent?.trim() || '';
        if (text.includes('空き') || text.includes('表示') || text.includes('検索') || text.includes('次へ')) {
          return {
            text,
            id: btn.id,
            onclick: btn.getAttribute('onclick'),
          };
        }
      }
      return null;
    });

    console.log('\n空き状況表示ボタン:', showAvailabilityButton);

    if (showAvailabilityButton?.onclick) {
      console.log('\nボタンをクリックします...');

      const navPromise = page.waitForNavigation({
        waitUntil: 'networkidle0',
        timeout: 30000,
      }).catch(() => console.log('ナビゲーションなし（同じページ内で更新）'));

      await page.evaluate((onclick) => {
        eval(onclick);
      }, showAvailabilityButton.onclick);

      await navPromise;

      console.log('\nクリック後のURL:', page.url());

      // ページの内容を保存
      const html = await page.content();
      fs.writeFileSync('docs/investigation/availability-page.html', html);

      await page.screenshot({ path: 'docs/investigation/availability-page.png', fullPage: true });

      console.log('\nHTMLとスクリーンショットを保存しました');

      // ページ構造を解析
      const pageStructure = await page.evaluate(() => {
        // テーブルを探す
        const tables = Array.from(document.querySelectorAll('table'));
        const tableInfo = tables.map((table, index) => {
          const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent?.trim());
          const rows = table.querySelectorAll('tbody tr').length;
          return {
            index,
            id: table.id,
            className: table.className,
            headers: headers.slice(0, 10),
            rowCount: rows,
          };
        });

        // カレンダーっぽい要素を探す
        const dateElements = Array.from(document.querySelectorAll('[data-date], .date, .calendar, td[onclick*="date"]'));
        const dateInfo = dateElements.slice(0, 10).map(el => ({
          tag: el.tagName,
          className: el.className,
          id: el.id,
          dataDate: el.getAttribute('data-date'),
          text: el.textContent?.trim().substring(0, 50),
          onclick: el.getAttribute('onclick'),
        }));

        // 時間帯っぽい要素を探す
        const timeElements = Array.from(document.querySelectorAll('[data-time], .time, .timeslot'));
        const timeInfo = timeElements.slice(0, 10).map(el => ({
          tag: el.tagName,
          className: el.className,
          text: el.textContent?.trim().substring(0, 50),
        }));

        return {
          tableCount: tables.length,
          tables: tableInfo,
          dateElements: dateInfo.length,
          dates: dateInfo,
          timeElements: timeInfo.length,
          times: timeInfo,
        };
      });

      console.log('\nページ構造:');
      console.log(JSON.stringify(pageStructure, null, 2));

      console.log('\n⏳ 60秒待機します（ページを確認できます）...');
      await new Promise(resolve => setTimeout(resolve, 60000));
    } else {
      console.error('❌ 空き状況表示ボタンが見つかりません');
      console.log('⏳ 30秒待機します...');
      await new Promise(resolve => setTimeout(resolve, 30000));
    }

  } catch (error) {
    console.error('\n❌ エラー:', error);
    console.log('⏳ 30秒待機します...');
    await new Promise(resolve => setTimeout(resolve, 30000));
  } finally {
    await browser.close();
    console.log('\n✅ 調査完了');
  }
}

investigateAvailabilityPage();
