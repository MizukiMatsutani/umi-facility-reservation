/**
 * コアデータ型定義
 *
 * 宇美町施設予約検索システムで使用する主要なTypeScript型を定義します。
 * すべての型はdesign.mdのデータモデル仕様に準拠しています。
 */

/**
 * 施設情報
 *
 * @property {string} id - 施設の一意識別子
 * @property {string} name - 施設名（例: "宇美町立体育館"）
 * @property {('basketball' | 'mini-basketball')} type - スポーツ種目
 */
export interface Facility {
  readonly id: string;
  readonly name: string;
  readonly type: 'basketball' | 'mini-basketball';
}

/**
 * コート情報
 *
 * 施設内の各コート（全面、倉庫側、壁側など）の情報を表します。
 *
 * @property {string} name - コート名（例: "全面", "倉庫側", "壁側"）
 * @property {boolean} available - このコートが空いているか
 */
export interface CourtStatus {
  readonly name: string;
  readonly available: boolean;
}

/**
 * 空き状況の種類
 *
 * - 'all-available': 全コート空き（緑色表示）
 * - 'partially-available': 一部のコートのみ空き（黄色表示）
 * - 'unavailable': 全コート空きなし（グレー背景）
 */
export type AvailabilityStatus = 'all-available' | 'partially-available' | 'unavailable';

/**
 * 時間帯
 *
 * 30分単位の時間帯ごとの空き状況を表します。
 *
 * @property {string} time - 時刻（"8:30", "9:00"などの形式）
 * @property {boolean} available - true = 何らかのコートが空き, false = 全コート空いていない
 * @property {AvailabilityStatus} status - 空き状況の種類
 * @property {CourtStatus[]} courts - 各コートの空き状況
 */
export interface TimeSlot {
  readonly time: string;
  readonly available: boolean;
  readonly status: AvailabilityStatus;
  readonly courts: readonly CourtStatus[];
}

/**
 * 空き状況データ
 *
 * 特定の日付における時間帯ごとの空き状況を保持します。
 *
 * @property {Date} date - 対象日付
 * @property {TimeSlot[]} slots - 時間帯ごとの空き状況
 */
export interface AvailabilityData {
  readonly date: Date;
  readonly slots: readonly TimeSlot[];
}

/**
 * 時間範囲
 *
 * 検索条件として指定する開始時刻から終了時刻までの範囲を表します。
 * 未指定の場合は全時間帯が検索対象となります。
 *
 * @property {string} from - 開始時刻（例: "9:00"）
 * @property {string} to - 終了時刻（例: "12:00"）
 */
export interface TimeRange {
  readonly from: string;
  readonly to: string;
}

/**
 * 検索パラメータ
 *
 * ユーザーが指定する検索条件を保持します。
 *
 * @property {Date[]} dates - 検索対象日付の配列（1つ以上の日付を含む）
 * @property {TimeRange} [timeRange] - 指定時間範囲（オプション）。未指定の場合は全時間帯が検索対象
 */
export interface SearchParams {
  readonly dates: readonly Date[];
  readonly timeRange?: TimeRange;
}

/**
 * 施設と空き状況の組み合わせ
 *
 * 特定施設の複数日に渡る空き状況を保持します。
 *
 * @property {Facility} facility - 施設情報
 * @property {AvailabilityData[]} availability - 日付ごとの空き状況
 */
export interface FacilityAvailability {
  readonly facility: Facility;
  readonly availability: readonly AvailabilityData[];
}
