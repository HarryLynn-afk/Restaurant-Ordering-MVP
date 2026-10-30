const bahtFormatter = new Intl.NumberFormat('th-TH-u-nu-latn', {
  style: 'currency',
  currency: 'THB',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export const formatCurrency = (amount) => bahtFormatter.format(Number(amount ?? 0));
