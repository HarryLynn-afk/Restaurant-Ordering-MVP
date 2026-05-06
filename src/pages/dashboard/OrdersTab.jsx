import { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import OrderCard from '../../components/OrderCard';
import {
  ACTIVE_ADMIN_STATUSES,
  getAdminStatusFilters,
  normalizeAdminStatus,
} from '../../utils/orderStatus';
import { useAdminLanguage } from '../../utils/i18n';

const matchesStatusFilter = (order, filter) => (
  filter === 'all' || normalizeAdminStatus(order.status) === filter
);

const todayMidnight = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const OrdersTab = ({ orders, filter, setFilter }) => {
  const { language, locale, t } = useAdminLanguage();
  const [selectedDate, setSelectedDate] = useState(todayMidnight);
  const [search, setSearch] = useState('');
  const dateInputRef = useRef();
  const statusFilters = getAdminStatusFilters(t);

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

  const sorted = [...visibleOrders].sort((a, b) =>
    (ACTIVE_ADMIN_STATUSES.includes(normalizeAdminStatus(a.status)) ? 0 : 1)
      - (ACTIVE_ADMIN_STATUSES.includes(normalizeAdminStatus(b.status)) ? 0 : 1)
  );

  const filtered = sorted.filter((o) => matchesStatusFilter(o, filter));

  return (
    <div className="space-y-4">
      {/* Search */}
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

      {isSearching ? (
        <>
          <p className="text-xs text-muted-foreground">{t('admin.orders.searchResults', {
            count: searchResults.length,
            query: search.trim(),
            suffix: language === 'en' && searchResults.length !== 1 ? 's' : '',
          })}</p>
          {searchResults.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">{t('admin.orders.noOrdersFound')}</div>
          ) : (
            <div className="space-y-4">{searchResults.map((order) => <OrderCard key={order.id} order={order} />)}</div>
          )}
        </>
      ) : (
      <>

      {/* Day navigator */}
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
          className="p-1.5 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Filter pills — mobile: 2-row grid, desktop: horizontal scroll */}
      <div className="sm:hidden grid grid-cols-3 gap-1.5">
        {statusFilters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`py-1.5 rounded-xl text-xs font-medium text-center transition-colors ${
              filter === f.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {f.label}
            {f.key !== 'all' && (
              <span className="ml-1 opacity-70">
                ({visibleOrders.filter((o) => matchesStatusFilter(o, f.key)).length})
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="hidden sm:block relative">
        <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
          {statusFilters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                filter === f.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.label}
              {f.key !== 'all' && (
                <span className="ml-1 opacity-70">
                  ({visibleOrders.filter((o) => matchesStatusFilter(o, f.key)).length})
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          {isToday
            ? (
              filter === 'all'
                ? t('admin.orders.noOrdersToday')
                : t('admin.orders.noFilteredOrdersToday', {
                    status: statusFilters.find((statusOption) => statusOption.key === filter)?.label || '',
                  })
            )
            : t('admin.orders.noOrdersOnDate', { date: dateLabel })}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((order) => <OrderCard key={order.id} order={order} />)}
        </div>
      )}
      </>
      )}
    </div>
  );
};

export default OrdersTab;
