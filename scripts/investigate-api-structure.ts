/**
 * 宇美町システムのAPI構造調査スクリプト
 *
 * 目的:
 * - 各ページ遷移で送信されるリクエストを記録
 * - POSTパラメータ、ヘッダー、Cookieを分析
 * - 直接API呼び出しが可能かを判定
 */

import puppeteer from 'puppeteer';
import { format } from 'date-fns';

interface RequestInfo {
  url: string;
  method: string;
  postData?: string;
  headers: Record<string, string>;
  resourceType: string;
}

async function investigateApiStructure() {
  console.log('🔍 宇美町システムのAPI構造を調査中...\n');

  const browser = await puppeteer.launch({
    headless: false, // ブラウザを表示して確認
    devtools: true,  // DevToolsを自動で開く
  });

  const page = await browser.newPage();
  const capturedRequests: RequestInfo[] = [];

  // すべてのリクエストをキャプチャ
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    const info: RequestInfo = {
      url: request.url(),
      method: request.method(),
      postData: request.postData(),
      headers: request.headers(),
      resourceType: request.resourceType(),
    };

    // ドメイン内のリクエストのみ記録
    if (request.url().includes('11489.jp')) {
      capturedRequests.push(info);

      // POSTリクエストは詳細をログ出力
      if (request.method() === 'POST') {
        console.log('\n📤 POST Request detected:');
        console.log('URL:', request.url());
        console.log('Post Data:', request.postData());
        console.log('Headers:', JSON.stringify(request.headers(), null, 2));
      }
    }

    request.continue();
  });

  // レスポンスもキャプチャ
  page.on('response', async (response) => {
    if (response.url().includes('11489.jp')) {
      const status = response.status();
      const contentType = response.headers()['content-type'] || '';

      if (response.request().method() === 'POST') {
        console.log('\n📥 POST Response:');
        console.log('Status:', status);
        console.log('Content-Type:', contentType);

        // JSONレスポンスの場合、内容を表示
        if (contentType.includes('application/json')) {
          try {
            const json = await response.json();
            console.log('JSON Response:', JSON.stringify(json, null, 2));
          } catch (e) {
            console.log('Failed to parse JSON');
          }
        }
      }
    }
  });

  try {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Step 1: 検索ページへアクセス
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('\n📍 Step 1: 検索ページへアクセス');
    await page.goto('https://www.11489.jp/Umi/web/Home/WgR_ModeSelect', {
      waitUntil: 'networkidle0',
    });

    // Cookieを確認
    const cookies = await page.cookies();
    console.log('\n🍪 Cookies after initial load:');
    cookies.forEach(cookie => {
      console.log(`  - ${cookie.name}: ${cookie.value}`);
    });

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Step 2: スポーツ選択
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('\n📍 Step 2: スポーツ選択（屋内スポーツ）');

    await page.evaluate(() => {
      const radio = document.querySelector('#radioPurposeLarge02') as HTMLInputElement;
      if (radio) {
        radio.checked = true;
        radio.click();
      }
    });

    await page.waitForSelector('#checkPurposeMiddle505', { timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // バスケットボールを選択
    console.log('📍 バスケットボール選択');
    await page.evaluate(() => {
      const checkbox505 = document.querySelector('#checkPurposeMiddle505') as HTMLInputElement;
      const checkbox510 = document.querySelector('#checkPurposeMiddle510') as HTMLInputElement;
      if (checkbox505) checkbox505.checked = true;
      if (checkbox510) checkbox510.checked = true;
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Step 3: 検索ボタンをクリック
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('\n📍 Step 3: 検索ボタンをクリック（重要: どんなリクエストが送信されるか）');

    const beforeSearchRequests = capturedRequests.length;

    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
      page.evaluate(() => {
        if (typeof (window as any).searchMokuteki === 'function') {
          (window as any).searchMokuteki();
        }
      }),
    ]);

    console.log(`✅ 検索完了。${capturedRequests.length - beforeSearchRequests}件の新しいリクエストを記録`);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Step 4: 全施設を選択
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('\n📍 Step 4: 全施設を選択');

    await page.waitForSelector('.shisetsu input[type="checkbox"][name="checkShisetsu"]', {
      timeout: 30000,
    });

    // 施設IDを取得
    const facilityIds = await page.evaluate(() => {
      const checkboxes = Array.from(
        document.querySelectorAll('.shisetsu input[type="checkbox"][name="checkShisetsu"]')
      ) as HTMLInputElement[];

      return checkboxes.map(cb => ({
        id: cb.value,
        name: cb.parentElement?.textContent?.trim() || '',
      }));
    });

    console.log('🏢 取得した施設ID:');
    facilityIds.forEach(f => console.log(`  - ${f.id}: ${f.name}`));

    // 全施設を選択
    await page.evaluate(() => {
      const checkboxes = Array.from(
        document.querySelectorAll('.shisetsu input[type="checkbox"][name="checkShisetsu"]')
      ) as HTMLInputElement[];

      checkboxes.forEach(cb => {
        const label = document.querySelector(`label[for="${cb.id}"]`) as HTMLElement;
        if (label) label.click();
      });
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Step 5: 施設別空き状況ページへ遷移
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('\n📍 Step 5: 施設別空き状況ページへ遷移（重要: どんなリクエストが送信されるか）');

    const beforeFacilityPageRequests = capturedRequests.length;

    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
      page.click('.navbar .next > a'),
    ]);

    console.log(`✅ 遷移完了。${capturedRequests.length - beforeFacilityPageRequests}件の新しいリクエストを記録`);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Step 6: 日付を選択
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('\n📍 Step 6: 日付を選択');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const targetDateStr = format(tomorrow, 'yyyyMMdd');

    console.log(`🎯 選択日付: ${format(tomorrow, 'yyyy-MM-dd')}`);

    // 日付のチェックボックス情報を取得
    const availableDates = await page.evaluate(() => {
      const checkboxes = Array.from(
        document.querySelectorAll('input[type="checkbox"][name="checkdate"]')
      ) as HTMLInputElement[];

      return checkboxes.map(cb => ({
        value: cb.value,
        date: cb.value.substring(0, 8),
        id: cb.id,
      }));
    });

    console.log('📅 利用可能な日付チェックボックス（最初の5件）:');
    availableDates.slice(0, 5).forEach(d => console.log(`  - ${d.date}: ${d.value}`));

    // 日付を選択
    await page.evaluate((targetDate: string) => {
      const checkboxes = Array.from(
        document.querySelectorAll('input[type="checkbox"][name="checkdate"]')
      ) as HTMLInputElement[];

      checkboxes.forEach(cb => {
        const checkboxDate = cb.value.substring(0, 8);
        if (checkboxDate === targetDate) {
          const label = document.querySelector(`label[for="${cb.id}"]`) as HTMLElement;
          if (label) {
            const status = label.textContent?.trim();
            if (status === '○' || status === '△') {
              label.click();
            }
          }
        }
      });
    }, targetDateStr);

    await new Promise(resolve => setTimeout(resolve, 500));

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Step 7: 時間帯別空き状況ページへ遷移
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('\n📍 Step 7: 時間帯別空き状況ページへ遷移（重要: これが最終データ取得）');

    const beforeTimeSlotPageRequests = capturedRequests.length;

    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
      page.click('.navbar .next > a'),
    ]);

    console.log(`✅ 遷移完了。${capturedRequests.length - beforeTimeSlotPageRequests}件の新しいリクエストを記録`);

    // 最終ページのHTMLソースを確認（AJAX呼び出しがあるか）
    const finalUrl = page.url();
    console.log('\n📄 最終ページURL:', finalUrl);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 分析結果の出力
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 API構造分析結果');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // POSTリクエストのみ抽出
    const postRequests = capturedRequests.filter(r => r.method === 'POST');

    console.log(`📤 POSTリクエスト合計: ${postRequests.length}件\n`);

    postRequests.forEach((req, index) => {
      console.log(`\n【POSTリクエスト ${index + 1}】`);
      console.log('URL:', req.url);
      console.log('Resource Type:', req.resourceType);

      if (req.postData) {
        console.log('POST Data:');
        const params = new URLSearchParams(req.postData);
        for (const [key, value] of params.entries()) {
          console.log(`  ${key}: ${value}`);
        }
      }

      // __VIEWSTATE, __EVENTVALIDATIONなどのASP.NET特有のパラメータを確認
      if (req.postData?.includes('__VIEWSTATE')) {
        console.log('⚠️  ASP.NET ViewStateを使用（セッション依存の可能性）');
      }

      if (req.postData?.includes('__EVENTVALIDATION')) {
        console.log('⚠️  ASP.NET EventValidationを使用（CSRF保護の可能性）');
      }
    });

    // 判定
    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💡 直接API呼び出しの実現可能性');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const hasViewState = postRequests.some(r => r.postData?.includes('__VIEWSTATE'));
    const hasEventValidation = postRequests.some(r => r.postData?.includes('__EVENTVALIDATION'));

    if (hasViewState || hasEventValidation) {
      console.log('❌ ASP.NET WebFormsを使用しているため、直接API呼び出しは困難です。');
      console.log('   理由:');
      console.log('   - ViewStateはサーバー側のセッション状態を含む');
      console.log('   - EventValidationはCSRF保護のため、前のページから取得する必要がある');
      console.log('   - 各リクエストは前のページの状態に依存している\n');
      console.log('✅ 推奨アプローチ: 現在の設計（Puppeteerでページ遷移）を最適化する');
    } else {
      console.log('✅ 直接API呼び出しが可能な可能性があります！');
      console.log('   次のステップ:');
      console.log('   1. 施設ID、日付などのパラメータを固定値として保持');
      console.log('   2. 最終ページへ直接POSTリクエストを送信');
      console.log('   3. HTMLをパースしてデータを取得');
    }

    console.log('\n\n⏸️  ブラウザを開いたままにします。DevToolsのNetworkタブで詳細を確認してください。');
    console.log('確認が終わったら、このスクリプトを Ctrl+C で終了してください。');

    // ブラウザを開いたまま待機
    await new Promise(() => {}); // 無限待機

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  } finally {
    // 手動で終了するまで待機
  }
}

investigateApiStructure();
