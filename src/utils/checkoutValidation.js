const THAI_PHONE_RE = /^0[689]\d{8}$/;
const LINE_ID_RE = /^[a-zA-Z][a-zA-Z0-9._-]{3,19}$/;

export const validateCheckoutForm = (form, t) => {
  const errs = {};
  if (!form.customerName.trim()) errs.customerName = t('customer.validation.nameRequired');
  if (!form.phone.trim()) {
    errs.phone = t('customer.validation.phoneRequired');
  } else if (!THAI_PHONE_RE.test(form.phone.trim())) {
    errs.phone = t('customer.validation.phoneInvalid');
  }
  if (!form.address.trim()) errs.address = t('customer.validation.addressRequired');
  if (form.lineId.trim() && !LINE_ID_RE.test(form.lineId.trim())) {
    errs.lineId = t('customer.validation.lineIdInvalid');
  }
  return errs;
};
