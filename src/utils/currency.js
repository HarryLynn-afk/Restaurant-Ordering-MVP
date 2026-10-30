const bahtFormatter = new Intl.NumberFormat('th-TH-u-nu-latn', {
  style: 'currency',
  currency: 'THB',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export const formatCurrency = (amount) => bahtFormatter.format(Number(amount ?? 0));

const priceFormatter = new Intl.NumberFormat('en-US', { useGrouping: false, maximumFractionDigits: 2 });

// Match display rounding before saving so every client sees whole satang.
export const normalizePrice = value => {
  const price = Number(value);
  const satang = Math.round(Number(priceFormatter.format(price)) * 100);
  if (!Number.isFinite(price) || price < 0 || !Number.isSafeInteger(satang)) {
    throw new RangeError('Price must be a non-negative amount.');
  }
  return satang / 100;
};
