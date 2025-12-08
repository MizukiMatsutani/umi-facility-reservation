/**
 * DirectApiClient - 宇美町システムの直接API呼び出しクライアント
 *
 * 従来の7ステップフローをスキップして、直接APIエンドポイントにアクセスすることで
 * スクレイピング速度を劇的に改善します。
 *
 * 7ステップフロー（従来）:
 * 1. 検索ページ表示
 * 2. スポーツ選択
 * 3. 検索ボタン
 * 4. 施設一覧表示
 * 5. 全施設選択
 * 6. 施設別空き状況
 * 7. 日付選択 → 時間帯別データ取得
 *
 * 2ステップフロー（直接API）:
 * 1. トークン取得
 * 2. 直接データ取得（日付ごとにループ）
 */

import type { Page } from 'puppeteer-core';
import type {
  FacilityAvailability,
  Facility,
  AvailabilityData,
} from '@/lib/types';
import { format } from 'date-fns';
import { FACILITY_IDS, ENDPOINTS } from './constants';

/**
 * 直接API呼び出しのエラークラス
 */
export class DirectApiError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'DirectApiError';
  }
}

/**
 * 直接API呼び出しクライアント
 *
 * 宇美町システムのAPIに直接POSTリクエストを送信して、
 * 中間ステップをスキップします。
 */
export class DirectApiClient {
  private page: Page;
  private cachedToken: string | null = null;

  /**
   * DirectApiClientのコンストラクタ
   *
   * @param page - Puppeteer Pageオブジェクト
   */
  constructor(page: Page) {
    this.page = page;
  }

  /**
   * CSRFトークンを取得してキャッシュ
   *
   * 初回アクセス時にセッションCookieと__RequestVerificationTokenを取得します。
   * トークンは1回のスクレイピングセッション中、再利用されます。
   *
   * @returns CSRFトークン文字列
   * @throws {DirectApiError} トークン取得に失敗した場合
   */
  async fetchToken(): Promise<string> {
    // キャッシュがあれば再利用
    if (this.cachedToken) {
      return this.cachedToken;
    }

    try {
      console.log('🔑 CSRFトークンを取得中...');

      // 検索ページにアクセスしてトークンを取得
      await this.page.goto(ENDPOINTS.MODE_SELECT, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      // トークンを抽出
      const token = await this.page.evaluate(() => {
        const input = document.querySelector<HTMLInputElement>(
          'input[name="__RequestVerificationToken"]'
        );
        return input?.value ?? null;
      });

      if (!token) {
        throw new DirectApiError(
          'CSRFトークンが見つかりませんでした。ページ構造が変更された可能性があります。'
        );
      }

      this.cachedToken = token;
      console.log('✅ CSRFトークン取得完了');

      return token;
    } catch (error) {
      if (error instanceof DirectApiError) {
        throw error;
      }
      throw new DirectApiError('トークン取得中にエラーが発生しました', error);
    }
  }

  /**
   * 施設別空き状況ページへ直接POSTリクエスト送信
   *
   * 検索ページ → スポーツ選択 → 施設選択の3ステップをスキップして、
   * 直接施設カレンダーページへ遷移します。
   *
   * @param token - CSRFトークン
   * @param dates - 取得対象の日付配列
   * @throws {DirectApiError} POSTリクエストに失敗した場合
   */
  async postToFacilityCalendar(token: string, dates: Date[]): Promise<void> {
    try {
      console.log('📅 施設別空き状況ページへ直接アクセス中...');

      // checkdateパラメータを生成（施設×日付の組み合わせ）
      const checkdates: string[] = [];
      for (const date of dates) {
        const dateStr = format(date, 'yyyyMMdd');
        for (const facilityId of FACILITY_IDS) {
          // 施設IDの最後の5桁を使用（例: 341007 → 00701）
          const facilityCode = facilityId.substring(3) + '01';
          checkdates.push(`${dateStr}${facilityCode}+++0`);
        }
      }

      // POSTデータを構築
      const formData = new URLSearchParams();
      formData.append('__RequestVerificationToken', token);
      formData.append('__EVENTTARGET', 'next');
      formData.append('__EVENTARGUMENT', '');
      checkdates.forEach((checkdate) => {
        formData.append('checkdate', checkdate);
      });

      // POSTリクエストを送信
      await this.page.setRequestInterception(true);
      this.page.once('request', (interceptedRequest) => {
        interceptedRequest.continue({
          method: 'POST',
          postData: formData.toString(),
          headers: {
            ...interceptedRequest.headers(),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        });
      });

      await this.page.goto(ENDPOINTS.FACILITY_AVAILABILITY, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      await this.page.setRequestInterception(false);

      console.log('✅ 施設別空き状況ページへのアクセス完了');
    } catch (error) {
      throw new DirectApiError(
        '施設別空き状況ページへのPOSTリクエストに失敗しました',
        error
      );
    }
  }

  /**
   * 日付を選択して時間帯別空き状況データを取得
   *
   * 施設別空き状況ページから特定の日付を選択し、
   * 時間帯別空き状況ページへ遷移してデータを取得します。
   *
   * @param date - 取得対象の日付
   * @returns 施設の空き状況データ配列
   * @throws {DirectApiError} データ取得に失敗した場合
   */
  async selectDateAndFetchTimeSlots(
    date: Date
  ): Promise<FacilityAvailability[]> {
    try {
      const dateStr = format(date, 'yyyy年M月d日');
      const targetDateString = format(date, 'yyyyMMdd');
      console.log(`📊 ${dateStr} の時間帯別データを取得中...`);

      // 対象日付のチェックボックスを全選択
      const result = await this.page.evaluate((targetDate: string) => {
        const checkboxes = Array.from(
          document.querySelectorAll('input[type="checkbox"][name="checkdate"]')
        ) as HTMLInputElement[];

        let count = 0;
        const selectedDates: string[] = [];

        checkboxes.forEach((checkbox) => {
          // valueの最初の8文字が日付（YYYYMMDD）
          const checkboxDate = checkbox.value.substring(0, 8);

          if (checkboxDate === targetDate) {
            // 対応するlabelを取得
            const label = document.querySelector(
              `label[for="${checkbox.id}"]`
            ) as HTMLElement;

            if (label) {
              const status = label.textContent?.trim();

              // ○（空きあり）、△（一部空き）、－（当日など）を選択
              // ×（空きなし）、休（休館日）は選択しない
              if (status === '○' || status === '△' || status === '－') {
                // チェックボックスが選択されていない場合のみクリック
                if (!checkbox.checked) {
                  label.click();
                  count++;
                  selectedDates.push(checkboxDate);
                }
              }
            }
          }
        });

        return { count, selectedDates };
      }, targetDateString);

      if (result.count === 0) {
        console.log(
          `⚠️  ${dateStr} は選択可能な施設がありません（全て×、－、または休の可能性があります）`
        );
        return []; // この日付はスキップ
      }

      console.log(`✅ ${result.count}個のチェックボックスを選択しました`);

      // DOM更新を待機
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 「次へ進む」ボタンをクリックして時間帯別空き状況ページへ遷移
      console.log('📍 時間帯別空き状況ページへ遷移中...');

      await Promise.all([
        this.page.waitForNavigation({
          waitUntil: 'domcontentloaded',
          timeout: 60000,
        }),
        this.page.click('.navbar .next > a'),
      ]);

      // URLの確認
      const currentUrl = this.page.url();
      if (!currentUrl.includes('WgR_JikantaibetsuAkiJoukyou')) {
        throw new DirectApiError(
          `予期しないページに遷移しました: ${currentUrl}`
        );
      }

      console.log('✅ 時間帯別空き状況ページへ遷移完了');

      // 時間帯別データをスクレイピング
      const facilities = await this.scrapeTimeSlotData([date]);

      console.log(`✅ ${dateStr} のデータ取得完了`);

      return facilities;
    } catch (error) {
      throw new DirectApiError(
        `日付 ${format(date, 'yyyy-MM-dd')} のデータ取得に失敗しました`,
        error
      );
    }
  }

  /**
   * 時間帯別空き状況ページからデータをスクレイピング
   *
   * @param dates - 取得対象の日付配列
   * @returns 施設の空き状況データ配列
   * @private
   */
  private async scrapeTimeSlotData(
    dates: Date[]
  ): Promise<FacilityAvailability[]> {
    // カレンダーが表示されるまで待機
    await this.page.waitForSelector('.item .calendar', { timeout: 30000 });

    // 全施設のデータを取得
    const facilitiesData = await this.page.evaluate((targetDates: string[]) => {
      const items = Array.from(document.querySelectorAll('.item'));

      return items.map((item) => {
        // 施設名を取得
        const facilityNameElement = item.querySelector('h3');
        const facilityName = facilityNameElement?.textContent?.trim() || '';

        // この施設内のすべてのカレンダーテーブルを取得
        const calendars = Array.from(
          item.querySelectorAll('.calendar')
        ) as HTMLTableElement[];

        // 各カレンダーからデータを抽出
        const dateAvailability = calendars
          .map((calendar) => {
            // 日付ヘッダーから日付を取得
            const dateHeader = calendar.querySelector('thead th.shisetsu');
            const dateText = dateHeader?.textContent?.trim() || '';

            // "2025年12月10日(水)" のような形式から日付を抽出
            const dateMatch = dateText.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
            if (!dateMatch) {
              return null;
            }

            const [_, year, month, day] = dateMatch;
            const dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(
              2,
              '0'
            )}`;

            // この日付が対象日付に含まれているか確認
            if (!targetDates.includes(dateStr)) {
              return null;
            }

            // 時間帯のヘッダーを取得（"8:30～9:00"のような形式）
            const timeHeaders = Array.from(
              calendar.querySelectorAll('thead th')
            ).slice(2); // 最初の2つは「日付」と「定員」なのでスキップ

            // tbody の行を取得（各行が1つのコートまたは区分）
            const rows = Array.from(calendar.querySelectorAll('tbody tr'));

            // 各行のコート名を取得
            const courtNames = rows.map((row) => {
              const firstCell = row.querySelector('td.shisetsu');
              return firstCell?.textContent?.trim() || '';
            });

            // 時間帯データを取得（コートごとの詳細情報を含む）
            const slots = timeHeaders.map((th, timeIndex) => {
              const timeText = th.textContent?.trim() || '';
              // "8:30～9:00" を "8:30-9:00" に変換
              const time = timeText.replace('～', '-').replace(/\s/g, '');

              // 各コートの空き状況を取得
              const courts = rows.map((row, rowIndex) => {
                const cells = Array.from(row.querySelectorAll('td'));
                // 最初の2つは施設名と定員なのでスキップ
                const cell = cells[timeIndex + 2];
                const label = cell?.querySelector('label');
                const status = label?.textContent?.trim() || '';

                return {
                  name: courtNames[rowIndex],
                  available: status === '○',
                };
              });

              // 空き状況を判定
              const availableCourts = courts.filter((c) => c.available).length;
              const totalCourts = courts.length;

              let availabilityStatus:
                | 'all-available'
                | 'partially-available'
                | 'unavailable';
              if (availableCourts === 0) {
                availabilityStatus = 'unavailable';
              } else if (availableCourts === totalCourts) {
                availabilityStatus = 'all-available';
              } else {
                availabilityStatus = 'partially-available';
              }

              return {
                time,
                available: availableCourts > 0,
                status: availabilityStatus,
                courts,
              };
            });

            return {
              date: dateStr,
              slots,
            };
          })
          .filter(Boolean);

        return {
          facilityName,
          dateAvailability,
        };
      });
    }, dates.map((d) => format(d, 'yyyy-MM-dd')));

    // データを FacilityAvailability[] 形式に変換
    const results: FacilityAvailability[] = facilitiesData
      .filter((data: any): data is NonNullable<typeof data> => data !== null)
      .map((data: any, index: number) => {
        const facility: Facility = {
          id: `facility-${index}`,
          name: data.facilityName,
          type: 'basketball',
        };

        // 日付ごとにデータをグループ化
        const availability: AvailabilityData[] = data.dateAvailability
          .filter((d: any): d is NonNullable<typeof d> => d !== null)
          .map((dateData: any) => ({
            date: new Date(dateData.date),
            slots: dateData.slots,
          }));

        return {
          facility,
          availability,
        };
      });

    console.log(`✅ ${results.length}施設のデータを取得しました`);

    return results;
  }

  /**
   * キャッシュをクリア
   *
   * トークンキャッシュをクリアします。
   * 新しいスクレイピングセッションを開始する前に呼び出すことを推奨します。
   */
  clearCache(): void {
    this.cachedToken = null;
  }

  /**
   * エラーハンドリング用のヘルパーメソッド
   *
   * エラーが発生した際に詳細情報をログ出力します。
   *
   * @param error - キャッチしたエラー
   * @param context - エラーが発生したコンテキスト
   */
  private logError(error: unknown, context: string): void {
    console.error(`❌ DirectApiClient エラー [${context}]:`, error);
  }
}
