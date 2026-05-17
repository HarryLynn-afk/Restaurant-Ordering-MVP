import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import useOrderAudio from './useOrderAudio';

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useOrderAudio — interface', () => {
  it('returns a playChime function', () => {
    const { result } = renderHook(() => useOrderAudio());
    expect(typeof result.current.playChime).toBe('function');
  });
});

describe('useOrderAudio — playChime safety', () => {
  it('does not throw when AudioContext is unavailable', () => {
    // jsdom has no AudioContext; playChime must survive gracefully via try/catch
    const { result } = renderHook(() => useOrderAudio());
    expect(() => act(() => result.current.playChime())).not.toThrow();
  });

  it('does not throw when called multiple times', () => {
    const { result } = renderHook(() => useOrderAudio());
    expect(() => {
      act(() => result.current.playChime());
      act(() => result.current.playChime());
    }).not.toThrow();
  });

  it('does not throw when called before any user interaction', () => {
    // No touchstart/click has fired to unlock the AudioContext
    const { result } = renderHook(() => useOrderAudio());
    expect(() => act(() => result.current.playChime())).not.toThrow();
  });
});

describe('useOrderAudio — event listeners', () => {
  it('registers touchstart and click listeners on mount for AudioContext unlock', () => {
    const addSpy = vi.spyOn(document, 'addEventListener');
    renderHook(() => useOrderAudio());
    expect(addSpy).toHaveBeenCalledWith('touchstart', expect.any(Function), { once: true });
    expect(addSpy).toHaveBeenCalledWith('click', expect.any(Function), { once: true });
    addSpy.mockRestore();
  });

  it('removes touchstart and click listeners on unmount', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const { unmount } = renderHook(() => useOrderAudio());
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('touchstart', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('click', expect.any(Function));
    removeSpy.mockRestore();
  });
});
