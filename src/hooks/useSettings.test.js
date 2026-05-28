import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/settings', () => ({
  subscribeToSettings: vi.fn(),
}));

import { subscribeToSettings } from '../services/settings';
import useSettings from './useSettings';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useSettings — initial state', () => {
  it('returns null before subscription fires', () => {
    subscribeToSettings.mockReturnValue(vi.fn());
    const { result } = renderHook(() => useSettings());
    expect(result.current.settings).toBeNull();
  });
});

describe('useSettings — subscription data', () => {
  it('reflects settings when subscription fires', () => {
    let callback;
    subscribeToSettings.mockImplementation((cb) => { callback = cb; return vi.fn(); });
    const { result } = renderHook(() => useSettings());
    act(() => callback({ restaurantName: 'Noona', busyMode: false }));
    expect(result.current.settings).toEqual({ restaurantName: 'Noona', busyMode: false });
  });

  it('reflects the latest value when subscription fires multiple times', () => {
    let callback;
    subscribeToSettings.mockImplementation((cb) => { callback = cb; return vi.fn(); });
    const { result } = renderHook(() => useSettings());
    act(() => callback({ busyMode: false }));
    act(() => callback({ busyMode: true }));
    expect(result.current.settings.busyMode).toBe(true);
  });
});

describe('useSettings — cleanup', () => {
  it('calls the unsubscribe function on unmount', () => {
    const unsubscribe = vi.fn();
    subscribeToSettings.mockReturnValue(unsubscribe);
    const { unmount } = renderHook(() => useSettings());
    unmount();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it('does not call unsubscribe before unmount', () => {
    const unsubscribe = vi.fn();
    subscribeToSettings.mockReturnValue(unsubscribe);
    renderHook(() => useSettings());
    expect(unsubscribe).not.toHaveBeenCalled();
  });
});
