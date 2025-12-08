/**
 * HTMLパーサーのテスト
 *
 * スクレイピングしたHTMLからデータを抽出する関数のテストケースを定義します。
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseFacilities, parseAvailability } from '../parser';

// フィクスチャの読み込み
const facilitiesHtml = readFileSync(
  join(__dirname, 'fixtures/facilities.html'),
  'utf-8'
);
const availabilityHtml = readFileSync(
  join(__dirname, 'fixtures/availability.html'),
  'utf-8'
);
const malformedHtml = readFileSync(
  join(__dirname, 'fixtures/malformed.html'),
  'utf-8'
);

describe('HTMLパーサー', () => {
  describe('parseFacilities', () => {
    it('正常なHTMLから施設一覧を抽出できる', () => {
      const facilities = parseFacilities(facilitiesHtml, 'basketball');

      expect(facilities).toHaveLength(3);
      expect(facilities[0]).toEqual({
        id: 'facility-1',
        name: '宇美町立体育館',
        type: 'basketball',
      });
      expect(facilities[1]).toEqual({
        id: 'facility-2',
        name: '宇美南中学校体育館',
        type: 'basketball',
      });
      expect(facilities[2]).toEqual({
        id: 'facility-3',
        name: '宇美東中学校体育館',
        type: 'basketball',
      });
    });

    it('mini-basketball タイプでも施設一覧を抽出できる', () => {
      const facilities = parseFacilities(facilitiesHtml, 'mini-basketball');

      expect(facilities).toHaveLength(3);
      expect(facilities[0].type).toBe('mini-basketball');
    });

    it('施設が見つからない場合は空配列を返す', () => {
      const emptyHtml = '<div class="facility-list"></div>';
      const facilities = parseFacilities(emptyHtml, 'basketball');

      expect(facilities).toEqual([]);
    });

    it('HTMLが不正な場合はエラーを投げる', () => {
      expect(() => parseFacilities(malformedHtml, 'basketball')).toThrow(
        '施設一覧の抽出に失敗しました'
      );
    });

    it('必須要素が欠けている場合はエラーを投げる', () => {
      const incompleteHtml = '<table><tr><td>施設名のみ</td></tr></table>';

      expect(() => parseFacilities(incompleteHtml, 'basketball')).toThrow();
    });
  });

  describe('parseAvailability', () => {
    it('正常なHTMLから空き状況を抽出できる', () => {
      const slots = parseAvailability(availabilityHtml);

      expect(slots).toHaveLength(8);
      expect(slots[0]).toEqual({
        time: '8:30',
        available: true,
      });
      expect(slots[1]).toEqual({
        time: '9:00',
        available: true,
      });
      expect(slots[2]).toEqual({
        time: '9:30',
        available: false,
      });
      expect(slots[3]).toEqual({
        time: '10:00',
        available: true,
      });
    });

    it('利用可能マーカー（○）を正しく認識する', () => {
      const slots = parseAvailability(availabilityHtml);

      const availableSlots = slots.filter((slot) => slot.available);
      expect(availableSlots.length).toBeGreaterThan(0);
      expect(availableSlots[0].available).toBe(true);
    });

    it('利用不可マーカー（×）を正しく認識する', () => {
      const slots = parseAvailability(availabilityHtml);

      const unavailableSlots = slots.filter((slot) => !slot.available);
      expect(unavailableSlots.length).toBeGreaterThan(0);
      expect(unavailableSlots[0].available).toBe(false);
    });

    it('時間スロットが見つからない場合は空配列を返す', () => {
      const emptyHtml = '<div class="availability-table"></div>';
      const slots = parseAvailability(emptyHtml);

      expect(slots).toEqual([]);
    });

    it('HTMLが不正な場合はエラーを投げる', () => {
      expect(() => parseAvailability(malformedHtml)).toThrow(
        '空き状況の抽出に失敗しました'
      );
    });

    it('必須要素が欠けている場合はエラーを投げる', () => {
      const incompleteHtml =
        '<table><tr><td class="time">8:30</td></tr></table>';

      expect(() => parseAvailability(incompleteHtml)).toThrow();
    });

    it('時刻フォーマットが正しくない場合はエラーを投げる', () => {
      const invalidTimeHtml = `
        <table class="timeslot-table">
          <tbody>
            <tr>
              <td class="time">無効な時刻</td>
              <td class="status available">○</td>
            </tr>
          </tbody>
        </table>
      `;

      expect(() => parseAvailability(invalidTimeHtml)).toThrow(
        '時刻フォーマットが不正です'
      );
    });
  });

  describe('パーサーのエッジケース', () => {
    it('空文字列のHTMLは適切にエラーを返す', () => {
      expect(() => parseFacilities('', 'basketball')).toThrow();
      expect(() => parseAvailability('')).toThrow();
    });

    it('nullやundefinedを処理しようとするとエラーを投げる', () => {
      expect(() => parseFacilities(null as any, 'basketball')).toThrow();
      expect(() => parseAvailability(null as any)).toThrow();
    });
  });
});
