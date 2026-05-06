import { describe, it, expect } from 'vitest';
import {
  normalizeAdminStatus,
  ACTIVE_ADMIN_STATUSES,
  getCustomerStatusView,
} from './orderStatus';

const fakeT = (key) => key;

describe('normalizeAdminStatus', () => {
  it('maps "paid" to "preparing"', () => {
    expect(normalizeAdminStatus('paid')).toBe('preparing');
  });

  it('returns other statuses unchanged', () => {
    expect(normalizeAdminStatus('new')).toBe('new');
    expect(normalizeAdminStatus('delivered')).toBe('delivered');
    expect(normalizeAdminStatus('cancelled')).toBe('cancelled');
  });
});

describe('ACTIVE_ADMIN_STATUSES', () => {
  it('contains the expected active statuses', () => {
    expect(ACTIVE_ADMIN_STATUSES).toEqual(['new', 'unpaid', 'preparing', 'ready']);
  });

  it('does not include terminal statuses', () => {
    expect(ACTIVE_ADMIN_STATUSES).not.toContain('delivered');
    expect(ACTIVE_ADMIN_STATUSES).not.toContain('cancelled');
  });
});

describe('getCustomerStatusView', () => {
  it('returns danger tone for unpaid without slip', () => {
    const view = getCustomerStatusView('unpaid', false, fakeT);
    expect(view.tone).toBe('danger');
    expect(view.stepIndex).toBe(0);
  });

  it('returns info tone for unpaid with slip uploaded', () => {
    const view = getCustomerStatusView('unpaid', true, fakeT);
    expect(view.tone).toBe('info');
    expect(view.stepIndex).toBe(0);
  });

  it('returns warning tone for preparing', () => {
    const view = getCustomerStatusView('preparing', false, fakeT);
    expect(view.tone).toBe('warning');
    expect(view.stepIndex).toBe(1);
  });

  it('treats "paid" the same as "preparing" for the customer view', () => {
    const paid = getCustomerStatusView('paid', false, fakeT);
    const preparing = getCustomerStatusView('preparing', false, fakeT);
    expect(paid.stepIndex).toBe(preparing.stepIndex);
    expect(paid.tone).toBe(preparing.tone);
  });

  it('returns success tone for delivered', () => {
    const view = getCustomerStatusView('delivered', false, fakeT);
    expect(view.tone).toBe('success');
    expect(view.stepIndex).toBe(3);
  });

  it('falls back to "new" view for unknown status', () => {
    const view = getCustomerStatusView('something-weird', false, fakeT);
    expect(view.stepIndex).toBe(0);
    expect(view.tone).toBe('info');
  });
});
