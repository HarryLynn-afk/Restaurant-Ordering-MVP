import { describe, it, expect, vi, afterEach } from 'vitest';
import { formatRelativeTime } from './relativeTime';

const NOW = new Date('2026-05-16T12:00:00Z').getTime();

const dateMinutesAgo = (mins) => new Date(NOW - mins * 60 * 1000);
const dateHoursAgo = (hrs) => new Date(NOW - hrs * 60 * 60 * 1000);

describe('formatRelativeTime', () => {
  afterEach(() => vi.restoreAllMocks());

  const freeze = () => vi.spyOn(Date, 'now').mockReturnValue(NOW);

  it('returns "just now" for a date less than 1 minute ago', () => {
    freeze();
    expect(formatRelativeTime(dateMinutesAgo(0))).toBe('just now');
    expect(formatRelativeTime(dateMinutesAgo(0.5))).toBe('just now');
  });

  it('returns minutes ago for dates 1–59 minutes ago', () => {
    freeze();
    expect(formatRelativeTime(dateMinutesAgo(1))).toBe('1m ago');
    expect(formatRelativeTime(dateMinutesAgo(5))).toBe('5m ago');
    expect(formatRelativeTime(dateMinutesAgo(59))).toBe('59m ago');
  });

  it('returns hours ago for dates 1–23 hours ago', () => {
    freeze();
    expect(formatRelativeTime(dateHoursAgo(1))).toBe('1h ago');
    expect(formatRelativeTime(dateHoursAgo(2))).toBe('2h ago');
    expect(formatRelativeTime(dateHoursAgo(23))).toBe('23h ago');
  });

  it('returns null for dates 24+ hours ago so caller can fall back to locale date', () => {
    freeze();
    expect(formatRelativeTime(dateHoursAgo(24))).toBeNull();
    expect(formatRelativeTime(dateHoursAgo(48))).toBeNull();
  });
});
