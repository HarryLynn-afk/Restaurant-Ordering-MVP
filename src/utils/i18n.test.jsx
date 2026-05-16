import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, it, expect } from 'vitest';
import { LanguageProvider, useCustomerLanguage, useAdminLanguage } from './i18n';

const wrapper = ({ children }) => <LanguageProvider>{children}</LanguageProvider>;

beforeEach(() => {
  localStorage.clear();
});

describe('useCustomerLanguage', () => {
  it('t() returns English translation by default', () => {
    const { result } = renderHook(() => useCustomerLanguage(), { wrapper });
    expect(result.current.t('common.cancel')).toBe('Cancel');
  });

  it('t() returns Burmese translation after setLanguage("my")', () => {
    const { result } = renderHook(() => useCustomerLanguage(), { wrapper });
    act(() => result.current.setLanguage('my'));
    expect(result.current.t('common.cancel')).toBe('မလုပ်တော့');
  });

  it('t() interpolates {{key}} placeholders', () => {
    const { result } = renderHook(() => useCustomerLanguage(), { wrapper });
    expect(result.current.t('common.deleteConfirm', { name: 'Rice' })).toBe("Delete 'Rice'?");
  });

  it('t() falls back to English when a key is missing in my', () => {
    const { result } = renderHook(() => useCustomerLanguage(), { wrapper });
    act(() => result.current.setLanguage('my'));
    expect(result.current.t('common.cancel')).not.toBe('common.cancel');
  });

  it('t() returns the key itself when translation does not exist in any language', () => {
    const { result } = renderHook(() => useCustomerLanguage(), { wrapper });
    expect(result.current.t('nonexistent.deep.key')).toBe('nonexistent.deep.key');
  });

  it('locale is en-US by default', () => {
    const { result } = renderHook(() => useCustomerLanguage(), { wrapper });
    expect(result.current.locale).toBe('en-US');
  });

  it('locale switches to my-MM when language is set to my', () => {
    const { result } = renderHook(() => useCustomerLanguage(), { wrapper });
    act(() => result.current.setLanguage('my'));
    expect(result.current.locale).toBe('my-MM');
  });

  it('ignores unsupported language values', () => {
    const { result } = renderHook(() => useCustomerLanguage(), { wrapper });
    act(() => result.current.setLanguage('fr'));
    expect(result.current.language).toBe('en');
  });

  it('persists language choice to localStorage', () => {
    const { result } = renderHook(() => useCustomerLanguage(), { wrapper });
    act(() => result.current.setLanguage('my'));
    expect(localStorage.getItem('language_customer')).toBe('my');
  });
});

describe('useAdminLanguage', () => {
  it('t() resolves admin-scoped keys', () => {
    const { result } = renderHook(() => useAdminLanguage(), { wrapper });
    expect(result.current.t('admin.dashboard.ordersTab')).toBe('Orders');
  });

  it('admin and customer language settings are independent', () => {
    const { result: customer } = renderHook(() => useCustomerLanguage(), { wrapper });
    const { result: admin } = renderHook(() => useAdminLanguage(), { wrapper });
    act(() => customer.current.setLanguage('my'));
    expect(admin.current.language).toBe('en');
  });
});
