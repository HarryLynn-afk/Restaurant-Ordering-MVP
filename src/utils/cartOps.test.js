import { describe, it, expect } from 'vitest';
import { addToCart, removeFromCart, purgeFromCart } from './cartOps';

describe('addToCart', () => {
  it('adds a new item with quantity 1', () => {
    const item = { id: 'a1', name: 'Fried Rice', price: 60 };
    const next = addToCart([], item);
    expect(next).toHaveLength(1);
    expect(next[0].id).toBe('a1');
    expect(next[0].quantity).toBe(1);
    expect(next[0].cartKey).toBe('a1');
  });

  it('increments quantity when the same item is added again', () => {
    const item = { id: 'a1', name: 'Fried Rice', price: 60 };
    const cart = [{ ...item, cartKey: 'a1', quantity: 1 }];
    const next = addToCart(cart, item);
    expect(next).toHaveLength(1);
    expect(next[0].quantity).toBe(2);
  });

  it('uses cartKey over id for deduplication when cartKey is present', () => {
    const item = { id: 'a1', cartKey: 'a1-spicy', name: 'Fried Rice', price: 70 };
    const cart = [{ ...item, quantity: 1 }];
    const next = addToCart(cart, item);
    expect(next).toHaveLength(1);
    expect(next[0].quantity).toBe(2);
  });
});

describe('removeFromCart', () => {
  it('decrements quantity when item quantity is greater than 1', () => {
    const cart = [{ id: 'a1', cartKey: 'a1', name: 'Fried Rice', price: 60, quantity: 3 }];
    const next = removeFromCart(cart, 'a1');
    expect(next).toHaveLength(1);
    expect(next[0].quantity).toBe(2);
  });

  it('removes the item entirely when quantity is 1', () => {
    const cart = [{ id: 'a1', cartKey: 'a1', name: 'Fried Rice', price: 60, quantity: 1 }];
    const next = removeFromCart(cart, 'a1');
    expect(next).toHaveLength(0);
  });

  it('leaves cart unchanged when key does not exist', () => {
    const cart = [{ id: 'a1', cartKey: 'a1', name: 'Fried Rice', price: 60, quantity: 2 }];
    const next = removeFromCart(cart, 'unknown');
    expect(next).toHaveLength(1);
    expect(next[0].quantity).toBe(2);
  });
});

describe('purgeFromCart', () => {
  it('removes sold-out items and returns them as removed', () => {
    const cart = [
      { id: 'a1', cartKey: 'a1', name: 'Fried Rice', price: 60, quantity: 2 },
      { id: 'a2', cartKey: 'a2', name: 'Spring Roll', price: 40, quantity: 1 },
    ];
    const { next, removed } = purgeFromCart(cart, new Set(['a1']));
    expect(next).toHaveLength(1);
    expect(next[0].id).toBe('a2');
    expect(removed).toHaveLength(1);
    expect(removed[0].id).toBe('a1');
  });

  it('returns unchanged cart and empty removed when no IDs match', () => {
    const cart = [{ id: 'a1', cartKey: 'a1', name: 'Fried Rice', price: 60, quantity: 1 }];
    const { next, removed } = purgeFromCart(cart, new Set(['z9']));
    expect(next).toHaveLength(1);
    expect(removed).toHaveLength(0);
  });

  it('returns empty arrays when cart is empty', () => {
    const { next, removed } = purgeFromCart([], new Set(['a1']));
    expect(next).toHaveLength(0);
    expect(removed).toHaveLength(0);
  });
});
