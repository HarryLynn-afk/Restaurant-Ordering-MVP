import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../firebase', () => ({
  ensureCustomerSession: vi.fn(),
}));

vi.mock('../services/orders', () => ({
  getOrder: vi.fn(),
}));

import { ensureCustomerSession } from '../firebase';
import { getOrder } from '../services/orders';
import useLastOrder from './useLastOrder';

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  ensureCustomerSession.mockResolvedValue(undefined);
});

describe('useLastOrder — redirectIfActive', () => {
  it('does nothing when lastOrderId is absent', async () => {
    const { result } = renderHook(() => useLastOrder());
    await act(() => result.current.redirectIfActive());
    expect(getOrder).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates to the order page when the order has an active status', async () => {
    localStorage.setItem('lastOrderId', 'order-123');
    getOrder.mockResolvedValue({ status: 'new' });
    const { result } = renderHook(() => useLastOrder());
    await act(() => result.current.redirectIfActive());
    expect(mockNavigate).toHaveBeenCalledWith('/order/order-123', { replace: true });
  });

  it('navigates for preparing status (non-terminal)', async () => {
    localStorage.setItem('lastOrderId', 'order-456');
    getOrder.mockResolvedValue({ status: 'preparing' });
    const { result } = renderHook(() => useLastOrder());
    await act(() => result.current.redirectIfActive());
    expect(mockNavigate).toHaveBeenCalledWith('/order/order-456', { replace: true });
  });

  it('clears lastOrderId and does not navigate when order has a terminal status', async () => {
    localStorage.setItem('lastOrderId', 'order-789');
    getOrder.mockResolvedValue({ status: 'delivered' });
    const { result } = renderHook(() => useLastOrder());
    await act(() => result.current.redirectIfActive());
    expect(localStorage.getItem('lastOrderId')).toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('clears lastOrderId when the order is cancelled', async () => {
    localStorage.setItem('lastOrderId', 'order-abc');
    getOrder.mockResolvedValue({ status: 'cancelled' });
    const { result } = renderHook(() => useLastOrder());
    await act(() => result.current.redirectIfActive());
    expect(localStorage.getItem('lastOrderId')).toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('clears lastOrderId when getOrder throws', async () => {
    localStorage.setItem('lastOrderId', 'order-err');
    getOrder.mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => useLastOrder());
    await act(() => result.current.redirectIfActive());
    expect(localStorage.getItem('lastOrderId')).toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

describe('useLastOrder — saveLastOrder', () => {
  it('saves orderId to lastOrderId in localStorage', () => {
    const { result } = renderHook(() => useLastOrder());
    act(() => result.current.saveLastOrder('new-order-id'));
    expect(localStorage.getItem('lastOrderId')).toBe('new-order-id');
  });

  it('removes cart from localStorage when saving an order', () => {
    localStorage.setItem('cart', JSON.stringify([{ id: 'item-1' }]));
    const { result } = renderHook(() => useLastOrder());
    act(() => result.current.saveLastOrder('new-order-id'));
    expect(localStorage.getItem('cart')).toBeNull();
  });
});

describe('useLastOrder — clearLastOrder', () => {
  it('removes lastOrderId from localStorage', () => {
    localStorage.setItem('lastOrderId', 'order-to-clear');
    const { result } = renderHook(() => useLastOrder());
    act(() => result.current.clearLastOrder());
    expect(localStorage.getItem('lastOrderId')).toBeNull();
  });

  it('is a no-op when lastOrderId is already absent', () => {
    const { result } = renderHook(() => useLastOrder());
    expect(() => act(() => result.current.clearLastOrder())).not.toThrow();
    expect(localStorage.getItem('lastOrderId')).toBeNull();
  });
});
