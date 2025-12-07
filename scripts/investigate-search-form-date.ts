import puppeteer from 'puppeteer';
import { writeFile } from 'fs/promises';

async function investigateSearchFormDate() {
  console.log('🔍 検索フォームの日付入力フィールドを調査します...\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 800 },
  });

  try {
    const page = await browser.newPage();

    // 1. 初期ページにアクセス
    console.log('1️⃣ 初期ページにアクセス...');
    await page.goto('https://www.11489.jp/Umi/web/Home/WgR_ModeSelect', {
      waitUntil: 'networkidle0',
      timeout: 10000,
    });

    // 2. 日付入力フィールドを探す
    console.log('\n2️⃣ 日付入力フィールドを調査...');

    const dateFields = await page.evaluate(() => {
      // すべてのinput要素を取得
      const inputs = Array.from(document.querySelectorAll('input'));

      // 日付関連のinput要素を抽出
      const dateInputs = inputs.filter(input => {
        const type = input.type;
        const id = input.id;
        const name = input.name;
        const className = input.className;

        // 日付に関連しそうな要素
        return (
          type === 'date' ||
          type === 'text' && (
            id?.toLowerCase().includes('date') ||
            id?.toLowerCase().includes('day') ||
            id?.toLowerCase().includes('ymd') ||
            name?.toLowerCase().includes('date') ||
            name?.toLowerCase().includes('day') ||
            className?.toLowerCase().includes('date') ||
            className?.toLowerCase().includes('calendar')
          )
        );
      });

      return dateInputs.map(input => ({
        id: input.id,
        name: input.name,
        type: input.type,
        className: input.className,
        value: input.value,
        placeholder: input.placeholder,
      }));
    });

    console.log('日付入力フィールド候補:');
    console.log(JSON.stringify(dateFields, null, 2));

    // 3. フォーム全体を調査
    console.log('\n3️⃣ フォーム全体を調査...');

    const formInfo = await page.evaluate(() => {
      const form = document.querySelector('#form1');
      if (!form) return null;

      // すべてのinput要素
      const inputs = Array.from(form.querySelectorAll('input')).map(input => ({
        id: input.id,
        name: input.name,
        type: input.type,
        value: input.value,
        className: input.className,
      }));

      return {
        action: (form as HTMLFormElement).action,
        method: (form as HTMLFormElement).method,
        inputs,
      };
    });

    console.log('フォーム情報:');
    console.log(JSON.stringify(formInfo, null, 2));

    // 4. ページHTMLを保存
    console.log('\n4️⃣ ページHTMLを保存...');
    const html = await page.content();
    await writeFile('search-form-initial.html', html);
    console.log('✅ search-form-initial.html に保存しました');

    // 5. スクリーンショット
    console.log('\n5️⃣ スクリーンショットを撮影...');
    await page.screenshot({ path: 'search-form-initial.png', fullPage: true });
    console.log('✅ search-form-initial.png に保存しました');

    // 6. 屋内スポーツを選択後のフォームを確認
    console.log('\n6️⃣ 屋内スポーツ選択後のフォームを確認...');

    await page.evaluate(() => {
      const radio = document.querySelector('#radioPurposeLarge02') as HTMLInputElement;
      if (radio) {
        radio.checked = true;
        radio.click();
      }
    });

    // AJAXが完了するまで待機
    await page.waitForSelector('#checkPurposeMiddle505', { timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 2000));

    const dateFieldsAfter = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));

      const dateInputs = inputs.filter(input => {
        const type = input.type;
        const id = input.id;
        const name = input.name;

        return (
          type === 'date' ||
          type === 'text' && (
            id?.toLowerCase().includes('date') ||
            id?.toLowerCase().includes('day') ||
            id?.toLowerCase().includes('ymd') ||
            name?.toLowerCase().includes('date') ||
            name?.toLowerCase().includes('day')
          )
        );
      });

      return dateInputs.map(input => ({
        id: input.id,
        name: input.name,
        type: input.type,
        value: input.value,
        placeholder: input.placeholder,
        visible: (input as HTMLElement).offsetParent !== null,
      }));
    });

    console.log('屋内スポーツ選択後の日付入力フィールド:');
    console.log(JSON.stringify(dateFieldsAfter, null, 2));

    // HTMLを保存
    const htmlAfter = await page.content();
    await writeFile('search-form-after-sports.html', htmlAfter);
    console.log('✅ search-form-after-sports.html に保存しました');

    await page.screenshot({ path: 'search-form-after-sports.png', fullPage: true });
    console.log('✅ search-form-after-sports.png に保存しました');

    console.log('\n✅ 調査完了！');
    console.log('30秒後にブラウザを閉じます...');
    await new Promise(resolve => setTimeout(resolve, 30000));

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  } finally {
    await browser.close();
  }
}

investigateSearchFormDate();
