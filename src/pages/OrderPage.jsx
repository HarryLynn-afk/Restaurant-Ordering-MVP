// OrderPage - Main customer-facing ordering page
import { useState } from 'react';
import MenuDisplay from '../components/MenuDisplay';

// Sample menu data for testing
const sampleMenuItems = [
  {
    id: 1,
    name: 'ข้าวผัดกุ้ง',
    description: 'ข้าวผัดกับกุ้งสด ไข่ และผักรวม',
    price: 120,
    image: '/placeholder.svg',
    soldOut: false,
  },
  {
    id: 2,
    name: 'ผัดไทยกุ้งสด',
    description: 'ผัดไทยเส้นจันท์กับกุ้งสดตัวโต',
    price: 150,
    image: '/placeholder.svg',
    soldOut: false,
  },
  {
    id: 3,
    name: 'ต้มยำกุ้ง',
    description: 'ต้มยำน้ำข้นรสเข้มข้น กุ้งแม่น้ำสด',
    price: 200,
    image: '/placeholder.svg',
    soldOut: false,
  },
  {
    id: 4,
    name: 'ส้มตำไทย',
    description: 'ส้มตำรสจัดจ้าน พร้อมกุ้งแห้ง',
    price: 80,
    image: '/placeholder.svg',
    soldOut: true,
  },
];

const OrderPage = () => {
  const [cart, setCart] = useState([]);

  const handleAddToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    console.log('Added to cart:', item.name);
  };

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">🍜 ร้านอาหารไทย</h1>
          <div className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full">
            <span>🛒</span>
            <span className="font-medium">{totalItems} รายการ</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <MenuDisplay menuItems={sampleMenuItems} onAddToCart={handleAddToCart} />
      </main>
    </div>
  );
};

export default OrderPage;
