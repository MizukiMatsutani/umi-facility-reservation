import puppeteer from 'puppeteer';
import fs from 'fs';

async function manualInvestigation() {
  console.log('📍 手動調査モード - 施設一覧ページまで自動で進みます\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 800 },
  });

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

  // searchMokuteki()はAJAXベースなので、URLの変化またはページの更新を待つ
  const currentUrl = page.url();

  await page.evaluate(() => {
    if (typeof (window as any).searchMokuteki === 'function') {
      (window as any).searchMokuteki();
    }
  });

  // URLが変わるまで待機、または最大30秒待つ
  await page.waitForFunction(
    (oldUrl: string) => window.location.href !== oldUrl && !window.location.href.includes('#failure'),
    { timeout: 30000 },
    currentUrl
  ).catch(() => {
    console.log('⚠️ URL変更のタイムアウト - ページ内で結果が表示された可能性があります');
  });

  // ページが完全に読み込まれるまで待機
  await page.waitForFunction(
    () => document.readyState === 'complete',
    { timeout: 10000 }
  ).catch(() => {});

  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('\n✅ 施設一覧ページに到達しました');
  console.log('URL:', page.url());

  // ページHTMLを保存
  const html = await page.content();
  fs.writeFileSync('docs/investigation/facility-list-auto.html', html);
  await page.screenshot({ path: 'docs/investigation/facility-list-auto.png', fullPage: true });

  console.log('\n📝 施設一覧ページの情報:');

  const pageInfo = await page.evaluate(() => {
    // 施設のチェックボックスを探す
    const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
    const facilityCheckboxes = checkboxes.filter(cb => {
      const row = cb.closest('tr');
      return row && row.querySelector('td');
    }).slice(0, 3).map(cb => ({
      value: (cb as HTMLInputElement).value,
      name: (cb as HTMLInputElement).name,
      id: cb.id,
      parentText: cb.closest('tr')?.textContent?.trim().substring(0, 100),
    }));

    // すべてのボタンを探す
    const buttons = Array.from(document.querySelectorAll('input[type="button"], button'));
    const buttonInfo = buttons.map(btn => ({
      text: (btn as HTMLInputElement).value || btn.textContent?.trim(),
      id: btn.id,
      name: (btn as HTMLInputElement).name,
      className: btn.className,
      onclick: btn.getAttribute('onclick'),
    }));

    // フォームを探す
    const forms = Array.from(document.querySelectorAll('form'));
    const formInfo = forms.map(form => ({
      id: form.id,
      action: form.action,
      method: form.method,
    }));

    return {
      facilityCheckboxes,
      buttons: buttonInfo,
      forms: formInfo,
    };
  });

  console.log('\n施設チェックボックス (最初の3件):');
  console.log(JSON.stringify(pageInfo.facilityCheckboxes, null, 2));

  console.log('\nボタン:');
  console.log(JSON.stringify(pageInfo.buttons, null, 2));

  console.log('\nフォーム:');
  console.log(JSON.stringify(pageInfo.forms, null, 2));

  console.log('\n\n✋ ここから手動操作してください:');
  console.log('1. 施設のチェックボックスを1つ選択');
  console.log('2. 「次へ」または「空き状況を表示」のようなボタンをクリック');
  console.log('3. 空き状況ページが表示されたら、構造を確認');
  console.log('4. このターミナルでEnterキーを押すと、ページ情報を収集します');
  console.log('\n⏳ 手動操作を待機中...');

  // Enterキー待ち
  await new Promise<void>((resolve) => {
    process.stdin.once('data', () => {
      resolve();
    });
  });

  console.log('\n📊 空き状況ページの情報を収集します...');

  const finalUrl = page.url();
  console.log('現在のURL:', finalUrl);

  // ページHTMLを保存
  const availabilityHtml = await page.content();
  fs.writeFileSync('docs/investigation/availability-page-manual.html', availabilityHtml);
  await page.screenshot({ path: 'docs/investigation/availability-page-manual.png', fullPage: true });

  // ページ構造を解析
  const structure = await page.evaluate(() => {
    // すべてのテーブルを探す
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
        headers: headers.slice(0, 15),
        firstRowCells: firstRowCells.slice(0, 15),
        rowCount: table.querySelectorAll('tbody tr').length,
      };
    });

    // 日付選択っぽい要素
    const dateSelectors = Array.from(document.querySelectorAll('select, input[type="date"], [class*="date"], [id*="date"]'))
      .slice(0, 10)
      .map(el => ({
        tag: el.tagName,
        type: (el as HTMLInputElement).type,
        id: el.id,
        name: (el as HTMLInputElement).name,
        className: el.className,
        value: (el as HTMLInputElement).value,
      }));

    // カレンダーセル
    const calendarCells = Array.from(document.querySelectorAll('td[onclick], td[data-date], .calendar-cell'))
      .slice(0, 10)
      .map(el => ({
        tag: el.tagName,
        className: el.className,
        dataDate: el.getAttribute('data-date'),
        onclick: el.getAttribute('onclick')?.substring(0, 100),
        text: el.textContent?.trim(),
      }));

    return {
      tables: tableInfo,
      dateSelectors,
      calendarCells,
    };
  });

  console.log('\n📋 ページ構造:');
  console.log(JSON.stringify(structure, null, 2));

  console.log('\n✅ 調査完了。HTMLとスクリーンショットを保存しました。');
  console.log('Enterキーを押すとブラウザを閉じます...');

  await new Promise<void>((resolve) => {
    process.stdin.once('data', () => {
      resolve();
    });
  });

  await browser.close();
}

manualInvestigation();
