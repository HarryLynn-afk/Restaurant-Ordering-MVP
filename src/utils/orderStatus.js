export const normalizeAdminStatus = (status) => (
  status === 'paid' ? 'preparing' : status
);

const ADMIN_STATUS_FILTER_KEYS = ['all', 'new', 'unpaid', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'];

export const ACTIVE_ADMIN_STATUSES = ['new', 'unpaid', 'preparing', 'ready', 'out_for_delivery'];

export const TERMINAL_ORDER_STATUSES = ['delivered', 'cancelled'];

export const ADMIN_IN_PROGRESS_STATUSES = ['preparing', 'ready', 'out_for_delivery'];

export const ADMIN_IN_PROGRESS_NEXT_STATUSES = ['preparing', 'ready', 'out_for_delivery', 'delivered'];

const ADMIN_STATUS_CARD_KEYS = ['new', 'unpaid', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'];

const ADMIN_PROGRESS_STATUS_KEYS = ['unpaid', 'preparing', 'ready', 'out_for_delivery', 'delivered'];

const CUSTOMER_PROGRESS_STEP_MAP = [
  { key: 'received', labelKey: 'customer.orderStatus.status.orderReceived' },
  { key: 'preparing', labelKey: 'customer.orderStatus.status.preparing' },
  { key: 'ready', labelKey: 'customer.orderStatus.status.ready' },
  { key: 'delivery', labelKey: 'customer.orderStatus.status.outForDelivery' },
  { key: 'delivered', labelKey: 'customer.orderStatus.status.delivered' },
];

export const getAdminStatusFilters = (t) => (
  ADMIN_STATUS_FILTER_KEYS.map((key) => ({
    key,
    label: t(`admin.status.filter.${key}`),
  }))
);

export const getAdminStatusLabel = (status, t) => {
  const normalized = normalizeAdminStatus(status);
  return ADMIN_STATUS_CARD_KEYS.includes(normalized)
    ? t(`admin.status.card.${normalized}`)
    : status;
};

export const canAdminCancelOrder = (status, hasPaymentSlip = false) => {
  const normalized = normalizeAdminStatus(status);
  return normalized === 'new' || (normalized === 'unpaid' && !hasPaymentSlip);
};

export const isTerminalOrderStatus = (status) => (
  TERMINAL_ORDER_STATUSES.includes(normalizeAdminStatus(status))
);

export const getAdminProgressStatuses = (t) => (
  ADMIN_PROGRESS_STATUS_KEYS.map((key) => ({
    key,
    label: t(`admin.status.progress.${key}`),
  }))
);

export const getCustomerProgressSteps = (t) => (
  CUSTOMER_PROGRESS_STEP_MAP.map((step) => ({
    key: step.key,
    label: t(step.labelKey),
  }))
);

export const ADMIN_STATUS_BADGE_COLORS = {
  new:             'bg-orange-100 text-orange-600',
  unpaid:          'bg-red-100 text-red-600',
  preparing:       'bg-yellow-100 text-yellow-700',
  ready:           'bg-purple-100 text-purple-600',
  out_for_delivery:'bg-blue-100 text-blue-600',
  delivered:       'bg-green-100 text-green-600',
  cancelled:       'bg-gray-100 text-gray-500',
};

export const CUSTOMER_TONE_CONTAINER = {
  danger:  'bg-red-50 border-red-200',
  info:    'bg-blue-50 border-blue-200',
  warning: 'bg-amber-50 border-amber-200',
  success: 'bg-green-50 border-green-200',
};

export const CUSTOMER_TONE_TEXT = {
  danger:  'text-red-700',
  info:    'text-blue-800',
  warning: 'text-amber-800',
  success: 'text-green-800',
};

export const getCustomerStatusView = (status, hasPaymentSlip, t) => {
  switch (status) {
    case 'unpaid':
      if (hasPaymentSlip) {
        return {
          headline: t('customer.orderStatus.status.paymentReview'),
          description: t('customer.orderStatus.statusDescription.paymentReview'),
          stepIndex: 0,
          tone: 'info',
        };
      }
      return {
        headline: t('customer.orderStatus.status.pleasePay'),
        description: t('customer.orderStatus.statusDescription.pleasePay'),
        stepIndex: 0,
        tone: 'danger',
      };
    case 'paid':
    case 'preparing':
      return {
        headline: t('customer.orderStatus.status.preparing'),
        description: t('customer.orderStatus.statusDescription.preparing'),
        stepIndex: 1,
        tone: 'warning',
      };
    case 'ready':
      return {
        headline: t('customer.orderStatus.status.ready'),
        description: t('customer.orderStatus.statusDescription.ready'),
        stepIndex: 2,
        tone: 'warning',
      };
    case 'out_for_delivery':
      return {
        headline: t('customer.orderStatus.status.outForDelivery'),
        description: t('customer.orderStatus.statusDescription.outForDelivery'),
        stepIndex: 3,
        tone: 'info',
      };
    case 'delivered':
      return {
        headline: t('customer.orderStatus.status.delivered'),
        description: t('customer.orderStatus.statusDescription.delivered'),
        stepIndex: 4,
        tone: 'success',
      };
    case 'new':
    default:
      return {
        headline: t('customer.orderStatus.status.orderReceived'),
        description: t('customer.orderStatus.statusDescription.orderReceived'),
        stepIndex: 0,
        tone: 'info',
      };
  }
};
