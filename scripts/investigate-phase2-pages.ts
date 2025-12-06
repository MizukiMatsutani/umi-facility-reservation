/**
 * Phase 2ページ（日付選択、空き状況）の調査スクリプト
 */

import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'https://www.11489.jp/Umi/web/Home/WgR_ModeSelect';
const OUTPUT_DIR = path.join(__dirname, '../docs/investigation');

async function investigatePhase2Pages() {
  const browser = await puppeteer.launch({
    headless: false, // 目視確認のため非ヘッドレス
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // ページのログを出力
  page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));

  try {
    console.log('📍 Step 1: 初期ページにアクセス');
    await page.goto(BASE_URL, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    console.log('📍 Step 2: 屋内スポーツを選択');
    await page.evaluate(() => {
      const radio = document.querySelector('#radioPurposeLarge02') as HTMLInputElement;
      if (radio) {
        radio.checked = true;
        radio.click();
      }
    });

    // AJAX完了を待機
    await page.waitForSelector('#checkPurposeMiddle505', { timeout: 15000 });
    await page.waitForFunction(() => {
      const checkbox = document.querySelector('#checkPurposeMiddle505');
      const parent = checkbox?.parentElement;
      return parent && window.getComputedStyle(parent).display !== 'none';
    }, { timeout: 15000 });

    console.log('📍 Step 3: バスケットボールを選択');
    await page.evaluate(() => {
      const label505 = document.querySelector('label[for="checkPurposeMiddle505"]') as HTMLElement;
      const label510 = document.querySelector('label[for="checkPurposeMiddle510"]') as HTMLElement;
      if (label505 && label510) {
        label505.click();
        label510.click();
      }
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('📍 Step 4: 検索ボタンをクリック');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }),
      page.evaluate(() => {
        (window as any).searchMokuteki();
      }),
    ]);

    console.log('✅ 施設一覧ページに到着');

    // 施設一覧ページのスクリーンショット
    await page.screenshot({
      path: path.join(OUTPUT_DIR, 'phase2-facility-list.png'),
      fullPage: true,
    });

    console.log('📍 Step 5: 施設を選択');
    // 最初の施設（宇美勤労者体育センター）を選択
    await page.evaluate(() => {
      const checkbox = document.querySelector('#checkShisetsu341007') as HTMLInputElement;
      if (checkbox) {
        checkbox.checked = true;
        checkbox.click();
      }
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    // 次へ進むボタンのスクリーンショット
    await page.screenshot({
      path: path.join(OUTPUT_DIR, 'phase2-before-next.png'),
      fullPage: true,
    });

    console.log('📍 Step 6: 「次へ進む」ボタンをクリック');

    // ボタンの存在と状態を確認
    const nextButtonInfo = await page.evaluate(() => {
      const link = document.querySelector('#btnNext') as HTMLAnchorElement;
      return {
        exists: !!link,
        href: link?.href || '',
        text: link?.textContent?.trim() || '',
        visible: link ? window.getComputedStyle(link).display !== 'none' : false,
      };
    });
    console.log('次へボタン情報:', nextButtonInfo);

    // ページ遷移を待機してクリック
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }),
      page.click('#btnNext'),
    ]);

    console.log('✅ 日付選択ページに到着');

    // 現在のURLを表示
    console.log('現在のURL:', page.url());

    // 日付選択ページのHTML を保存
    const datePageHtml = await page.content();
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'phase2-date-selection-page.html'),
      datePageHtml
    );

    // スクリーンショット
    await page.screenshot({
      path: path.join(OUTPUT_DIR, 'phase2-date-selection.png'),
      fullPage: true,
    });

    // カレンダーUIの構造を解析
    const calendarInfo = await page.evaluate(() => {
      // カレンダー関連の要素を探す
      const calendar = document.querySelector('.ui-datepicker') ||
                      document.querySelector('[id*="calendar"]') ||
                      document.querySelector('[class*="calendar"]') ||
                      document.querySelector('table.ui-datepicker-calendar');

      const dateCells = Array.from(document.querySelectorAll('td[data-date], td.ui-datepicker-day, td[onclick*="date"]'));

      return {
        calendarExists: !!calendar,
        calendarHTML: calendar?.outerHTML?.substring(0, 500) || 'カレンダー要素が見つかりません',
        dateCellsCount: dateCells.length,
        sampleDateCells: dateCells.slice(0, 5).map((cell) => ({
          html: cell.outerHTML,
          dataDate: cell.getAttribute('data-date'),
          onclick: cell.getAttribute('onclick'),
        })),
      };
    });
    console.log('\n📊 カレンダーUI情報:', JSON.stringify(calendarInfo, null, 2));

    console.log('\n⏳ 20秒待機します（手動で日付を選択できます）...');
    await new Promise(resolve => setTimeout(resolve, 20000));

    // 現在のURLとページ状態を再確認
    console.log('\n📊 20秒後の状態:');
    console.log('URL:', page.url());

    const finalHtml = await page.content();
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'phase2-after-wait.html'),
      finalHtml
    );

    await page.screenshot({
      path: path.join(OUTPUT_DIR, 'phase2-after-wait.png'),
      fullPage: true,
    });

    console.log('\n✅ すべて完了');

  } catch (error) {
    console.error('❌ エラー:', error);

    // エラー時もスクリーンショットを保存
    try {
      await page.screenshot({
        path: path.join(OUTPUT_DIR, 'phase2-error.png'),
        fullPage: true,
      });
    } catch (screenshotError) {
      console.error('スクリーンショット保存失敗:', screenshotError);
    }
  } finally {
    console.log('\n⏳ 30秒後にブラウザを閉じます（確認用）...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    await browser.close();
  }
}

investigatePhase2Pages().catch(console.error);
