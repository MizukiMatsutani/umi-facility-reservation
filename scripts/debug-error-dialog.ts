/**
 * エラーダイアログの詳細調査
 */

import puppeteer from 'puppeteer';

async function debugErrorDialog() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (compatible; UmiFacilitySearch/1.0)');
    page.on('console', (msg) => console.log('PAGE:', msg.text()));

    console.log('📍 初期ページにアクセス');
    await page.goto('https://www.11489.jp/Umi/web/Home/WgR_ModeSelect', {
      waitUntil: 'networkidle0',
    });

    console.log('📍 屋内スポーツを選択');
    await page.evaluate(() => {
      const radio = document.querySelector('#radioPurposeLarge02') as HTMLInputElement;
      radio.checked = true;
      radio.click();
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('📍 バスケットボールを選択（labelクリック）');
    await page.evaluate(() => {
      const label505 = document.querySelector('label[for="checkPurposeMiddle505"]') as HTMLElement;
      const label510 = document.querySelector('label[for="checkPurposeMiddle510"]') as HTMLElement;
      label505.click();
      label510.click();
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    // 選択状態を確認
    const selectionState = await page.evaluate(() => {
      const checkedBoxes = Array.from(
        document.querySelectorAll('input[name="checkPurposeMiddle"]:checked')
      );
      return {
        count: checkedBoxes.length,
        values: checkedBoxes.map(cb => (cb as HTMLInputElement).value),
      };
    });
    console.log('選択状態:', selectionState);

    console.log('📍 検索ボタンをクリック');

    // クリック後、少し待ってからダイアログを確認
    await page.evaluate(() => {
      const btn = document.querySelector('#btnSearchViaPurpose') as HTMLInputElement;
      btn.click();
    });

    // ダイアログが表示されるまで待機
    await new Promise(resolve => setTimeout(resolve, 2000));

    // ダイアログの詳細を取得
    const dialogInfo = await page.evaluate(() => {
      // すべてのダイアログ要素を探す
      const messageDlg = document.querySelector('#messageDlg');

      if (messageDlg) {
        const computed = window.getComputedStyle(messageDlg);
        const title = messageDlg.querySelector('h2');
        const message = messageDlg.querySelector('div p');

        return {
          exists: true,
          display: computed.display,
          visibility: computed.visibility,
          opacity: computed.opacity,
          className: messageDlg.className,
          innerHTML: messageDlg.innerHTML.substring(0, 500),
          title: title?.textContent,
          message: message?.textContent,
          allText: messageDlg.textContent,
        };
      }

      return { exists: false };
    });

    console.log('\nダイアログ情報:', JSON.stringify(dialogInfo, null, 2));

    // remodal ライブラリのダイアログも確認
    const remodalInfo = await page.evaluate(() => {
      const remodals = Array.from(document.querySelectorAll('.remodal'));
      return remodals.map(r => ({
        className: r.className,
        display: window.getComputedStyle(r).display,
        text: r.textContent?.substring(0, 200),
      }));
    });

    console.log('\nremodal情報:', JSON.stringify(remodalInfo, null, 2));

    console.log('\n⏳ 15秒待機（ブラウザで確認）...');
    await new Promise(resolve => setTimeout(resolve, 15000));

  } catch (error) {
    console.error('❌ エラー:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

debugErrorDialog()
  .then(() => console.log('✅ 完了'))
  .catch(err => console.error('❌ 失敗:', err))
  .finally(() => process.exit(0));
