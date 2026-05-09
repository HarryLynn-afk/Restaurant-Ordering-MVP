import { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import OrderCard from '../../components/OrderCard';
import OrderRow from '../../components/OrderRow';
import OrderDrawer from '../../components/OrderDrawer';
import KanbanBoard from './KanbanBoard';
import { normalizeAdminStatus } from '../../utils/orderStatus';
import { useAdminLanguage } from '../../utils/i18n';

const todayMidnight = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const SWIMLANES = [
  {
    key: 'action',
    labelKey: 'admin.orders.needsAction',
    statuses: ['new', 'unpaid'],
    defaultOpen: true,
  },
  {
    key: 'progress',
    labelKey: 'admin.orders.inProgress',
    statuses: ['preparing', 'ready', 'out_for_delivery'],
    defaultOpen: true,
  },
  {
    key: 'done',
    labelKey: 'admin.orders.done',
    statuses: ['delivered', 'cancelled'],
    defaultOpen: false,
  },
];

const SWIMLANE_HEADER_CLS = {
  action:   'bg-orange-50 text-orange-700 border-orange-200',
  progress: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  done:     'bg-muted text-muted-foreground border-border',
};

const OrdersTab = ({ orders }) => {
  const { language, locale, t } = useAdminLanguage();
  const [selectedDate, setSelectedDate] = useState(todayMidnight);
  const [search, setSearch] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [openLanes, setOpenLanes] = useState({ action: true, progress: true, done: false });
  const dateInputRef = useRef();

  const today = todayMidnight();
  const isToday = selectedDate.getTime() === today.getTime();

  const goDay = (dir) => {
    setSelectedDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + dir);
      return d;
    });
  };

  const handleDatePick = (e) => {
    if (!e.target.value) return;
    const [y, m, day] = e.target.value.split('-').map(Number);
    const d = new Date(y, m - 1, day);
    d.setHours(0, 0, 0, 0);
    setSelectedDate(d);
  };

  const dateLabel = isToday
    ? t('admin.orders.today')
    : selectedDate.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });

  const visibleOrders = orders.filter((o) => {
    const d = o.createdAt?.toDate?.();
    if (!d) return false;
    const od = new Date(d);
    od.setHours(0, 0, 0, 0);
    return od.getTime() === selectedDate.getTime();
  });

  // Sort: active statuses first, then by createdAt desc
  const sorted = [...visibleOrders].sort((a, b) => {
    const aActive = ['new', 'unpaid', 'preparing', 'ready', 'out_for_delivery'].includes(normalizeAdminStatus(a.status));
    const bActive = ['new', 'unpaid', 'preparing', 'ready', 'out_for_delivery'].includes(normalizeAdminStatus(b.status));
    if (aActive !== bActive) return aActive ? -1 : 1;
    return (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0);
  });

  const isSearching = search.trim().length > 0;
  const searchLower = search.trim().toLowerCase();
  const searchResults = isSearching
    ? orders.filter((o) =>
        o.customerName?.toLowerCase().includes(searchLower) ||
        o.phone?.toLowerCase().includes(searchLower) ||
        o.id?.toLowerCase().includes(searchLower) ||
        o.address?.toLowerCase().includes(searchLower) ||
        o.items?.some((item) => item.name?.toLowerCase().includes(searchLower))
      )
    : [];

  // Always use latest order data from the live list
  const selectedOrder = selectedOrderId
    ? orders.find((o) => o.id === selectedOrderId) ?? null
    : null;

  const toggleLane = (key) =>
    setOpenLanes((prev) => ({ ...prev, [key]: !prev[key] }));

  const DateNav = (
    <div className="flex items-center justify-center gap-2">
      <button
        onClick={() => goDay(-1)}
        className="p-1.5 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        onClick={() => dateInputRef.current?.showPicker?.()}
        className="text-sm font-semibold text-foreground px-4 py-1.5 rounded-lg hover:bg-muted transition-colors min-w-[130px] text-center"
      >
        {dateLabel}
      </button>
      <input
        ref={dateInputRef}
        type="date"
        value={selectedDate.toISOString().split('T')[0]}
        max={today.toISOString().split('T')[0]}
        onChange={handleDatePick}
        className="absolute opacity-0 pointer-events-none w-0 h-0"
      />
      <button
        onClick={() => goDay(1)}
        disabled={isToday}
        className="p-1.5 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground disabled:opacity-30 transition-colors"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );

  const SearchBar = (
    <div className="relative">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('admin.orders.searchPlaceholder')}
        className="w-full border border-border rounded-xl pl-8 pr-8 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      />
      {search && (
        <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
          <X size={14} />
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* ── MOBILE (< md): swimlanes + bottom drawer ── */}
      <div className="md:hidden space-y-3">
        {SearchBar}
        {DateNav}

        {isSearching ? (
          <>
            <p className="text-xs text-muted-foreground px-1">
              {t('admin.orders.searchResults', {
                count: searchResults.length,
                query: search.trim(),
                suffix: language === 'en' && searchResults.length !== 1 ? 's' : '',
              })}
            </p>
            {searchResults.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground text-sm">{t('admin.orders.noOrdersFound')}</div>
            ) : (
              <div className="rounded-xl border border-border overflow-hidden">
                {searchResults.map((o) => (
                  <OrderRow key={o.id} order={o} onTap={(order) => setSelectedOrderId(order.id)} />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {sorted.length === 0 && (
              <div className="text-center py-16 text-muted-foreground text-sm">
                {isToday ? t('admin.orders.noOrdersToday') : t('admin.orders.noOrdersOnDate', { date: dateLabel })}
              </div>
            )}

            {SWIMLANES.map((lane) => {
              const laneOrders = sorted.filter((o) =>
                lane.statuses.includes(normalizeAdminStatus(o.status))
              );
              if (laneOrders.length === 0 && lane.key !== 'action') return null;
              const isOpen = openLanes[lane.key];

              return (
                <div key={lane.key} className="rounded-xl border border-border overflow-hidden">
                  <button
                    onClick={() => toggleLane(lane.key)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold border-b ${SWIMLANE_HEADER_CLS[lane.key]}`}
                  >
                    <span>{t(lane.labelKey)}</span>
                    <span className="flex items-center gap-2">
                      <span className="opacity-70">{laneOrders.length}</span>
                      <span className="opacity-50">{isOpen ? '▲' : '▼'}</span>
                    </span>
                  </button>

                  {isOpen && (
                    laneOrders.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-5">
                        {isToday ? t('admin.orders.noOrdersToday') : t('admin.orders.noOrdersOnDate', { date: dateLabel })}
                      </p>
                    ) : (
                      laneOrders.map((o) => (
                        <OrderRow key={o.id} order={o} onTap={(order) => setSelectedOrderId(order.id)} />
                      ))
                    )
                  )}
                </div>
              );
            })}
          </>
        )}

        {selectedOrder && (
          <OrderDrawer order={selectedOrder} onClose={() => setSelectedOrderId(null)} />
        )}
      </div>

      {/* ── TABLET / DESKTOP (≥ md): Kanban columns ── */}
      <div className="hidden md:block space-y-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {SearchBar}
          {DateNav}
        </div>

        {isSearching ? (
          <div className="max-w-2xl mx-auto space-y-4">
            <p className="text-xs text-muted-foreground">
              {t('admin.orders.searchResults', {
                count: searchResults.length,
                query: search.trim(),
                suffix: language === 'en' && searchResults.length !== 1 ? 's' : '',
              })}
            </p>
            {searchResults.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground text-sm">{t('admin.orders.noOrdersFound')}</div>
            ) : (
              <div className="space-y-4">
                {searchResults.map((o) => <OrderCard key={o.id} order={o} />)}
              </div>
            )}
          </div>
        ) : (
          visibleOrders.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              {isToday ? t('admin.orders.noOrdersToday') : t('admin.orders.noOrdersOnDate', { date: dateLabel })}
            </div>
          ) : (
            <KanbanBoard orders={sorted} />
          )
        )}
      </div>
    </>
  );
};

export default OrdersTab;
