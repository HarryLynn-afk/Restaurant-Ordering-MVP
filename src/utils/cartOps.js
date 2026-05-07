export const addToCart = (cart, item) => {
  const key = item.cartKey || item.id;
  const existing = cart.find((i) => (i.cartKey || i.id) === key);
  return existing
    ? cart.map((i) => (i.cartKey || i.id) === key ? { ...i, quantity: i.quantity + 1 } : i)
    : [...cart, { ...item, cartKey: key, quantity: 1 }];
};
export const removeFromCart = (cart, key) => {
  const existing = cart.find((i) => (i.cartKey || i.id) === key);
  if (!existing) return cart;
  return existing.quantity === 1
    ? cart.filter((i) => (i.cartKey || i.id) !== key)
    : cart.map((i) => (i.cartKey || i.id) === key ? { ...i, quantity: i.quantity - 1 } : i);
};
export const purgeFromCart = (cart, soldOutIds) => ({
  removed: cart.filter((i) => soldOutIds.has(i.id)),
  next: cart.filter((i) => !soldOutIds.has(i.id)),
});
