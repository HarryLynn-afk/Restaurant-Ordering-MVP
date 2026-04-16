const inputClass = 'border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary w-full';
const labelClass = 'text-sm font-medium text-foreground';

const OrderForm = ({ values, onChange }) => {
  const handle = (field) => (e) => onChange({ ...values, [field]: e.target.value });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className={labelClass}>ชื่อ – นามสกุล <span className="text-red-500">*</span></label>
        <input
          type="text"
          value={values.customerName}
          onChange={handle('customerName')}
          required
          placeholder="กรอกชื่อของคุณ"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className={labelClass}>เบอร์โทรศัพท์ <span className="text-red-500">*</span></label>
        <input
          type="tel"
          value={values.phone}
          onChange={handle('phone')}
          required
          placeholder="0812345678"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className={labelClass}>ที่อยู่จัดส่ง <span className="text-red-500">*</span></label>
        <textarea
          value={values.address}
          onChange={handle('address')}
          required
          placeholder="บ้านเลขที่ ซอย ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด"
          rows={3}
          className={inputClass + ' resize-none'}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className={labelClass}>หมายเหตุ (ถ้ามี)</label>
        <input
          type="text"
          value={values.notes}
          onChange={handle('notes')}
          placeholder="เช่น ไม่ใส่ผัก, เพิ่มพริก"
          className={inputClass}
        />
      </div>
    </div>
  );
};

export default OrderForm;
