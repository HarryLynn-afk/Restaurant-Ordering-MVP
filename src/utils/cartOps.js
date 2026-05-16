const getItemKey = (item) => item.cartKey || item.id;

export const addToCart = (cart, item) => {
  const key = getItemKey(item);
  const existing = cart.find((i) => getItemKey(i) === key);
  return existing
    ? cart.map((i) => getItemKey(i) === key ? { ...i, quantity: i.quantity + 1 } : i)
    : [...cart, { ...item, cartKey: key, quantity: 1 }];
};
export const removeFromCart = (cart, key) => {
  const existing = cart.find((i) => getItemKey(i) === key);
  if (!existing) return cart;
  return existing.quantity === 1
    ? cart.filter((i) => getItemKey(i) !== key)
    : cart.map((i) => getItemKey(i) === key ? { ...i, quantity: i.quantity - 1 } : i);
};
export const purgeFromCart = (cart, soldOutIds) => ({
  removed: cart.filter((i) => soldOutIds.has(i.id)),
  next: cart.filter((i) => !soldOutIds.has(i.id)),
});
