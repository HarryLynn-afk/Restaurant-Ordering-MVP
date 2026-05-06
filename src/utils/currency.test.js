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

  it('rounds decimals to whole baht', () => {
    expect(formatCurrency(100.5)).not.toContain('.');
    expect(formatCurrency(99.99)).toContain('100');
  });

  it('handles string numbers', () => {
    expect(formatCurrency('250')).toContain('250');
  });
});
