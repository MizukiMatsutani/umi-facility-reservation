import puppeteer from 'puppeteer';

async function testCheckboxFix() {
  console.log('🧪 チェックボックス修正のテスト開始\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 800 },
  });

  try {
    const page = await browser.newPage();

    console.log('📍 Step 1: 初期ページにアクセス');
    await page.goto('https://www.11489.jp/Umi/web/Home/WgR_ModeSelect', {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    console.log('\n📍 Step 2: 屋内スポーツを選択');
    await page.evaluate(() => {
      const radio = document.querySelector('#radioPurposeLarge02') as HTMLInputElement;
      if (radio) {
        radio.checked = true;
        radio.click();
      }
    });

    // AJAX完了を待機
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

    console.log('\n📍 Step 3: バスケットボールを選択（.checked プロパティを直接設定）');

    const beforeState = await page.evaluate(() => {
      const checkbox505 = document.querySelector('#checkPurposeMiddle505') as HTMLInputElement;
      const checkbox510 = document.querySelector('#checkPurposeMiddle510') as HTMLInputElement;
      return {
        basketball: { exists: !!checkbox505, checked: checkbox505?.checked, value: checkbox505?.value },
        miniBasketball: { exists: !!checkbox510, checked: checkbox510?.checked, value: checkbox510?.value },
      };
    });
    console.log('選択前の状態:', JSON.stringify(beforeState, null, 2));

    // 修正版: .checked を直接設定
    await page.evaluate(() => {
      const checkbox505 = document.querySelector('#checkPurposeMiddle505') as HTMLInputElement;
      const checkbox510 = document.querySelector('#checkPurposeMiddle510') as HTMLInputElement;

      if (!checkbox505 || !checkbox510) {
        throw new Error('チェックボックスが見つかりません');
      }

      // .checked プロパティを直接設定
      checkbox505.checked = true;
      checkbox510.checked = true;

      // イベントを発火
      const changeEvent = new Event('change', { bubbles: true });
      checkbox505.dispatchEvent(changeEvent);
      checkbox510.dispatchEvent(changeEvent);

      const clickEvent = new Event('click', { bubbles: true });
      checkbox505.dispatchEvent(clickEvent);
      checkbox510.dispatchEvent(clickEvent);
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    const afterState = await page.evaluate(() => {
      const checkbox505 = document.querySelector('#checkPurposeMiddle505') as HTMLInputElement;
      const checkbox510 = document.querySelector('#checkPurposeMiddle510') as HTMLInputElement;

      // すべてのチェックされたチェックボックスを確認
      const allChecked = Array.from(document.querySelectorAll('input[name="checkPurposeMiddle"]:checked'))
        .map((cb: any) => ({ value: cb.value, id: cb.id }));

      return {
        basketball: { checked: checkbox505?.checked },
        miniBasketball: { checked: checkbox510?.checked },
        allChecked,
      };
    });
    console.log('\n選択後の状態:', JSON.stringify(afterState, null, 2));

    if (!afterState.basketball.checked || !afterState.miniBasketball.checked) {
      console.error('\n❌ チェックボックスの選択に失敗しました！');
      console.log('⏳ 20秒待機します（ブラウザで確認できます）...');
      await new Promise(resolve => setTimeout(resolve, 20000));
      process.exit(1);
    }

    console.log('\n✅ チェックボックスが正しく選択されました！');

    console.log('\n📍 Step 4: 検索ボタンをクリック');

    // searchMokuteki()を呼び出す前の状態を確認
    const validationState = await page.evaluate(() => {
      const middleList = document.getElementsByName('checkPurposeMiddle');
      const checkedValues: string[] = [];
      for (let i = 0; i < middleList.length; i++) {
        if ((middleList[i] as HTMLInputElement).checked) {
          checkedValues.push((middleList[i] as HTMLInputElement).value);
        }
      }
      return {
        radioSelected: (document.querySelector('input[name="radioPurposeLarge"]:checked') as HTMLInputElement)?.value,
        checkboxCount: checkedValues.length,
        checkboxValues: checkedValues,
      };
    });
    console.log('バリデーション状態:', JSON.stringify(validationState, null, 2));

    if (validationState.checkboxCount === 0) {
      console.error('\n❌ searchMokuteki()を呼び出す前にチェックボックスが未選択です！');
      console.log('⏳ 20秒待機します（ブラウザで確認できます）...');
      await new Promise(resolve => setTimeout(resolve, 20000));
      process.exit(1);
    }

    // ページ遷移の待機をセットアップ
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

    const currentUrl = page.url();
    console.log('\n現在のURL:', currentUrl);

    if (currentUrl.includes('#failure')) {
      console.error('\n❌ 検索に失敗しました（#failure が含まれています）');

      const errorDialog = await page.evaluate(() => {
        const dlg = document.querySelector('#messageDlg');
        if (dlg && window.getComputedStyle(dlg).display !== 'none') {
          const title = dlg.querySelector('.ui-dialog-title')?.textContent || '';
          const message = dlg.querySelector('div p')?.textContent || '';
          return { title, message };
        }
        return null;
      });

      if (errorDialog) {
        console.error('❌ エラーダイアログ:', errorDialog);
      }

      console.log('⏳ 20秒待機します（ブラウザで確認できます）...');
      await new Promise(resolve => setTimeout(resolve, 20000));
      process.exit(1);
    }

    console.log('\n✅ 検索に成功しました！');
    console.log('⏳ 20秒待機します（結果を確認できます）...');
    await new Promise(resolve => setTimeout(resolve, 20000));

  } catch (error) {
    console.error('\n❌ エラー:', error);
    console.log('⏳ 20秒待機します（ブラウザで確認できます）...');
    await new Promise(resolve => setTimeout(resolve, 20000));
    process.exit(1);
  } finally {
    await browser.close();
    console.log('\n✅ テスト完了');
  }
}

testCheckboxFix();
