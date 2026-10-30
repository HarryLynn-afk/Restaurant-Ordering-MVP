import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { beforeEach, it, expect, vi } from 'vitest';
import CheckoutPage from './CheckoutPage';
import { createOrder } from '../services/orders';

vi.mock('../services/orders', () => ({ createOrder: vi.fn() }));
vi.mock('../services/menu', () => ({ getSoldOutItemIds: async () => new Set() }));
vi.mock('../hooks/useLastOrder', () => ({ default: () => ({ saveLastOrder: () => {} }) }));
vi.mock('../components/LanguageToggle', () => ({ default: () => null }));
vi.mock('../utils/i18n', () => ({ useCustomerLanguage: () => ({ t: key => key }) }));

const item = { id: 'rice', name: 'Rice', price: 70, quantity: 1,
  modifierSummary: 'Egg', selections: { extras: { egg: true } } };
const form = { customerName: 'Demo', phone: '0812345678', address: 'Demo address', notes: '', lineId: '' };
const show = () => render(<MemoryRouter initialEntries={[{ pathname: '/checkout', state: { cart: [item] } }]}>
  <Routes><Route path="/checkout" element={<CheckoutPage />} />
    <Route path="/" element={<p>Menu</p>} /><Route path="/order/test" element={<p>Tracking</p>} /></Routes>
</MemoryRouter>);

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  localStorage.setItem('customerInfo', JSON.stringify(form));
  localStorage.setItem('cart', JSON.stringify([item]));
});

it('sends option identifiers and opens the new order', async () => {
  vi.mocked(createOrder).mockResolvedValue('test');
  show();
  await userEvent.click(screen.getByRole('button', { name: 'customer.confirmPay' }));
  expect(createOrder).toHaveBeenCalledWith(form, [item], 70);
  expect(await screen.findByText('Tracking')).toBeInTheDocument();
});

it('offers an explicit cart reset after the menu changes', async () => {
  vi.mocked(createOrder).mockRejectedValue({ code: 'functions/failed-precondition' });
  show();
  await userEvent.click(screen.getByRole('button', { name: 'customer.confirmPay' }));
  expect(await screen.findByText('customer.menuChangedError')).toBeInTheDocument();
  expect(localStorage.getItem('cart')).not.toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'customer.resetCart' }));
  expect(await screen.findByText('Menu')).toBeInTheDocument();
  expect(localStorage.getItem('cart')).toBeNull();
});
