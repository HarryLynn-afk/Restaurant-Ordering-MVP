import { useCustomerLanguage } from '../utils/i18n';

const inputClass = 'border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary w-full';
const labelClass = 'text-sm font-medium text-foreground';

const errorClass = 'text-xs text-red-500 mt-0.5';

const OrderForm = ({ values, onChange, errors = {} }) => {
  const { t } = useCustomerLanguage();
  const handle = (field) => (e) => onChange({ ...values, [field]: e.target.value });
  const fieldClass = (field) => inputClass + (errors[field] ? ' border-red-400 focus:ring-red-400' : '');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className={labelClass}>{t('customer.form.fullName')} <span className="text-red-500">*</span></label>
        <input
          type="text"
          value={values.customerName}
          onChange={handle('customerName')}
          placeholder={t('customer.form.fullNamePlaceholder')}
          className={fieldClass('customerName')}
        />
        {errors.customerName && <p className={errorClass}>{errors.customerName}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label className={labelClass}>{t('customer.form.phoneNumber')} <span className="text-red-500">*</span></label>
        <input
          type="tel"
          value={values.phone}
          onChange={handle('phone')}
          placeholder={t('customer.form.phonePlaceholder')}
          className={fieldClass('phone')}
        />
        {errors.phone && <p className={errorClass}>{errors.phone}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label className={labelClass}>{t('customer.form.address')} <span className="text-red-500">*</span></label>
        <textarea
          value={values.address}
          onChange={handle('address')}
          placeholder={t('customer.form.addressPlaceholder')}
          rows={3}
          className={fieldClass('address') + ' resize-none'}
        />
        {errors.address && <p className={errorClass}>{errors.address}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label className={labelClass}>{t('customer.form.notes')}</label>
        <input
          type="text"
          value={values.notes}
          onChange={handle('notes')}
          placeholder={t('customer.form.notesPlaceholder')}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className={labelClass}>{t('customer.form.lineId')}</label>
        <input
          type="text"
          value={values.lineId}
          onChange={handle('lineId')}
          placeholder={t('customer.form.lineIdPlaceholder')}
          className={fieldClass('lineId')}
        />
        {errors.lineId && <p className={errorClass}>{errors.lineId}</p>}
        <p className="text-xs text-muted-foreground">{t('customer.form.lineIdHelp')}</p>
      </div>
    </div>
  );
};

export default OrderForm;
