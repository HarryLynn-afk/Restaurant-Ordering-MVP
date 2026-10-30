import { describe, it, expect } from 'vitest';
import { formatCurrency } from './currency';

describe('formatCurrency', () => {
  it('formats a positive integer as Thai baht', () => {
    expect(formatCurrency(100)).toContain('100');
    expect(formatCurrency(100)).toContain('฿');
  });

  it('formats zero correctly', () => {
    expect(formatCurrency(0)).toContain('0');
  });

  it('handles null and undefined as zero', () => {
    expect(formatCurrency(null)).toContain('0');
    expect(formatCurrency(undefined)).toContain('0');
  });

  it('preserves satang so displayed totals match the payment amount', () => {
    expect(formatCurrency(100.5)).toContain('100.5');
    expect(formatCurrency(99.99)).toContain('99.99');
  });

  it('handles string numbers', () => {
    expect(formatCurrency('250')).toContain('250');
  });
});
