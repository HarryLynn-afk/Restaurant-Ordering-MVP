import { describe, it, expect } from 'vitest';
import { formatCurrency, normalizePrice } from './currency';

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

it('normalizes configured prices to whole satang', () => {
  expect(normalizePrice('1.005')).toBe(1.01);
  expect(normalizePrice(10.235)).toBe(10.24);
  expect(normalizePrice(10.075)).toBe(10.08);
  expect(normalizePrice(0)).toBe(0);
  expect(normalizePrice('')).toBe(0);
});

it.each([-1, NaN, Infinity, 'not a price', Number.MAX_VALUE])('rejects invalid price %s', value => {
  expect(() => normalizePrice(value)).toThrow(RangeError);
});
