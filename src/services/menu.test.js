import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  getDocs: vi.fn(),
  addDoc: vi.fn(),
  doc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  onSnapshot: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
}));

vi.mock('../firebase', () => ({ db: {} }));

import { getDocs, updateDoc, addDoc } from 'firebase/firestore';
import { getSoldOutItemIds, toggleSoldOut, markAllAvailable, addMenuItem, updateMenuItem } from './menu';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getSoldOutItemIds', () => {
  it('returns a Set containing only sold-out item IDs', async () => {
    vi.mocked(getDocs).mockResolvedValueOnce({
      docs: [
        { id: 'item1', data: () => ({ soldOut: true }) },
        { id: 'item2', data: () => ({ soldOut: false }) },
        { id: 'item3', data: () => ({ soldOut: true }) },
      ],
    });

    const result = await getSoldOutItemIds();

    expect(result).toBeInstanceOf(Set);
    expect(result.has('item1')).toBe(true);
    expect(result.has('item3')).toBe(true);
    expect(result.has('item2')).toBe(false);
    expect(result.size).toBe(2);
  });

  it('returns an empty Set when no items are sold out', async () => {
    vi.mocked(getDocs).mockResolvedValueOnce({
      docs: [
        { id: 'item1', data: () => ({ soldOut: false }) },
      ],
    });

    const result = await getSoldOutItemIds();
    expect(result.size).toBe(0);
  });
});

describe('toggleSoldOut', () => {
  it('flips soldOut from false to true', async () => {
    vi.mocked(updateDoc).mockResolvedValueOnce(undefined);
    await toggleSoldOut({ id: 'item1', soldOut: false });
    const [, fields] = vi.mocked(updateDoc).mock.calls[0];
    expect(fields).toEqual({ soldOut: true });
  });

  it('flips soldOut from true to false', async () => {
    vi.mocked(updateDoc).mockResolvedValueOnce(undefined);
    await toggleSoldOut({ id: 'item1', soldOut: true });
    const [, fields] = vi.mocked(updateDoc).mock.calls[0];
    expect(fields).toEqual({ soldOut: false });
  });
});

describe('markAllAvailable', () => {
  it('only updates items that are sold out', async () => {
    vi.mocked(updateDoc).mockResolvedValue(undefined);

    const items = [
      { id: 'item1', soldOut: true },
      { id: 'item2', soldOut: false },
      { id: 'item3', soldOut: true },
    ];

    await markAllAvailable(items);

    expect(vi.mocked(updateDoc)).toHaveBeenCalledTimes(2);
  });

  it('does nothing when no items are sold out', async () => {
    await markAllAvailable([{ id: 'item1', soldOut: false }]);
    expect(vi.mocked(updateDoc)).not.toHaveBeenCalled();
  });
});

it('saves menu prices at satang precision for create and update', async () => {
  await addMenuItem({ name: 'Rice', price: 1.005 });
  expect(vi.mocked(addDoc).mock.calls[0][1].price).toBe(1.01);
  await updateMenuItem('rice', { price: 10.235 });
  expect(vi.mocked(updateDoc).mock.calls[0][1]).toEqual({ price: 10.24 });
});
