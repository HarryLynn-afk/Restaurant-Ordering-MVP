export const normalizeAdminStatus = (status) => (
  status === 'paid' ? 'preparing' : status
);

const ADMIN_STATUS_FILTER_KEYS = ['all', 'new', 'unpaid', 'preparing', 'ready', 'delivered', 'cancelled'];

export const ACTIVE_ADMIN_STATUSES = ['new', 'unpaid', 'preparing', 'ready'];

const ADMIN_STATUS_CARD_KEYS = ['new', 'unpaid', 'preparing', 'ready', 'delivered', 'cancelled'];

const ADMIN_PROGRESS_STATUS_KEYS = ['unpaid', 'preparing', 'ready', 'delivered'];

const CUSTOMER_PROGRESS_STEP_MAP = [
  { key: 'received', labelKey: 'customer.orderStatus.status.orderReceived' },
  { key: 'preparing', labelKey: 'customer.orderStatus.status.preparing' },
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

export const getCustomerStatusView = (status, t) => {
  switch (status) {
    case 'unpaid':
      return { headline: t('customer.orderStatus.status.pleasePay'), stepIndex: 0 };
    case 'paid':
    case 'preparing':
      return { headline: t('customer.orderStatus.status.preparing'), stepIndex: 1 };
    case 'ready':
      return { headline: t('customer.orderStatus.status.outForDelivery'), stepIndex: 2 };
    case 'delivered':
      return { headline: t('customer.orderStatus.status.delivered'), stepIndex: 3 };
    case 'new':
    default:
      return { headline: t('customer.orderStatus.status.orderReceived'), stepIndex: 0 };
  }
};
