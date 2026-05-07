import { useCallback, useEffect, useState, useRef } from 'react';
import { addToCart, removeFromCart, purgeFromCart } from '../utils/cartOps';

const CART_KEY = 'cart';
const readCart = () => {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
};
const writeCart = (cart) => localStorage.setItem(CART_KEY, JSON.stringify(cart));

const useCart = () => {
  const [cart, setCart] = useState(readCart);
  const cartRef = useRef(cart);

  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  const addItem = useCallback((item) => {
    setCart((prev) => {
      const next = addToCart(prev, item);
      writeCart(next);
      return next;
    });
  }, []);

  const removeItem = useCallback((key) => {
    setCart((prev) => {
      const next = removeFromCart(prev, key);
      writeCart(next);
      return next;
    });
  }, []);

  const purgeIds = useCallback((soldOutIds) => {
    const { next, removed } = purgeFromCart(cartRef.current, soldOutIds);
    if (removed.length > 0) {
      setCart(next);
      writeCart(next);
    }
    return removed;
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    localStorage.removeItem(CART_KEY);
  }, []);

  return {
    cart,
    addItem,
    removeItem,
    purgeIds,
    clearCart,
    totalItems: cart.reduce((sum, i) => sum + i.quantity, 0),
    totalPrice: cart.reduce((sum, i) => sum + i.price * i.quantity, 0),
  };
};

export default useCart;
