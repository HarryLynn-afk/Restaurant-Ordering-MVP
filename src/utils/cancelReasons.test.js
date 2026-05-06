import { describe, it, expect } from 'vitest';
import { CANCEL_REASON_OPTIONS, getCancelReasonLabel } from './cancelReasons';

const fakeT = (key) => `translated:${key}`;

describe('CANCEL_REASON_OPTIONS', () => {
  it('contains all expected reasons', () => {
    const values = CANCEL_REASON_OPTIONS.map((o) => o.value);
    expect(values).toContain('Out of stock');
    expect(values).toContain('Restaurant closed');
    expect(values).toContain('Out of delivery area');
    expect(values).toContain('Invalid payment slip');
    expect(values).toContain('Other');
  });

  it('every option has a translation key', () => {
    for (const option of CANCEL_REASON_OPTIONS) {
      expect(option.translationKey).toBeTruthy();
      expect(option.translationKey).toContain('admin.orderCard.reasonOptions');
    }
  });
});

describe('getCancelReasonLabel', () => {
  it('translates a known reason', () => {
    const label = getCancelReasonLabel('Out of stock', fakeT);
    expect(label).toBe('translated:admin.orderCard.reasonOptions.outOfStock');
  });

  it('returns custom reason as-is when not in known list', () => {
    const label = getCancelReasonLabel('Customer requested cancellation', fakeT);
    expect(label).toBe('Customer requested cancellation');
  });

  it('translates "Invalid payment slip"', () => {
    const label = getCancelReasonLabel('Invalid payment slip', fakeT);
    expect(label).toContain('invalidPaymentSlip');
  });
});
