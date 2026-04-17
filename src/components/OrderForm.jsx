const inputClass = 'border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary w-full';
const labelClass = 'text-sm font-medium text-foreground';

const OrderForm = ({ values, onChange }) => {
  const handle = (field) => (e) => onChange({ ...values, [field]: e.target.value });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className={labelClass}>Full Name <span className="text-red-500">*</span></label>
        <input
          type="text"
          value={values.customerName}
          onChange={handle('customerName')}
          required
          placeholder="Enter your name"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className={labelClass}>Phone Number <span className="text-red-500">*</span></label>
        <input
          type="tel"
          value={values.phone}
          onChange={handle('phone')}
          required
          placeholder="e.g. 0812345678"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className={labelClass}>Delivery Address <span className="text-red-500">*</span></label>
        <textarea
          value={values.address}
          onChange={handle('address')}
          required
          placeholder="House number, street, district, city"
          rows={3}
          className={inputClass + ' resize-none'}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className={labelClass}>Notes (optional)</label>
        <input
          type="text"
          value={values.notes}
          onChange={handle('notes')}
          placeholder="e.g. No onions, extra spicy"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className={labelClass}>LINE ID (optional)</label>
        <input
          type="text"
          value={values.lineId}
          onChange={handle('lineId')}
          placeholder="e.g. @yourlineid"
          className={inputClass}
        />
        <p className="text-xs text-muted-foreground">So the restaurant can contact you via LINE</p>
      </div>
    </div>
  );
};

export default OrderForm;
