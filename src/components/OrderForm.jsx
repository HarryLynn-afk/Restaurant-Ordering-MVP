const inputClass = 'border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary w-full';
const labelClass = 'text-sm font-medium text-foreground';

const errorClass = 'text-xs text-red-500 mt-0.5';

const OrderForm = ({ values, onChange, errors = {} }) => {
  const handle = (field) => (e) => onChange({ ...values, [field]: e.target.value });
  const fieldClass = (field) => inputClass + (errors[field] ? ' border-red-400 focus:ring-red-400' : '');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className={labelClass}>Full Name <span className="text-red-500">*</span></label>
        <input
          type="text"
          value={values.customerName}
          onChange={handle('customerName')}
          placeholder="Enter your name"
          className={fieldClass('customerName')}
        />
        {errors.customerName && <p className={errorClass}>{errors.customerName}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label className={labelClass}>Phone Number <span className="text-red-500">*</span></label>
        <input
          type="tel"
          value={values.phone}
          onChange={handle('phone')}
          placeholder="e.g. 0812345678"
          className={fieldClass('phone')}
        />
        {errors.phone && <p className={errorClass}>{errors.phone}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label className={labelClass}>Delivery Address <span className="text-red-500">*</span></label>
        <textarea
          value={values.address}
          onChange={handle('address')}
          placeholder="House number, street, district, city"
          rows={3}
          className={fieldClass('address') + ' resize-none'}
        />
        {errors.address && <p className={errorClass}>{errors.address}</p>}
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
          placeholder="e.g. yourlineid"
          className={fieldClass('lineId')}
        />
        {errors.lineId && <p className={errorClass}>{errors.lineId}</p>}
        <p className="text-xs text-muted-foreground">So the restaurant can contact you via LINE</p>
      </div>
    </div>
  );
};

export default OrderForm;
