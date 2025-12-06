/**
 * HTMLパーサー
 *
 * スクレイピングしたHTMLから施設情報や空き状況を抽出します。
 * cheerioライブラリを使用してHTML解析を行います。
 */

import * as cheerio from 'cheerio';
import type { Facility, TimeSlot } from '../types';

/**
 * 施設一覧HTMLから施設情報を抽出
 *
 * @param html - 施設一覧ページのHTML文字列
 * @param type - スポーツ種目（basketball または mini-basketball）
 * @returns 施設情報の配列
 * @throws {Error} HTMLの解析に失敗した場合、または必須要素が見つからない場合
 */
export function parseFacilities(
  html: string,
  type: 'basketball' | 'mini-basketball'
): Facility[] {
  if (!html || typeof html !== 'string') {
    throw new Error('施設一覧の抽出に失敗しました: HTMLが無効です');
  }

  try {
    const $ = cheerio.load(html);
    const facilities: Facility[] = [];

    // 施設テーブルの行を走査
    const rows = $('.facilities-table tbody tr');

    if (rows.length === 0) {
      // テーブルが見つからない場合、HTML構造が変更された可能性
      const hasFacilityList = $('.facility-list').length > 0;
      if (!hasFacilityList) {
        throw new Error('施設一覧の抽出に失敗しました: HTML構造が変更されました');
      }
      // 空の施設リストは正常なケース
      return [];
    }

    rows.each((_, row) => {
      const $row = $(row);
      const name = $row.find('.facility-name').text().trim();
      const idElement = $row.find('input[data-facility-id]');
      const id = idElement.attr('data-facility-id');

      if (!name || !id) {
        throw new Error('施設一覧の抽出に失敗しました: 必須要素が見つかりません');
      }

      facilities.push({
        id,
        name,
        type,
      });
    });

    return facilities;
  } catch (error) {
    if (error instanceof Error && error.message.includes('施設一覧の抽出に失敗')) {
      throw error;
    }
    throw new Error('施設一覧の抽出に失敗しました: HTML構造が変更されました');
  }
}

/**
 * 空き状況HTMLから時間帯ごとの空き情報を抽出
 *
 * @param html - 空き状況ページのHTML文字列
 * @returns 時間帯ごとの空き状況の配列
 * @throws {Error} HTMLの解析に失敗した場合、または必須要素が見つからない場合
 */
export function parseAvailability(html: string): TimeSlot[] {
  if (!html || typeof html !== 'string') {
    throw new Error('空き状況の抽出に失敗しました: HTMLが無効です');
  }

  try {
    const $ = cheerio.load(html);
    const slots: TimeSlot[] = [];

    // 時間帯テーブルの行を走査
    const rows = $('.timeslot-table tbody tr');

    if (rows.length === 0) {
      // テーブルが見つからない場合、HTML構造が変更された可能性
      const hasAvailabilityTable = $('.availability-table').length > 0;
      if (!hasAvailabilityTable) {
        throw new Error('空き状況の抽出に失敗しました: HTML構造が変更されました');
      }
      // 空の時間帯リストは正常なケース
      return [];
    }

    rows.each((_, row) => {
      const $row = $(row);
      const time = $row.find('.time').text().trim();
      const statusElement = $row.find('.status');
      const statusText = statusElement.text().trim();

      if (!time || !statusText) {
        throw new Error('空き状況の抽出に失敗しました: 必須要素が見つかりません');
      }

      // 時刻フォーマットの検証（HH:mm 形式）
      if (!/^\d{1,2}:\d{2}$/.test(time)) {
        throw new Error(`時刻フォーマットが不正です: ${time}`);
      }

      // ○: 空き、×: 空いていない
      const available = statusText === '○';

      slots.push({
        time,
        available,
      });
    });

    return slots;
  } catch (error) {
    if (error instanceof Error && (
      error.message.includes('空き状況の抽出に失敗') ||
      error.message.includes('時刻フォーマットが不正')
    )) {
      throw error;
    }
    throw new Error('空き状況の抽出に失敗しました: HTML構造が変更されました');
  }
}
