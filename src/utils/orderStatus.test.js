import { describe, it, expect } from 'vitest';
import {
  ADMIN_IN_PROGRESS_NEXT_STATUSES,
  ADMIN_IN_PROGRESS_STATUSES,
  TERMINAL_ORDER_STATUSES,
  normalizeAdminStatus,
  ACTIVE_ADMIN_STATUSES,
  canAdminCancelOrder,
  isTerminalOrderStatus,
  getCustomerStatusView,
  getAdminStatusLabel,
  getAdminProgressStatuses,
  getAdminStatusFilters,
  getCustomerProgressSteps,
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
    expect(ACTIVE_ADMIN_STATUSES).toEqual(['new', 'unpaid', 'preparing', 'ready', 'out_for_delivery']);
  });

  it('does not include terminal statuses', () => {
    expect(ACTIVE_ADMIN_STATUSES).not.toContain('delivered');
    expect(ACTIVE_ADMIN_STATUSES).not.toContain('cancelled');
  });
});

describe('admin status transitions', () => {
  it('only exposes active cooking/delivery statuses in the in-progress dropdown', () => {
    expect(ADMIN_IN_PROGRESS_STATUSES).toEqual(['preparing', 'ready', 'out_for_delivery']);
  });

  it('does not allow cancellation from the in-progress dropdown', () => {
    expect(ADMIN_IN_PROGRESS_NEXT_STATUSES).toEqual(['preparing', 'ready', 'out_for_delivery', 'delivered']);
    expect(ADMIN_IN_PROGRESS_NEXT_STATUSES).not.toContain('cancelled');
  });

  it('allows admin cancellation only before payment has been submitted', () => {
    expect(canAdminCancelOrder('new')).toBe(true);
    expect(canAdminCancelOrder('unpaid', false)).toBe(true);
    expect(canAdminCancelOrder('unpaid', true)).toBe(false);
    expect(canAdminCancelOrder('preparing')).toBe(false);
    expect(canAdminCancelOrder('ready')).toBe(false);
    expect(canAdminCancelOrder('out_for_delivery')).toBe(false);
    expect(canAdminCancelOrder('delivered')).toBe(false);
  });

  it('treats legacy paid status as in-progress for cancellation rules', () => {
    expect(canAdminCancelOrder('paid')).toBe(false);
  });
});

describe('terminal order statuses', () => {
  it('contains delivered and cancelled only', () => {
    expect(TERMINAL_ORDER_STATUSES).toEqual(['delivered', 'cancelled']);
  });

  it('identifies statuses that should release the customer to order again', () => {
    expect(isTerminalOrderStatus('delivered')).toBe(true);
    expect(isTerminalOrderStatus('cancelled')).toBe(true);
    expect(isTerminalOrderStatus('new')).toBe(false);
    expect(isTerminalOrderStatus('unpaid')).toBe(false);
    expect(isTerminalOrderStatus('preparing')).toBe(false);
    expect(isTerminalOrderStatus('ready')).toBe(false);
    expect(isTerminalOrderStatus('out_for_delivery')).toBe(false);
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
    expect(view.stepIndex).toBe(4);
  });

  it('falls back to "new" view for unknown status', () => {
    const view = getCustomerStatusView('something-weird', false, fakeT);
    expect(view.stepIndex).toBe(0);
    expect(view.tone).toBe('info');
  });
});

describe('getAdminStatusLabel', () => {
  it('returns translated label for a known status', () => {
    const label = getAdminStatusLabel('new', fakeT);
    expect(label).toBe('admin.status.card.new');
  });

  it('normalizes "paid" to "preparing" before translating', () => {
    const label = getAdminStatusLabel('paid', fakeT);
    expect(label).toBe('admin.status.card.preparing');
  });

  it('returns the raw status when status is not in the known list', () => {
    const label = getAdminStatusLabel('unknown-status', fakeT);
    expect(label).toBe('unknown-status');
  });
});

describe('getAdminProgressStatuses', () => {
  it('returns an entry for each in-progress status', () => {
    const statuses = getAdminProgressStatuses(fakeT);
    const keys = statuses.map((s) => s.key);
    expect(keys).toEqual(['unpaid', 'preparing', 'ready', 'out_for_delivery', 'delivered']);
  });

  it('each entry has a translated label', () => {
    const statuses = getAdminProgressStatuses(fakeT);
    statuses.forEach((s) => {
      expect(s.label).toContain('admin.status.progress.');
    });
  });
});

describe('getAdminStatusFilters', () => {
  it('returns an entry for every filter key including "all"', () => {
    const filters = getAdminStatusFilters(fakeT);
    const keys = filters.map((f) => f.key);
    expect(keys).toContain('all');
    expect(keys).toContain('new');
    expect(keys).toContain('cancelled');
  });

  it('each entry has a translated label', () => {
    const filters = getAdminStatusFilters(fakeT);
    filters.forEach((f) => {
      expect(f.label).toContain('admin.status.filter.');
    });
  });
});

describe('getCustomerProgressSteps', () => {
  it('returns 4 steps in order', () => {
    const steps = getCustomerProgressSteps(fakeT);
    expect(steps).toHaveLength(5);
    expect(steps[0].key).toBe('received');
    expect(steps[4].key).toBe('delivered');
  });

  it('each step has a translated label', () => {
    const steps = getCustomerProgressSteps(fakeT);
    steps.forEach((s) => {
      expect(s.label).toContain('customer.orderStatus.status.');
    });
  });
});
