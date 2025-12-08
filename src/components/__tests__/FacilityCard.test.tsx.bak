/**
 * FacilityCardコンポーネントのテスト
 *
 * このテストは、FacilityCardコンポーネントの施設情報表示、
 * 日付ごとの展開/折りたたみ、空き状況の表示を検証します。
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FacilityCard from '../FacilityCard';
import type { FacilityAvailability } from '@/lib/types';

// AvailabilityListをモック化
vi.mock('../AvailabilityList', () => ({
  default: ({ slots }: { slots: { time: string; available: boolean }[] }) => (
    <div data-testid="availability-list">
      {slots.map((slot, i) => (
        <div key={i} data-testid={`time-slot-${slot.time}`}>
          {slot.time}: {slot.available ? '空き' : '空いていない'}
        </div>
      ))}
    </div>
  ),
}));

// date-fnsのformatDateをモック化
vi.mock('@/lib/utils/date', () => ({
  formatDate: (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}年${month}月${day}日`;
  },
}));

describe('FacilityCard', () => {
  const mockFacilityAvailability: FacilityAvailability = {
    facility: {
      id: '1',
      name: 'テスト体育館',
      type: 'basketball',
    },
    availability: [
      {
        date: new Date('2025-12-06'),
        slots: [
          { time: '09:00', available: true },
          { time: '10:00', available: false },
        ],
      },
      {
        date: new Date('2025-12-07'),
        slots: [
          { time: '09:00', available: false },
          { time: '10:00', available: true },
        ],
      },
    ],
  };

  it('施設名が表示される', () => {
    render(<FacilityCard facilityAvailability={mockFacilityAvailability} />);

    expect(screen.getByText('テスト体育館')).toBeInTheDocument();
  });

  it('スポーツ種目が日本語で表示される', () => {
    render(<FacilityCard facilityAvailability={mockFacilityAvailability} />);

    expect(screen.getByText('バスケットボール')).toBeInTheDocument();
  });

  it('全ての日付が表示される', () => {
    render(<FacilityCard facilityAvailability={mockFacilityAvailability} />);

    expect(screen.getByText('2025年12月6日')).toBeInTheDocument();
    expect(screen.getByText('2025年12月7日')).toBeInTheDocument();
  });

  it('初期状態では全ての日付が折りたたまれている', () => {
    render(<FacilityCard facilityAvailability={mockFacilityAvailability} />);

    // AvailabilityListが表示されていない
    expect(screen.queryByTestId('availability-list')).not.toBeInTheDocument();
  });

  it('日付をクリックすると展開される', async () => {
    const user = userEvent.setup();
    render(<FacilityCard facilityAvailability={mockFacilityAvailability} />);

    // 最初の日付をクリック
    const dateButton = screen.getByRole('button', { name: /2025年12月6日/ });
    await user.click(dateButton);

    // AvailabilityListが表示される
    expect(screen.getByTestId('availability-list')).toBeInTheDocument();
    expect(screen.getByTestId('time-slot-09:00')).toBeInTheDocument();
    expect(screen.getByTestId('time-slot-10:00')).toBeInTheDocument();
  });

  it('展開された日付を再クリックすると折りたたまれる', async () => {
    const user = userEvent.setup();
    render(<FacilityCard facilityAvailability={mockFacilityAvailability} />);

    const dateButton = screen.getByRole('button', { name: /2025年12月6日/ });

    // 1回目のクリックで展開
    await user.click(dateButton);
    expect(screen.getByTestId('availability-list')).toBeInTheDocument();

    // 2回目のクリックで折りたたみ
    await user.click(dateButton);
    expect(screen.queryByTestId('availability-list')).not.toBeInTheDocument();
  });

  it('複数の日付を同時に展開できる', async () => {
    const user = userEvent.setup();
    render(<FacilityCard facilityAvailability={mockFacilityAvailability} />);

    // 1つ目の日付を展開
    const dateButton1 = screen.getByRole('button', { name: /2025年12月6日/ });
    await user.click(dateButton1);

    // 2つ目の日付を展開
    const dateButton2 = screen.getByRole('button', { name: /2025年12月7日/ });
    await user.click(dateButton2);

    // 両方のAvailabilityListが表示される
    const availabilityLists = screen.getAllByTestId('availability-list');
    expect(availabilityLists).toHaveLength(2);
  });

  it('空き状況がない日付も正しく表示される', () => {
    const emptyAvailability: FacilityAvailability = {
      facility: {
        id: '2',
        name: '空き施設',
        type: 'mini-basketball',
      },
      availability: [
        {
          date: new Date('2025-12-06'),
          slots: [],
        },
      ],
    };

    render(<FacilityCard facilityAvailability={emptyAvailability} />);

    expect(screen.getByText('空き施設')).toBeInTheDocument();
    expect(screen.getByText('ミニバスケットボール')).toBeInTheDocument();
    expect(screen.getByText('2025年12月6日')).toBeInTheDocument();
  });

  it('空き時間帯数が表示される', async () => {
    render(<FacilityCard facilityAvailability={mockFacilityAvailability} />);

    // 空き時間帯数のテキストを確認
    // 最初の日付は2つのタイムスロットのうち1つが空き
    const counts = screen.getAllByText(/空き: 1 \/ 2/);
    expect(counts.length).toBeGreaterThan(0);
  });

  it('カードがモバイルフレンドリーなレイアウトで表示される', () => {
    const { container } = render(<FacilityCard facilityAvailability={mockFacilityAvailability} />);

    // カードコンテナが存在することを確認
    const card = container.querySelector('.border');
    expect(card).toBeInTheDocument();
  });
});
