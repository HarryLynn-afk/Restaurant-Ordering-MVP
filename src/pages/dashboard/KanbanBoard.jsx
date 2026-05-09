import OrderCard from '../../components/OrderCard';
import { normalizeAdminStatus } from '../../utils/orderStatus';
import { useAdminLanguage } from '../../utils/i18n';

const COLUMNS = [
  { key: 'new',              headerCls: 'bg-orange-50 text-orange-700 border-orange-200' },
  { key: 'unpaid',           headerCls: 'bg-red-50 text-red-700 border-red-200' },
  { key: 'preparing',        headerCls: 'bg-yellow-50 text-yellow-800 border-yellow-200' },
  { key: 'ready',            headerCls: 'bg-purple-50 text-purple-700 border-purple-200' },
  { key: 'out_for_delivery', headerCls: 'bg-blue-50 text-blue-700 border-blue-200' },
  { key: 'delivered',        headerCls: 'bg-green-50 text-green-700 border-green-200' },
];

const KanbanBoard = ({ orders }) => {
  const { t } = useAdminLanguage();

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 items-start">
      {COLUMNS.map(({ key, headerCls }) => {
        const columnOrders = orders.filter(
          (o) => normalizeAdminStatus(o.status) === key
        );

        return (
          <div key={key} className="shrink-0 w-[260px] flex flex-col rounded-xl border border-border bg-muted/30 overflow-hidden">
            {/* Column header */}
            <div className={`flex items-center justify-between px-3 py-2 border-b text-xs font-semibold ${headerCls}`}>
              <span>{t(`admin.status.card.${key}`)}</span>
              <span className="opacity-70">{columnOrders.length}</span>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-3 p-3 overflow-y-auto max-h-[calc(100vh-280px)]">
              {columnOrders.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  {t('admin.orders.noOrdersInColumn')}
                </p>
              ) : (
                columnOrders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default KanbanBoard;
