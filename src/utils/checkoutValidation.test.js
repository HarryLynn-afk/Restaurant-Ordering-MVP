import { validateCheckoutForm } from './checkoutValidation';

const t = (key) => key;

const valid = {
  customerName: 'Alice',
  phone: '0812345678',
  address: '123 Main St',
  notes: '',
  lineId: '',
};

describe('validateCheckoutForm', () => {
  it('returns {} for a fully valid form', () => {
    expect(validateCheckoutForm(valid, t)).toEqual({});
  });

  it('returns nameRequired when customerName is empty', () => {
    const result = validateCheckoutForm({ ...valid, customerName: '' }, t);
    expect(result.customerName).toBe('customer.validation.nameRequired');
  });

  it('returns phoneRequired when phone is empty', () => {
    const result = validateCheckoutForm({ ...valid, phone: '' }, t);
    expect(result.phone).toBe('customer.validation.phoneRequired');
  });

  it('returns phoneInvalid when phone format is wrong', () => {
    const result = validateCheckoutForm({ ...valid, phone: '1234567890' }, t);
    expect(result.phone).toBe('customer.validation.phoneInvalid');
  });

  it('returns addressRequired when address is empty', () => {
    const result = validateCheckoutForm({ ...valid, address: '' }, t);
    expect(result.address).toBe('customer.validation.addressRequired');
  });

  it('returns lineIdInvalid when lineId format is wrong', () => {
    const result = validateCheckoutForm({ ...valid, lineId: '123' }, t);
    expect(result.lineId).toBe('customer.validation.lineIdInvalid');
  });

  it('returns no lineId error when lineId is empty', () => {
    const result = validateCheckoutForm({ ...valid, lineId: '' }, t);
    expect(result.lineId).toBeUndefined();
  });
});
