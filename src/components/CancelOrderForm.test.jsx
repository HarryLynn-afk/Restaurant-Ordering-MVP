import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageProvider } from '../utils/i18n';
import CancelOrderForm from './CancelOrderForm';

vi.mock('../services/orders', () => ({
  cancelOrder: vi.fn(() => Promise.resolve()),
}));

import { cancelOrder } from '../services/orders';

const wrap = (ui) => render(<LanguageProvider>{ui}</LanguageProvider>);

describe('CancelOrderForm', () => {
  beforeEach(() => cancelOrder.mockClear());

  it('confirm button is disabled when no reason is selected', () => {
    wrap(<CancelOrderForm orderId="order-1" onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: /confirm cancel/i })).toBeDisabled();
  });

  it('calls cancelOrder and onClose when reason selected and confirmed', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    wrap(<CancelOrderForm orderId="order-1" onClose={onClose} />);

    const firstRadio = screen.getAllByRole('radio')[0];
    await user.click(firstRadio);
    await user.click(screen.getByRole('button', { name: /confirm cancel/i }));

    expect(cancelOrder).toHaveBeenCalledWith('order-1', expect.any(String));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows text input when Other is selected', async () => {
    const user = userEvent.setup();
    wrap(<CancelOrderForm orderId="order-1" onClose={vi.fn()} />);

    const otherRadio = screen.getByDisplayValue('Other');
    await user.click(otherRadio);

    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('confirm button stays disabled when Other selected but text is empty', async () => {
    const user = userEvent.setup();
    wrap(<CancelOrderForm orderId="order-1" onClose={vi.fn()} />);

    await user.click(screen.getByDisplayValue('Other'));

    expect(screen.getByRole('button', { name: /confirm cancel/i })).toBeDisabled();
  });

  it('calls onClose when back button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    wrap(<CancelOrderForm orderId="order-1" onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: /back/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
