/**
 * Step 1-2のAPI化実証テスト
 * ANALYSIS.mdの調査結果を基に、UI操作なしで施設検索まで実行できるかテスト
 */

import * as cheerio from 'cheerio';

const BASE_URL = 'https://www.11489.jp/Umi/web';

async function testDirectApiApproach() {
  console.log('🔬 Step 1-2のAPI化検証テスト開始\n');

  try {
    // ============================================
    // Step 1: CSRFトークン取得（GET）
    // ============================================
    console.log('📍 Step 1: CSRFトークン取得（API）');
    const step1Response = await fetch(`${BASE_URL}/Home/WgR_ModeSelect`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });

    if (!step1Response.ok) {
      throw new Error(`Step 1失敗: ${step1Response.status}`);
    }

    const step1Html = await step1Response.text();
    console.log(`  ✓ ページ取得成功: ${step1Html.length} bytes`);

    // CSRFトークン抽出
    const $1 = cheerio.load(step1Html);
    const token1 = $1('input[name="__RequestVerificationToken"]').val() as string;

    if (!token1) {
      throw new Error('CSRFトークンが見つかりません');
    }
    console.log(`  ✓ CSRFトークン取得: ${token1.substring(0, 20)}...`);

    // ============================================
    // Step 2: バスケットボール検索（POST）
    // ============================================
    console.log('\n📍 Step 2: バスケットボール検索（API）');

    // POSTパラメータを構築（ANALYSIS.mdの仕様通り）
    const formData = new URLSearchParams({
      '__RequestVerificationToken': token1,
      '__EVENTTARGET': 'btnSearchViaPurpose',
      '__EVENTARGUMENT': '',
      'radioPurposeLarge': '02',  // スポーツ屋内
      'checkPurposeMiddle': '505', // バスケットボール
      'radioShisetsuLarge': '01',
      'shisetsuNameTxt': '',
    });

    // ミニバスケットボールも追加（配列として）
    formData.append('checkPurposeMiddle', '510');

    console.log('  → POSTパラメータ:');
    console.log(`     radioPurposeLarge: 02`);
    console.log(`     checkPurposeMiddle: [505, 510]`);
    console.log(`     __EVENTTARGET: btnSearchViaPurpose`);

    const step2Response = await fetch(`${BASE_URL}/Home/WgR_ModeSelect`, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': `${BASE_URL}/Home/WgR_ModeSelect`,
      },
      body: formData.toString(),
      redirect: 'follow',
    });

    if (!step2Response.ok) {
      throw new Error(`Step 2失敗: ${step2Response.status}`);
    }

    const step2Html = await step2Response.text();
    console.log(`  ✓ レスポンス取得成功: ${step2Html.length} bytes`);
    console.log(`  ✓ 最終URL: ${step2Response.url}`);

    // レスポンス解析
    const $2 = cheerio.load(step2Html);

    // 新しいCSRFトークン
    const token2 = $2('input[name="__RequestVerificationToken"]').val() as string;
    console.log(`  ✓ 新しいCSRFトークン: ${token2 ? token2.substring(0, 20) + '...' : 'なし'}`);

    // map_* フィールドの抽出
    const mapFields: Record<string, string> = {};
    $2('input[type="hidden"][name^="map_"]').each((i, el) => {
      const name = $2(el).attr('name');
      const value = $2(el).attr('value');
      if (name && value) {
        mapFields[name] = value;
      }
    });
    console.log(`  ✓ map_フィールド: ${Object.keys(mapFields).length}個検出`);

    // 施設IDの抽出
    const facilityIds: string[] = [];
    $2('input[type="checkbox"][name="checkShisetsu"]').each((i, el) => {
      const value = $2(el).attr('value');
      if (value) {
        facilityIds.push(value);
      }
    });
    console.log(`  ✓ 施設ID: ${facilityIds.length}個検出`);
    facilityIds.forEach((id, idx) => {
      console.log(`     [${idx + 1}] ${id}`);
    });

    // エラーメッセージの確認
    const errorMsg = $2('#messageDlg').text().trim();
    if (errorMsg) {
      console.log(`  ⚠️ エラーメッセージ: ${errorMsg}`);
    }

    // 成功判定
    if (facilityIds.length > 0 && Object.keys(mapFields).length > 0) {
      console.log('\n✅ Step 1-2のAPI化は実現可能！');
      console.log('   UI操作なしで施設検索まで完了しました');
      return true;
    } else {
      console.log('\n❌ Step 1-2のAPI化は困難');
      console.log('   必要なデータが取得できませんでした');
      return false;
    }

  } catch (error) {
    console.error('\n❌ テスト失敗:', error);
    return false;
  }
}

// 実行
testDirectApiApproach().then(success => {
  process.exit(success ? 0 : 1);
});
