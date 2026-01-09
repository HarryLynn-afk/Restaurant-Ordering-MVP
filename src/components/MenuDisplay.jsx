// MenuDisplay Component
// Displays restaurant menu items in a responsive grid

import { ShoppingCart } from 'lucide-react';

const formatPrice = (price) => {
  return `฿${price.toLocaleString()}`;
};

const MenuItemCard = ({ item, onAddToCart }) => {
  const handleImageError = (e) => {
    e.target.src = '/placeholder.svg';
  };

  return (
    <div className="bg-card rounded-xl overflow-hidden shadow-soft hover:shadow-lg transition-shadow duration-300 border border-border">
      {/* Item Image */}
      <div className="aspect-square overflow-hidden bg-muted">
        <img
          src={item.image || '/placeholder.svg'}
          alt={item.name}
          onError={handleImageError}
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
        />
      </div>

      {/* Item Details */}
      <div className="p-4 space-y-3">
        <div className="flex justify-between items-start gap-2">
          <h3 className="font-semibold text-foreground text-lg leading-tight">
            {item.name}
          </h3>
          {item.soldOut && (
            <span className="px-2 py-0.5 bg-destructive/10 text-destructive text-xs font-medium rounded-full shrink-0">
              หมด
            </span>
          )}
        </div>

        {item.description && (
          <p className="text-muted-foreground text-sm line-clamp-2">
            {item.description}
          </p>
        )}

        <div className="flex items-center justify-between pt-2">
          <span className="text-primary font-bold text-xl">
            {formatPrice(item.price)}
          </span>

          <button
            onClick={() => onAddToCart(item)}
            disabled={item.soldOut}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShoppingCart size={16} />
            <span>เพิ่ม</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const MenuDisplay = ({ menuItems = [], onAddToCart }) => {
  // Empty state
  if (menuItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
          <ShoppingCart size={40} className="text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          ยังไม่มีเมนู
        </h3>
        <p className="text-muted-foreground text-sm">
          เมนูจะปรากฏที่นี่เมื่อร้านเพิ่มรายการ
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">เมนูวันนี้</h2>
        <span className="text-sm text-muted-foreground">
          {menuItems.length} รายการ
        </span>
      </div>

      {/* Menu Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {menuItems.map((item) => (
          <MenuItemCard
            key={item.id}
            item={item}
            onAddToCart={onAddToCart}
          />
        ))}
      </div>
    </div>
  );
};

export default MenuDisplay;
