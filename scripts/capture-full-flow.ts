import puppeteer, { Page } from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

interface CapturedRequest {
  url: string;
  method: string;
  postData: any;
  headers: any;
}

interface CapturedStep {
  stepNumber: number;
  stepName: string;
  html: string;
  postRequest?: CapturedRequest;
  url: string;
}

async function captureFullFlow() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // 保存先ディレクトリ
  const outputDir = path.join(process.cwd(), 'scripts', 'investigation', 'full-flow');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const capturedSteps: CapturedStep[] = [];
  let requestCounter = 0;

  // リクエストインターセプション設定
  await page.setRequestInterception(true);

  const capturedRequests: CapturedRequest[] = [];

  page.on('request', (request) => {
    // POSTリクエストのデータをキャプチャ
    if (request.method() === 'POST') {
      const postData = request.postData();
      const url = request.url();

      console.log(`\n📤 POSTリクエスト検出: ${url}`);

      capturedRequests.push({
        url: url,
        method: request.method(),
        postData: postData,
        headers: request.headers(),
      });
    }

    request.continue();
  });

  try {
    // ========================================
    // Step 1: モード選択ページ
    // ========================================
    console.log('\n📍 Step 1: モード選択ページへアクセス');
    await page.goto('https://www.11489.jp/Umi/web/Home/WgR_ModeSelect', {
      waitUntil: 'networkidle0',
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    let html = await page.content();
    capturedSteps.push({
      stepNumber: 1,
      stepName: 'mode_select',
      html: html,
      url: page.url(),
    });

    console.log('✅ Step 1: HTMLを保存しました');

    // ========================================
    // Step 2: バスケットボール検索
    // ========================================
    console.log('\n📍 Step 2: バスケットボール検索を実行');

    // CSRFトークン取得
    const token = await page.evaluate(() => {
      return document.querySelector<HTMLInputElement>(
        'input[name="__RequestVerificationToken"]'
      )?.value;
    });

    console.log('🔑 CSRFトークン取得完了');

    // スポーツ（屋内）を選択
    await page.evaluate(() => {
      const radio = document.querySelector('#radioPurposeLarge02') as HTMLInputElement;
      if (radio) {
        radio.checked = true;
        radio.click();
      }
    });

    console.log('⚽ スポーツ（屋内）を選択');

    // 動的コンテンツの読み込み待機
    await page.waitForSelector('#checkPurposeMiddle505', { timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // バスケットボールを選択
    await page.evaluate(() => {
      const checkbox505 = document.querySelector('#checkPurposeMiddle505') as HTMLInputElement;
      const checkbox510 = document.querySelector('#checkPurposeMiddle510') as HTMLInputElement;
      if (checkbox505) checkbox505.checked = true;
      if (checkbox510) checkbox510.checked = true;
    });

    console.log('🏀 バスケットボールを選択');

    await new Promise(resolve => setTimeout(resolve, 500));

    // リクエストカウンターをリセット
    const currentRequestCount = capturedRequests.length;

    // searchMokuteki関数を呼び出してフォーム送信
    const navigationPromise = page.waitForNavigation({
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    await page.evaluate(() => {
      if (typeof (window as any).searchMokuteki === 'function') {
        (window as any).searchMokuteki();
      } else {
        throw new Error('searchMokuteki関数が見つかりませんでした');
      }
    });

    await navigationPromise;

    // POSTリクエストデータを取得
    const step2PostRequest = capturedRequests[currentRequestCount];

    html = await page.content();
    capturedSteps.push({
      stepNumber: 2,
      stepName: 'facility_search',
      html: html,
      postRequest: step2PostRequest,
      url: page.url(),
    });

    console.log('✅ Step 2: HTMLとPOSTデータを保存しました');
    console.log(`現在のURL: ${page.url()}`);

    // ========================================
    // Step 3: 全施設を選択して施設別空き状況ページへ遷移
    // ========================================
    console.log('\n📍 Step 3: 全施設を選択');

    // チェックボックスが存在するか確認
    const checkboxCount = await page.evaluate(() => {
      return document.querySelectorAll('input[type="checkbox"][name="checkShisetsu"]').length;
    });

    console.log(`✅ ${checkboxCount}個の施設チェックボックスを検出`);

    if (checkboxCount === 0) {
      console.warn('⚠️  施設チェックボックスが見つかりません');
    } else {
      // 全施設を選択
      await page.evaluate(() => {
        const checkboxes = document.querySelectorAll<HTMLInputElement>(
          'input[type="checkbox"][name="checkShisetsu"]'
        );
        checkboxes.forEach((checkbox) => {
          checkbox.checked = true;
        });
      });

      console.log('✅ 全施設を選択しました');

      await new Promise(resolve => setTimeout(resolve, 500));

      const currentRequestCount2 = capturedRequests.length;

      // 次へボタンをクリック
      const navigationPromise2 = page.waitForNavigation({
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      await page.evaluate(() => {
        // __EVENTTARGETを設定
        const eventTargetInput = document.querySelector<HTMLInputElement>(
          'input[name="__EVENTTARGET"]'
        );
        if (eventTargetInput) {
          eventTargetInput.value = 'next';
        }

        // フォームを送信
        const form = document.querySelector('form');
        if (form) {
          form.submit();
        } else {
          throw new Error('フォームが見つかりませんでした');
        }
      });

      await navigationPromise2;

      const step3PostRequest = capturedRequests[currentRequestCount2];

      html = await page.content();
      capturedSteps.push({
        stepNumber: 3,
        stepName: 'facility_availability',
        html: html,
        postRequest: step3PostRequest,
        url: page.url(),
      });

      console.log('✅ Step 3: HTMLとPOSTデータを保存しました');
      console.log(`現在のURL: ${page.url()}`);

      // ========================================
      // Step 4: 日付を選択して時間帯別空き状況ページへ遷移
      // ========================================
      console.log('\n📍 Step 4: 日付を選択');

      // カレンダーからcheckdate チェックボックスを取得
      const dateCheckboxes = await page.evaluate(() => {
        const checkboxes = Array.from(
          document.querySelectorAll<HTMLInputElement>('input[type="checkbox"][name="checkdate"]')
        );
        return checkboxes.map((cb, index) => ({
          id: cb.id,
          value: cb.value,
          index: index,
        }));
      });

      console.log(`✅ ${dateCheckboxes.length}個の日付チェックボックスを検出`);

      if (dateCheckboxes.length > 0) {
        // 最初の日付（12/9）のチェックボックスをすべて選択
        // 各施設ごとに12/9のチェックボックスがあるため、12/9の日付を持つものをすべて選択
        const date1209Checkboxes = dateCheckboxes.filter(cb => cb.value.startsWith('20251209'));
        console.log(`🗓️  12/9の日付チェックボックス数: ${date1209Checkboxes.length}`);

        // チェックボックスを選択
        await page.evaluate((checkboxIds) => {
          checkboxIds.forEach((id) => {
            const checkbox = document.getElementById(id) as HTMLInputElement;
            if (checkbox) {
              checkbox.checked = true;
            }
          });
        }, date1209Checkboxes.map(cb => cb.id));

        console.log('✅ 12/9の日付チェックボックスをすべて選択しました');

        await new Promise(resolve => setTimeout(resolve, 500));

        const currentRequestCount3 = capturedRequests.length;

        const navigationPromise3 = page.waitForNavigation({
          waitUntil: 'networkidle0',
          timeout: 30000,
        });

        // 次へボタンをクリック（フォーム送信）
        await page.evaluate(() => {
          const eventTargetInput = document.querySelector<HTMLInputElement>(
            'input[name="__EVENTTARGET"]'
          );
          if (eventTargetInput) {
            eventTargetInput.value = 'next';
          }

          const form = document.querySelector('form');
          if (form) {
            form.submit();
          } else {
            throw new Error('フォームが見つかりませんでした');
          }
        });

        await navigationPromise3;

        const step4PostRequest = capturedRequests[currentRequestCount3];

        html = await page.content();
        capturedSteps.push({
          stepNumber: 4,
          stepName: 'timeslot_availability',
          html: html,
          postRequest: step4PostRequest,
          url: page.url(),
        });

        console.log('✅ Step 4: HTMLとPOSTデータを保存しました');
        console.log(`現在のURL: ${page.url()}`);
      } else {
        console.warn('⚠️  日付チェックボックスが見つかりません');
      }
    }

    // ========================================
    // ファイルに保存
    // ========================================
    console.log('\n💾 ファイルに保存中...');

    capturedSteps.forEach((step) => {
      // HTMLを保存
      const htmlPath = path.join(outputDir, `step${step.stepNumber}_${step.stepName}.html`);
      fs.writeFileSync(htmlPath, step.html, 'utf-8');
      console.log(`✅ ${htmlPath} を保存`);

      // POSTデータを保存
      if (step.postRequest) {
        const postDataPath = path.join(outputDir, `step${step.stepNumber}_${step.stepName}_post.json`);

        // POSTデータをパース
        let parsedPostData: any = {};
        if (step.postRequest.postData) {
          const params = new URLSearchParams(step.postRequest.postData);
          params.forEach((value, key) => {
            if (parsedPostData[key]) {
              // 既存のキーがある場合は配列に変換
              if (Array.isArray(parsedPostData[key])) {
                parsedPostData[key].push(value);
              } else {
                parsedPostData[key] = [parsedPostData[key], value];
              }
            } else {
              parsedPostData[key] = value;
            }
          });
        }

        const postDataJson = {
          url: step.postRequest.url,
          method: step.postRequest.method,
          headers: step.postRequest.headers,
          postData: parsedPostData,
        };

        fs.writeFileSync(postDataPath, JSON.stringify(postDataJson, null, 2), 'utf-8');
        console.log(`✅ ${postDataPath} を保存`);
      }

      // URLを保存
      const urlPath = path.join(outputDir, `step${step.stepNumber}_${step.stepName}_url.txt`);
      fs.writeFileSync(urlPath, step.url, 'utf-8');
      console.log(`✅ ${urlPath} を保存`);
    });

    // 全体のサマリーを保存
    const summaryPath = path.join(outputDir, 'summary.json');
    const summary = {
      totalSteps: capturedSteps.length,
      steps: capturedSteps.map((step) => ({
        stepNumber: step.stepNumber,
        stepName: step.stepName,
        url: step.url,
        hasPostData: !!step.postRequest,
      })),
    };
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf-8');
    console.log(`✅ ${summaryPath} を保存`);

    console.log('\n✅ すべてのデータをキャプチャしました！');
    console.log(`📂 保存先: ${outputDir}`);

    console.log('\n⏸️  ブラウザを開いたままにします。確認後、Ctrl+Cで終了してください。');
    await new Promise(() => {}); // 無限待機

  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    // await browser.close();
  }
}

captureFullFlow();
