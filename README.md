# Restaurant Ordering MVP

A web-based ordering system for small restaurants to replace manual LINE group chat ordering. Customers browse the menu, place orders, upload payment slips, and track delivery in real-time. Staff manage orders and menus through a secure dashboard.

## Live Demo

https://restaurant-ordering-app-1addc.web.app

## Features

### Customer
- Browse menu with photos, prices, and categories
- Add items to cart with required/optional modifier support
- Place orders as guest (no login required)
- Upload payment slip image
- Track order status in real-time with push notifications
- Burmese and English language toggle

### Staff Dashboard
- Real-time incoming orders with sound alert
- Accept, prepare, and deliver orders
- Cancel orders with reason
- Upload delivery confirmation photo
- Manage menu items, categories, and modifiers
- Mark items as sold out
- Busy mode and store closed announcements
- Settings: QR code, LINE ID, restaurant name

## Tech Stack

- **Frontend:** React + Vite
- **Database & Storage:** Firebase Firestore + Firebase Storage
- **Auth:** Firebase Authentication (staff email/password, customer anonymous)
- **Notifications:** Firebase Cloud Messaging (FCM)
- **Backend:** Firebase Cloud Functions
- **Hosting:** Firebase Hosting

## Local Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Fill in your Firebase project credentials

# Start dev server
npm run dev
```

## Security

- Firestore rules enforce customer data ownership
- Storage rules scope payment slip uploads to authenticated user UID
- Rate limiting via Cloud Functions (5 orders/hour per device)
- HTTP security headers via Firebase Hosting
