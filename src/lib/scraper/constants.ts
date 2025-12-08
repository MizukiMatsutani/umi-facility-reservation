/**
 * 宇美町施設予約システムの定数定義
 */

/**
 * 宇美町の全施設ID一覧
 *
 * 各施設のIDは宇美町システムの固定値として定義されています。
 * これらのIDは直接API呼び出し時に使用されます。
 */
export const FACILITY_IDS = [
  '341007', // 宇美勤労者体育センター
  '341009', // 宇美南町民センター
  '341014', // 宇美町立宇美中学校
  '341015', // 宇美町立宇美東中学校
  '341016', // 宇美町立宇美南中学校
  '341017', // 宇美町立宇美小学校
  '341018', // 宇美町立宇美東小学校
  '341019', // 宇美町立原田小学校
  '341020', // 宇美町立桜原小学校
  '341021', // 宇美町立井野小学校
] as const;

/**
 * 施設ID型（型安全性のため）
 */
export type FacilityId = typeof FACILITY_IDS[number];

/**
 * 施設名のマッピング
 */
export const FACILITY_NAMES: Record<FacilityId, string> = {
  '341007': '宇美勤労者体育センター',
  '341009': '宇美南町民センター',
  '341014': '宇美町立宇美中学校',
  '341015': '宇美町立宇美東中学校',
  '341016': '宇美町立宇美南中学校',
  '341017': '宇美町立宇美小学校',
  '341018': '宇美町立宇美東小学校',
  '341019': '宇美町立原田小学校',
  '341020': '宇美町立桜原小学校',
  '341021': '宇美町立井野小学校',
};

/**
 * 宇美町システムのベースURL
 */
export const UMI_BASE_URL = 'https://www.11489.jp/Umi/web';

/**
 * 主要なエンドポイント
 */
export const ENDPOINTS = {
  /** 検索モード選択ページ */
  MODE_SELECT: `${UMI_BASE_URL}/Home/WgR_ModeSelect`,
  /** 施設検索ページ（Step 3で使用） */
  FACILITY_SEARCH: `${UMI_BASE_URL}/Yoyaku/WgR_ShisetsuKensaku`,
  /** 施設別空き状況ページ */
  FACILITY_AVAILABILITY: `${UMI_BASE_URL}/Yoyaku/WgR_ShisetsubetsuAkiJoukyou`,
  /** 時間帯別空き状況ページ */
  TIMESLOT_AVAILABILITY: `${UMI_BASE_URL}/Yoyaku/WgR_JikantaibetsuAkiJoukyou`,
} as const;
