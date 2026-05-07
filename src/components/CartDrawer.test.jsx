import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageProvider } from '../utils/i18n';
import CartDrawer from './CartDrawer';

const wrap = (ui) => render(<LanguageProvider>{ui}</LanguageProvider>);

const ITEM_A = { id: 'a1', cartKey: 'a1', name: 'Fried Rice', price: 60, quantity: 2 };
const ITEM_B = { id: 'b1', cartKey: 'b1', name: 'Spring Roll', price: 40, quantity: 1 };

const defaultProps = {
  open: true,
  cart: [ITEM_A, ITEM_B],
  onClose: vi.fn(),
  onAddItem: vi.fn(),
  onRemoveItem: vi.fn(),
  totalPrice: 160,
  onCheckout: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CartDrawer', () => {
  it('renders nothing when open is false', () => {
    const { container } = wrap(<CartDrawer {...defaultProps} open={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows item names and total when open with items', () => {
    wrap(<CartDrawer {...defaultProps} />);
    expect(screen.getByText('Fried Rice')).toBeInTheDocument();
    expect(screen.getByText('Spring Roll')).toBeInTheDocument();
    expect(screen.getByText(/160/)).toBeInTheDocument();
  });

  it('shows empty cart message when cart is empty', () => {
    wrap(<CartDrawer {...defaultProps} cart={[]} />);
    expect(screen.getByText(/cart is empty/i)).toBeInTheDocument();
  });

  it('calls onRemoveItem with the item cartKey when − is clicked', async () => {
    const user = userEvent.setup();
    wrap(<CartDrawer {...defaultProps} cart={[ITEM_A]} />);
    await user.click(screen.getByRole('button', { name: '−' }));
    expect(defaultProps.onRemoveItem).toHaveBeenCalledWith('a1');
  });

  it('calls onAddItem with the full item when + is clicked', async () => {
    const user = userEvent.setup();
    wrap(<CartDrawer {...defaultProps} cart={[ITEM_A]} />);
    await user.click(screen.getByRole('button', { name: '+' }));
    expect(defaultProps.onAddItem).toHaveBeenCalledWith(ITEM_A);
  });

  it('calls onCheckout when the place order button is clicked', async () => {
    const user = userEvent.setup();
    wrap(<CartDrawer {...defaultProps} />);
    await user.click(screen.getByRole('button', { name: /place order/i }));
    expect(defaultProps.onCheckout).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the backdrop is clicked', async () => {
    const user = userEvent.setup();
    const { container } = wrap(<CartDrawer {...defaultProps} />);
    const backdrop = container.querySelector('.flex-1.bg-black\\/40');
    await user.click(backdrop);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });
});
