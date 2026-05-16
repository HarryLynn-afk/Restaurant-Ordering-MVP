import { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import OrderCard from '../../components/OrderCard';
import { normalizeAdminStatus, getAdminStatusFilters, ACTIVE_ADMIN_STATUSES } from '../../utils/orderStatus';
import { useAdminLanguage } from '../../utils/i18n';

const PILL_COLORS = {
  all:              { active: 'bg-foreground text-background',          badge: 'bg-muted-foreground/20 text-foreground' },
  new:              { active: 'bg-orange-500 text-white',               badge: 'bg-orange-100 text-orange-700' },
  unpaid:           { active: 'bg-red-500 text-white',                  badge: 'bg-red-100 text-red-700' },
  preparing:        { active: 'bg-yellow-500 text-white',               badge: 'bg-yellow-100 text-yellow-700' },
  ready:            { active: 'bg-purple-500 text-white',               badge: 'bg-purple-100 text-purple-700' },
  out_for_delivery: { active: 'bg-blue-500 text-white',                 badge: 'bg-blue-100 text-blue-700' },
  delivered:        { active: 'bg-green-500 text-white',                badge: 'bg-green-100 text-green-700' },
  cancelled:        { active: 'bg-gray-500 text-white',                 badge: 'bg-gray-100 text-gray-600' },
};

const todayMidnight = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const OrdersTab = ({ orders }) => {
  const { language, locale, t } = useAdminLanguage();
  const [selectedDate, setSelectedDate] = useState(todayMidnight);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
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

  const isSearching = search.trim().length > 0;
  const searchLower = search.trim().toLowerCase();

  const visibleOrders = isSearching
    ? orders.filter((o) =>
        o.customerName?.toLowerCase().includes(searchLower) ||
        o.phone?.toLowerCase().includes(searchLower) ||
        o.id?.toLowerCase().includes(searchLower) ||
        o.address?.toLowerCase().includes(searchLower) ||
        o.items?.some((item) => item.name?.toLowerCase().includes(searchLower))
      )
    : orders.filter((o) => {
        const d = o.createdAt?.toDate?.();
        if (!d) return false;
        const od = new Date(d);
        od.setHours(0, 0, 0, 0);
        return od.getTime() === selectedDate.getTime();
      });

  const counts = visibleOrders.reduce((acc, o) => {
    const s = normalizeAdminStatus(o.status);
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, { all: visibleOrders.length });

  const filtered = statusFilter === 'all'
    ? visibleOrders
    : visibleOrders.filter((o) => normalizeAdminStatus(o.status) === statusFilter);

  const sorted = [...filtered].sort((a, b) => {
    const aActive = ACTIVE_ADMIN_STATUSES.includes(normalizeAdminStatus(a.status));
    const bActive = ACTIVE_ADMIN_STATUSES.includes(normalizeAdminStatus(b.status));
    if (aActive !== bActive) return aActive ? -1 : 1;
    return (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0);
  });

  const statusFilters = getAdminStatusFilters(t);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
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

      {/* Date nav */}
      {!isSearching && (
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
      )}

      {/* Status filter pills */}
      {!isSearching && (
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {statusFilters.map((f) => {
            const isActive = statusFilter === f.key;
            const count = counts[f.key] ?? 0;
            const colors = PILL_COLORS[f.key] || PILL_COLORS.all;
            return (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap shrink-0 transition-colors ${
                  isActive ? colors.active : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {f.label}
                <span className={`text-xs font-bold min-w-[1.25rem] text-center px-1 py-0.5 rounded-full ${
                  isActive ? 'bg-black/15 text-inherit' : colors.badge
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Orders list */}
      {sorted.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          {isSearching
            ? t('admin.orders.noOrdersFound')
            : isToday
              ? t('admin.orders.noOrdersToday')
              : t('admin.orders.noOrdersOnDate', { date: dateLabel })}
        </div>
      ) : (
        <div className="space-y-4">
          {isSearching && (
            <p className="text-xs text-muted-foreground">
              {t('admin.orders.searchResults', {
                count: sorted.length,
                query: search.trim(),
                suffix: language === 'en' && sorted.length !== 1 ? 's' : '',
              })}
            </p>
          )}
          {sorted.map((o) => <OrderCard key={o.id} order={o} />)}
        </div>
      )}
    </div>
  );
};

export default OrdersTab;
