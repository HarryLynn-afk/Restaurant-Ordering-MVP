import userEvent from '@testing-library/user-event';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { beforeEach, it, expect, vi } from 'vitest';
import PaymentPage from './PaymentPage';
import { getOrder, uploadPaymentSlip } from '../services/orders';

vi.mock('../firebase', () => ({ ensureCustomerSession: async () => ({ uid: 'customer' }) }));
vi.mock('../services/orders', () => ({ getOrder: vi.fn(), uploadPaymentSlip: vi.fn() }));
vi.mock('../services/settings', () => ({ getSettings: async () => ({ qrCodeUrl: 'https://example.com/qr.png' }) }));
vi.mock('../components/LanguageToggle', () => ({ default: () => null }));
vi.mock('../utils/i18n', () => { const t = key => key; return { useCustomerLanguage: () => ({ t }) }; });
const show = () => render(<MemoryRouter initialEntries={['/payment/demo']}><Routes>
  <Route path="/payment/:orderId" element={<PaymentPage />} />
</Routes></MemoryRouter>);
beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:preview') });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
});

it('does not show payment controls for a missing order', async () => {
  vi.mocked(getOrder).mockResolvedValue(null);
  show();
  expect(await screen.findByText('customer.orderStatus.orderNotFound')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'customer.payment.chooseSlip' })).not.toBeInTheDocument();
  expect(screen.queryByAltText('QR Code')).not.toBeInTheDocument();
});

it.each(['new', 'cancelled', 'preparing', 'delivered'])('does not request payment for a %s order', async status => {
  vi.mocked(getOrder).mockResolvedValue({ status, total: 60 });
  show();
  expect(await screen.findByText('customer.payment.notAvailable')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'customer.payment.chooseSlip' })).not.toBeInTheDocument();
  expect(screen.queryByAltText('QR Code')).not.toBeInTheDocument();
});

it('shows a loading error without payment controls when access fails', async () => {
  vi.mocked(getOrder).mockRejectedValue(new Error('permission-denied'));
  show();
  expect(await screen.findByRole('alert')).toHaveTextContent('customer.payment.loadingError');
  expect(screen.queryByRole('button', { name: 'customer.payment.chooseSlip' })).not.toBeInTheDocument();
});


it('rejects a non-image without offering an upload', async () => {
  vi.mocked(getOrder).mockResolvedValue({ status: 'unpaid', total: 60 });
  show();
  const input = await screen.findByLabelText('customer.payment.chooseSlip');
  fireEvent.change(input, { target: { files: [new File(['text'], 'bad.txt', { type: 'text/plain' })] } });
  expect(await screen.findByText('customer.payment.invalidImage')).toBeInTheDocument();
  expect(uploadPaymentSlip).not.toHaveBeenCalled();
  expect(screen.queryByText('customer.payment.submitSlip')).not.toBeInTheDocument();
});

it('uploads payment proof for an unpaid order and releases its preview', async () => {
  vi.mocked(getOrder).mockResolvedValue({ status: 'unpaid', total: 60 });
  vi.mocked(uploadPaymentSlip).mockResolvedValue('slips/customer/receipt.jpg');
  const { unmount } = show();
  const input = await screen.findByLabelText('customer.payment.chooseSlip');
  const file = new File(['image'], 'receipt.jpg', { type: 'image/jpeg' });
  await userEvent.upload(input, file);
  await userEvent.click(screen.getByRole('button', { name: 'customer.payment.submitSlip' }));
  expect(await screen.findByText('customer.payment.uploadedTitle')).toBeInTheDocument();
  expect(uploadPaymentSlip).toHaveBeenCalledWith('demo', file);
  expect(screen.queryByAltText('QR Code')).not.toBeInTheDocument();
  unmount();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
});
