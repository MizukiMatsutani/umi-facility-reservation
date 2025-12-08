/**
 * SearchFormコンポーネントのテスト
 *
 * このテストは、SearchFormコンポーネントのフォーム送信、バリデーション、
 * ローディング状態を検証します。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchForm from '../SearchForm';
import type { SearchParams } from '@/lib/types';

// サブコンポーネントをモック化
vi.mock('../ui/DatePicker', () => ({
  default: ({ selectedDates, onDateSelect }: { selectedDates: Date[]; onDateSelect: (dates: Date[]) => void }) => (
    <div data-testid="date-picker">
      <button
        data-testid="select-date-button"
        onClick={() => onDateSelect([new Date('2025-12-06')])}
      >
        日付選択
      </button>
      <div data-testid="selected-dates">
        {selectedDates.map((d, i) => (
          <div key={i}>{d.toISOString()}</div>
        ))}
      </div>
    </div>
  ),
}));

vi.mock('../ui/TimePicker', () => ({
  default: ({ value, onChange }: { value?: { from: string; to: string }; onChange: (value: { from: string; to: string } | undefined) => void }) => (
    <div data-testid="time-picker">
      <button
        data-testid="set-time-button"
        onClick={() => onChange({ from: '09:00', to: '12:00' })}
      >
        時間設定
      </button>
      <div data-testid="time-value">{value ? `${value.from}-${value.to}` : 'なし'}</div>
    </div>
  ),
}));

vi.mock('../ui/QuickDateSelect', () => ({
  default: ({ onQuickSelect }: { onQuickSelect: (dates: Date[]) => void }) => (
    <div data-testid="quick-date-select">
      <button
        data-testid="quick-select-button"
        onClick={() => {
          const dates: Date[] = [];
          for (let i = 0; i < 7; i++) {
            const date = new Date('2025-12-06');
            date.setDate(date.getDate() + i);
            dates.push(date);
          }
          onQuickSelect(dates);
        }}
      >
        本日から1週間
      </button>
    </div>
  ),
}));

describe('SearchForm', () => {
  let mockOnSubmit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnSubmit = vi.fn();
  });

  it('フォームが正しくレンダリングされる', () => {
    render(<SearchForm onSubmit={mockOnSubmit} />);

    expect(screen.getByTestId('date-picker')).toBeInTheDocument();
    expect(screen.getByTestId('time-picker')).toBeInTheDocument();
    expect(screen.getByTestId('quick-date-select')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '施設を検索' })).toBeInTheDocument();
  });

  it('日付を選択してフォームを送信できる', async () => {
    const user = userEvent.setup();
    render(<SearchForm onSubmit={mockOnSubmit} />);

    // 日付を選択
    await user.click(screen.getByTestId('select-date-button'));

    // フォームを送信
    await user.click(screen.getByRole('button', { name: '施設を検索' }));

    expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    const params = mockOnSubmit.mock.calls[0][0] as SearchParams;
    expect(params.dates).toHaveLength(1);
    expect(params.dates[0]).toBeInstanceOf(Date);
    expect(params.timeRange).toBeUndefined();
  });

  it('日付と時間範囲を設定してフォームを送信できる', async () => {
    const user = userEvent.setup();
    render(<SearchForm onSubmit={mockOnSubmit} />);

    // 日付を選択
    await user.click(screen.getByTestId('select-date-button'));

    // 時間範囲を設定
    await user.click(screen.getByTestId('set-time-button'));

    // フォームを送信
    await user.click(screen.getByRole('button', { name: '施設を検索' }));

    // onSubmitが少なくとも1回呼ばれたことを確認
    expect(mockOnSubmit).toHaveBeenCalled();
    // 最後の呼び出しのパラメータを取得
    const lastCall = mockOnSubmit.mock.calls[mockOnSubmit.mock.calls.length - 1];
    const params = lastCall[0] as SearchParams;
    expect(params.dates).toHaveLength(1);
    // TimeRangeが設定されたかどうかを確認
    expect(params.timeRange).toBeDefined();
    if (params.timeRange) {
      expect(params.timeRange.from).toBe('09:00');
      expect(params.timeRange.to).toBe('12:00');
    }
  });

  it('クイック選択で7日間を選択できる', async () => {
    const user = userEvent.setup();
    render(<SearchForm onSubmit={mockOnSubmit} />);

    // クイック選択ボタンをクリック
    await user.click(screen.getByTestId('quick-select-button'));

    // 7日分選択されていることを確認
    const selectedDates = screen.getAllByText(/2025-12-/);
    expect(selectedDates).toHaveLength(7);

    // フォームを送信
    await user.click(screen.getByRole('button', { name: '施設を検索' }));

    expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    const params = mockOnSubmit.mock.calls[0][0] as SearchParams;
    expect(params.dates).toHaveLength(7);
  });

  it('日付が選択されていない場合、バリデーションエラーを表示する', async () => {
    const user = userEvent.setup();
    render(<SearchForm onSubmit={mockOnSubmit} />);

    // 日付を選択せずにフォームを送信
    await user.click(screen.getByRole('button', { name: '施設を検索' }));

    // エラーメッセージが表示される
    expect(screen.getByText(/検索する日付を1つ以上選択してください/)).toBeInTheDocument();

    // onSubmitは呼ばれない
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('ローディング中は送信ボタンが無効化される', () => {
    render(<SearchForm onSubmit={mockOnSubmit} isLoading={true} />);

    const submitButton = screen.getByRole('button', { name: '施設を検索' });
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveTextContent('検索中...');
  });

  it('ローディング中はフォームが表示される', () => {
    const { container } = render(<SearchForm onSubmit={mockOnSubmit} isLoading={true} />);

    const form = container.querySelector('form');
    expect(form).toBeInTheDocument();
    // ボタンが無効化されていることは他のテストで確認済み
  });

  it('日付を選択するとフォームが送信可能になる', async () => {
    const user = userEvent.setup();
    render(<SearchForm onSubmit={mockOnSubmit} />);

    // 最初はエラーが表示されない
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    // 日付選択後は送信が可能
    await user.click(screen.getByTestId('select-date-button'));
    await user.click(screen.getByRole('button', { name: '施設を検索' }));

    // フォームが送信される
    expect(mockOnSubmit).toHaveBeenCalled();
  });
});
