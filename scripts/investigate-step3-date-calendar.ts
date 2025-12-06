import puppeteer from 'puppeteer';
import { writeFile } from 'fs/promises';

/**
 * Step 3: 施設別空き状況ページ (WgR_ShisetsubetsuAkiJoukyou) の調査
 *
 * このページで日付を選択する必要がある
 */
async function investigateStep3() {
  console.log('🔍 Step 3: 施設別空き状況ページを調査します...\n');

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

    // Step 1: 検索ページ
    console.log('Step 1: 検索ページへアクセス...');
    await page.goto('https://www.11489.jp/Umi/web/Home/WgR_ModeSelect', {
      waitUntil: 'networkidle0',
    });

    // Step 2a: 屋内スポーツを選択
    console.log('Step 2a: 屋内スポーツを選択...');
    await page.evaluate(() => {
      const radio = document.querySelector('#radioPurposeLarge02') as HTMLInputElement;
      if (radio) {
        radio.checked = true;
        radio.click();
      }
    });

    await page.waitForSelector('#checkPurposeMiddle505', { timeout: 10000 });
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Step 2b: バスケットボールを選択
    console.log('Step 2b: バスケットボールを選択...');
    await page.evaluate(() => {
      const checkbox505 = document.querySelector('#checkPurposeMiddle505') as HTMLInputElement;
      const checkbox510 = document.querySelector('#checkPurposeMiddle510') as HTMLInputElement;

      if (checkbox505 && checkbox510) {
        checkbox505.checked = true;
        checkbox510.checked = true;
      }
    });

    // Step 2c: 検索
    console.log('Step 2c: 検索ボタンをクリック...');
    await page.evaluate(() => {
      const btn = document.querySelector('#btnSearchViaPurpose') as HTMLElement;
      if (btn) {
        btn.click();
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 3000));
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});

    console.log('✅ 施設検索ページへ遷移しました');
    console.log('現在のURL:', page.url());

    // Step 3a: すべての施設を選択
    console.log('\nStep 3a: すべての施設を選択...');

    // まず「さらに読み込む」ボタンがあるか確認
    const loadMoreExists = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const loadMoreBtn = buttons.find((btn) => btn.textContent?.includes('さらに読み込む'));
      return !!loadMoreBtn;
    });

    if (loadMoreExists) {
      console.log('「さらに読み込む」ボタンをクリック...');
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const loadMoreBtn = buttons.find((btn) => btn.textContent?.includes('さらに読み込む'));
        if (loadMoreBtn) {
          loadMoreBtn.click();
        }
      });
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // すべての施設のチェックボックスを選択
    // まずlabelをクリックする方法を試す
    const selectionResult = await page.evaluate(() => {
      const checkboxes = Array.from(
        document.querySelectorAll('.shisetsu input[type="checkbox"][name="checkShisetsu"]')
      ) as HTMLInputElement[];

      checkboxes.forEach((checkbox) => {
        // labelをクリック
        const label = document.querySelector(`label[for="${checkbox.id}"]`) as HTMLElement;
        if (label) {
          label.click();
        } else {
          // labelがない場合はcheckbox自体をクリック
          checkbox.click();
        }
      });

      // 少し待機してから選択状態を確認
      return new Promise<any>((resolve) => {
        setTimeout(() => {
          const checkedCount = checkboxes.filter((cb) => cb.checked).length;

          resolve({
            total: checkboxes.length,
            checked: checkedCount,
            ids: checkboxes.map((cb) => ({ id: cb.id, checked: cb.checked })),
          });
        }, 500);
      });
    });

    console.log(`施設チェックボックス選択結果:`);
    console.log(`  総数: ${selectionResult.total}`);
    console.log(`  選択済み: ${selectionResult.checked}`);
    console.log(`  詳細:`, selectionResult.ids);

    if (selectionResult.checked === 0) {
      console.error('⚠️ チェックボックスが選択されていません！');
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Step 3b: 「次へ進む」をクリック
    console.log('Step 3b: 「次へ進む」ボタンをクリック...');

    await page.click('.navbar .next > a');

    // ページ遷移を待機
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(() => {});

    console.log('✅ 施設別空き状況ページへ遷移しました');
    console.log('現在のURL:', page.url());

    // Step 4: 施設別空き状況ページの構造を調査
    console.log('\n📋 施設別空き状況ページの構造を調査...\n');

    const pageInfo = await page.evaluate(() => {
      // カレンダー要素
      const calendars = Array.from(document.querySelectorAll('.item .calendar'));

      const calendarData = calendars.slice(0, 2).map((calendar, index) => {
        // 施設名
        const facilityName = calendar.closest('.item')?.querySelector('h3')?.textContent?.trim() || '';

        // 日付セル
        const dateCells = Array.from(calendar.querySelectorAll('input[type="checkbox"][name="checkdate"]')).map((input) => {
          const checkbox = input as HTMLInputElement;
          const label = checkbox.nextElementSibling;

          return {
            value: checkbox.value,
            id: checkbox.id,
            name: checkbox.name,
            labelText: label?.textContent?.trim() || '',
            disabled: checkbox.disabled,
          };
        });

        return {
          facilityName,
          dateCellsCount: dateCells.length,
          dateCells: dateCells.slice(0, 15), // 最初の15件のみ
        };
      });

      // 「次へ進む」ボタン
      const nextButton = document.querySelector('.navbar .next > a');

      return {
        url: window.location.href,
        calendarsCount: calendars.length,
        calendarData,
        nextButton: {
          exists: !!nextButton,
          text: nextButton?.textContent?.trim(),
          href: nextButton?.getAttribute('href'),
        },
      };
    });

    console.log('施設別空き状況ページ情報:');
    console.log(JSON.stringify(pageInfo, null, 2));

    // HTMLを保存
    console.log('\n💾 HTMLとスクリーンショットを保存...');
    const html = await page.content();
    await writeFile('step3-facility-date-calendar.html', html);
    console.log('✅ step3-facility-date-calendar.html に保存しました');

    await page.screenshot({ path: 'step3-facility-date-calendar.png', fullPage: true });
    console.log('✅ step3-facility-date-calendar.png に保存しました');

    // 日付選択のパターンをテスト
    console.log('\n🧪 日付選択のテストを実行...');

    const testResult = await page.evaluate(() => {
      // 最初の施設の最初の日付セルを選択
      const firstDateCheckbox = document.querySelector(
        'input[type="checkbox"][name="checkdate"]'
      ) as HTMLInputElement;

      if (!firstDateCheckbox) {
        return { success: false, error: '日付チェックボックスが見つかりません' };
      }

      if (firstDateCheckbox.disabled) {
        return { success: false, error: '日付チェックボックスが無効です' };
      }

      firstDateCheckbox.checked = true;
      firstDateCheckbox.click();

      return {
        success: true,
        value: firstDateCheckbox.value,
        checked: firstDateCheckbox.checked,
      };
    });

    console.log('日付選択テスト結果:');
    console.log(JSON.stringify(testResult, null, 2));

    console.log('\n✅ 調査完了！');
    console.log('60秒後にブラウザを閉じます...');
    await new Promise((resolve) => setTimeout(resolve, 60000));
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  } finally {
    await browser.close();
  }
}

investigateStep3();
