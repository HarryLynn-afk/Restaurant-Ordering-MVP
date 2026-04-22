export const normalizeAdminStatus = (status) => (
  status === 'paid' ? 'preparing' : status
);

export const ADMIN_STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'unpaid', label: 'Unpaid' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'ready', label: 'Ready' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
];

export const ACTIVE_ADMIN_STATUSES = ['new', 'unpaid', 'preparing', 'ready'];

export const ADMIN_STATUS_LABELS = {
  new: 'New Order',
  unpaid: 'Unpaid',
  preparing: 'Preparing',
  ready: 'Ready',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export const ADMIN_PROGRESS_STATUSES = [
  { key: 'unpaid', label: 'Unpaid' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'ready', label: 'Ready' },
  { key: 'delivered', label: 'Delivered' },
];

export const CUSTOMER_PROGRESS_STEPS = [
  { key: 'received', label: 'Order Received' },
  { key: 'preparing', label: 'Preparing your order' },
  { key: 'delivery', label: 'Out for Delivery' },
  { key: 'delivered', label: 'Delivered' },
];

export const getCustomerStatusView = (status) => {
  switch (status) {
    case 'unpaid':
      return { headline: 'Please Pay', stepIndex: 0 };
    case 'paid':
    case 'preparing':
      return { headline: 'Preparing your order', stepIndex: 1 };
    case 'ready':
      return { headline: 'Out for Delivery', stepIndex: 2 };
    case 'delivered':
      return { headline: 'Delivered', stepIndex: 3 };
    case 'new':
    default:
      return { headline: 'Order Received', stepIndex: 0 };
  }
};
