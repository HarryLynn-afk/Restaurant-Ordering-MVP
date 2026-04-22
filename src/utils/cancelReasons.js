export const CANCEL_REASON_OPTIONS = [
  { value: 'Out of stock', translationKey: 'admin.orderCard.reasonOptions.outOfStock' },
  { value: 'Restaurant closed', translationKey: 'admin.orderCard.reasonOptions.restaurantClosed' },
  { value: 'Out of delivery area', translationKey: 'admin.orderCard.reasonOptions.outOfDeliveryArea' },
  { value: 'Other', translationKey: 'admin.orderCard.reasonOptions.other' },
];

export const getCancelReasonLabel = (reason, t) => {
  const knownReason = CANCEL_REASON_OPTIONS.find((option) => option.value === reason);
  return knownReason ? t(knownReason.translationKey) : reason;
};
