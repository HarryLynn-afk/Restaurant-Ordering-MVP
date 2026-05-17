import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ensureCustomerSession } from '../firebase';
import { getOrder } from '../services/orders';
import { isTerminalOrderStatus } from '../utils/orderStatus';

const LAST_ORDER_KEY = 'lastOrderId';

export default function useLastOrder() {
  const navigate = useNavigate();

  const redirectIfActive = useCallback(async () => {
    const orderId = localStorage.getItem(LAST_ORDER_KEY);
    if (!orderId) return;
    try {
      await ensureCustomerSession();
      const order = await getOrder(orderId);
      if (order && !isTerminalOrderStatus(order.status)) {
        navigate(`/order/${orderId}`, { replace: true });
      } else {
        localStorage.removeItem(LAST_ORDER_KEY);
      }
    } catch {
      localStorage.removeItem(LAST_ORDER_KEY);
    }
  }, [navigate]);

  const saveLastOrder = useCallback((orderId) => {
    localStorage.setItem(LAST_ORDER_KEY, orderId);
    localStorage.removeItem('cart');
  }, []);

  const clearLastOrder = useCallback(() => {
    localStorage.removeItem(LAST_ORDER_KEY);
  }, []);

  return { redirectIfActive, saveLastOrder, clearLastOrder };
}
