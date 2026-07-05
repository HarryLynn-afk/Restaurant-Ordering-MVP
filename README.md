# NOONA Restaurant Ordering MVP

A modern web-based ordering system designed for small restaurants (particularly cafes and casual dining) to eliminate manual LINE group chat ordering. Customers browse the menu, build a cart, submit orders, upload payment proof, and track delivery status in real-time. Restaurant staff manage orders, menu inventory, and delivery through a single secure dashboard with real-time notifications.

**Live Demo:** https://restaurant-ordering-app-1addc.web.app

---

## 📋 Table of Contents

- [Overview](#overview)
- [Customer Features](#customer-features)
- [Staff Features](#staff-features)
- [Order Flow](#order-flow)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Development Guide](#development-guide)
- [Security & Rate Limiting](#security--rate-limiting)
- [Deployment](#deployment)
- [File Structure](#file-structure)
- [Key Decisions](#key-decisions)

---

## Overview

NOONA replaces the chaos of LINE group ordering with a unified web platform:

- **Customers** place orders via a public link (no login, no signup)
- **Staff** manage all orders, menu items, and inventory from a protected dashboard
- **Communication** is automated via push notifications (FCM) instead of manual messages
- **Languages** support both English and Burmese for diverse user bases

**Target Users:** Small restaurants (50–200 orders/day), cafes, casual dining in Thailand and Southeast Asia.

---

## Customer Features

### Browsing & Ordering

- ✅ Browse full menu with product photos, prices, and categories
- ✅ Search and filter menu items
- ✅ Add modifiers (required choices + optional extras) to items
- ✅ Persistent shopping cart (saved in browser storage)
- ✅ Real-time cart summary and total price calculation

### Checkout & Payment

- ✅ Simple checkout form (name, phone, delivery address, special notes)
- ✅ View restaurant QR code for bank transfer payment
- ✅ Upload payment slip (receipt image) for proof of payment
- ✅ Automatic currency formatting (Thai Baht ฿)
- ✅ Form validation and error feedback

### Order Tracking

- ✅ Track order status in real-time by order ID
- ✅ Real-time push notifications when status changes
- ✅ See estimated delivery time and delivery photo
- ✅ View order history from last session
- ✅ One-tap "View Orders" button from home screen

### Accessibility

- ✅ Mobile-first responsive design
- ✅ iOS PWA installation (Add to Home Screen)
- ✅ Offline support (service worker caching)
- ✅ Burmese (မြန်မာ) + English language toggle
- ✅ Sound notifications for new messages

---

## Staff Features

### Real-time Order Management

- ✅ Live incoming orders with sound/visual alerts
- ✅ Filterable orders by date, status, or search (#shortID)
- ✅ Scrollable status pills with live order counts
- ✅ Accept → Prepare → Ready → Out for Delivery → Delivered flow
- ✅ One-click order cancellation with reason selection
- ✅ Undo button on every status change (5-second window)

### Order Details & Fulfillment

- ✅ View complete order (items, modifiers, delivery address)
- ✅ See payment slip image (customer proof of transfer)
- ✅ Upload delivery confirmation photo
- ✅ View staff-only payment confirmation modal before marking "Preparing"
- ✅ View staff-only confirmation modal before marking "Delivered"

### Menu Management

- ✅ Add/edit/delete menu items with image upload
- ✅ Organize items by category
- ✅ Add required and optional modifiers to items
- ✅ Mark items as sold out without deleting
- ✅ Bulk update via image upload (future: spreadsheet import)

### Settings & Configuration

- ✅ Upload restaurant QR code image for payment
- ✅ Set restaurant name and LINE ID
- ✅ Configure FCM token for staff notifications
- ✅ View store open/closed status (future: scheduling)

---

## Order Flow

### 🛒 Customer Order Flow

```
1. Browse Menu (OrderPage)
   ├─ Load menu from Firestore in real-time
   ├─ Search/filter by category
   ├─ Tap item → ModifierSheet
   └─ Select modifiers (required) + extras (optional) → Add to cart

2. Review Cart (CartDrawer)
   ├─ See items + quantity + modifiers
   ├─ Update qty or remove items
   └─ Tap "Checkout"

3. Checkout (CheckoutPage)
   ├─ Enter: name, phone, delivery address, special notes
   ├─ Validate required fields
   ├─ Tap "Place Order" → Firestore write (order doc)
   └─ Redirects to PaymentPage

4. Upload Payment Proof (PaymentPage)
   ├─ See restaurant QR code (from settings)
   ├─ Customer makes transfer
   ├─ Upload payment slip image → Firebase Storage
   ├─ Firestore updates order.paymentSlipUrl
   └─ Redirects to OrderStatusPage with order ID

5. Track Status (OrderStatusPage)
   ├─ Real-time listen to order status + delivery photo
   ├─ Shows: unpaid → preparing → ready → out_for_delivery → delivered
   ├─ Gets push notification on each status change
   ├─ Can view delivery photo once out_for_delivery
   └─ Order persisted to localStorage for future reference
```

### 👨‍💼 Staff Order Management Flow

```
1. Login (LoginPage)
   └─ Email + password → Firebase Auth (non-anonymous)

2. Dashboard (Dashboard.jsx)
   ├─ Tab 1: Orders (OrdersTab)
   │  ├─ View orders by date, status, search
   │  ├─ See live counts: unpaid (urgent), preparing, ready, out_for_delivery
   │  └─ Tap order card → expand details
   │
   ├─ Tab 2: Menu (MenuTab)
   │  ├─ Add new item (name, price, photo, modifiers)
   │  ├─ Edit existing items
   │  ├─ Mark sold out
   │  └─ Delete items
   │
   └─ Tab 3: Settings (SettingsTab)
      ├─ Upload QR code image
      ├─ Set restaurant name + LINE ID
      └─ View FCM token status

3. Process Order (OrderCard)
   ├─ See payment slip image
   ├─ Tap "Start Preparing"
      │  ├─ Show confirmation modal (prevent accident)
      │  └─ Send "Preparing" push notification to customer
      │
   ├─ Tap "Mark Ready"
      │  ├─ Send "Ready" notification (customer can pick up)
      │  └─ Ready time logged
      │
   ├─ Tap "Out for Delivery"
      │  ├─ Upload delivery photo (rider/staff)
      │  └─ Send "Out for delivery" notification
      │
   ├─ Tap "Mark Delivered"
      │  ├─ Show confirmation modal
      │  └─ Send "Delivered" + delivery photo
      │
   ├─ Tap "Cancel" (before payment only)
      │  ├─ Select reason
      │  └─ Send cancellation notification
      │
   └─ "Undo" button on every change (5s window)
```

For detailed flow diagrams and edge cases, see [ORDER_FLOW.md](ORDER_FLOW.md).

---

## Architecture

### Design Principles

- **Modular Services:** All Firebase calls isolated in `src/services/`
- **Single Subscriptions:** Shared hooks (`useSettings()`, `useCart()`) prevent duplicate Firestore listeners
- **Real-time UI:** Firestore `onSnapshot` listeners for live order/menu updates
- **Undo Pattern:** Module-level event bus (`undoStore.js`) survives component re-mounts
- **Localization:** Pure translation dict in `translations.js` — never embed logic in i18n

### Core Services

| Service                | Responsibility                                           |
| ---------------------- | -------------------------------------------------------- |
| `firebase.js`          | Firebase init, session management, FCM helpers           |
| `services/menu.js`     | Menu CRUD + image upload                                 |
| `services/orders.js`   | Order CRUD, real-time subscriptions, payment slip upload |
| `services/settings.js` | Restaurant settings read/write                           |
| `services/_upload.js`  | Shared upload utility (public + restricted access)       |

### Key Hooks

| Hook              | Purpose                                                         |
| ----------------- | --------------------------------------------------------------- |
| `useCart()`       | Manage customer shopping cart (localStorage-backed)             |
| `useSettings()`   | Read restaurant settings (single shared Firestore subscription) |
| `useLastOrder()`  | Manage lastOrderId persistence across sessions                  |
| `useOrderAudio()` | Play order notification chime (hides Web Audio API lifecycle)   |

---

## Tech Stack

### Frontend

- **React 19** — UI framework
- **Vite 7** — Lightning-fast build tool
- **Tailwind CSS 3** — Utility-first styling
- **React Router v7** — Client-side routing
- **lucide-react** — Icon library
- **Vitest** + **@testing-library/react** — Unit & component testing

### Backend & Infrastructure

- **Firebase Firestore** — Real-time NoSQL database
- **Firebase Storage** — Image upload (menu, payment slips, delivery photos)
- **Firebase Authentication** — Staff (email/password) + customer (anonymous)
- **Firebase Cloud Functions (v2)** — Notifications, rate limiting, business logic
- **Firebase Cloud Messaging (FCM)** — Push notifications to staff + customers
- **Firebase Hosting** — Production deployment

### Security & Rules

- **Firestore Rules** — Field-level validation, customer data ownership, rate limit enforcement
- **Storage Rules** — Public access (menu/QR), restricted access (payment slips)
- **Cloud Functions** — Server-side rate limiting (5 orders/hour/device)

---

## Quick Start

### Prerequisites

- Node.js 18+
- Firebase project (create at https://console.firebase.google.com)
- npm or yarn

### Installation

```bash
# 1. Clone the repository
git clone <repo-url>
cd restaurant-ordering-app

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env

# 4. Fill in Firebase credentials in .env
# Get these from Firebase Console → Project Settings
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

# 5. Start development server
npm run dev
# Opens http://localhost:5173

# 6. Create test staff account in Firebase Console
# Authentication → Add user → email: test@restaurant.com, password: Test123!
```

### Verify Installation

```bash
# Run test suite
npm run test:all

# Build for production
npm run build

# Check linting
npm run lint
```

---

## Development Guide

### File Organization

```
src/
├── firebase.js              # Firebase setup + helpers
├── App.jsx                  # Main routing
├── main.jsx                 # React entry point
├── services/                # ALL Firestore/Storage calls
│  ├── menu.js
│  ├── orders.js
│  ├── settings.js
│  └── _upload.js
├── pages/                   # Full-page components
│  ├── OrderPage.jsx
│  ├── CheckoutPage.jsx
│  ├── PaymentPage.jsx
│  ├── OrderStatusPage.jsx
│  ├── LoginPage.jsx
│  └── Dashboard.jsx
├── components/              # Reusable UI components
├── hooks/                   # Custom React hooks
└── utils/                   # Pure utility functions
```

### Adding a New Feature

1. **Plan the flow** — Map out user interactions and state changes
2. **Define data model** — Add Firestore collection/fields
3. **Write tests first** (TDD) — `npm run test`
4. **Implement service** — Add CRUD in `src/services/`
5. **Build UI components** — Use service hooks, test with `@testing-library/react`
6. **Add i18n strings** — Edit `src/utils/translations.js`
7. **Test on mobile** — Use Chrome DevTools device emulation or actual device
8. **Deploy** — `firebase deploy`

### Code Style

- ESLint rules enforce consistency (`npm run lint`)
- No raw Firebase imports in components — use services
- Pure functions over class components
- Hooks for state management
- Tailwind for styling (no CSS-in-JS)
- i18n dictionary in `translations.js` (never embed strings)

### Running Tests

```bash
# Run all tests
npm run test:all

# Watch mode (auto-run on file change)
npm run test:watch

# Unit tests only
npx vitest run src

# Storage rules integration tests (requires Firebase emulator)
npm run test:rules

# Coverage report
npx vitest run --coverage src
```

---

## Security & Rate Limiting

### Firestore Security

- **Customer orders** — Each customer can only read/write their own orders (via UID)
- **Rate limiting** — Cloud Function limits to 5 orders/hour/device (enforced server-side)
- **Payment slips** — Write-only access; staff can read via special function

### Storage Security

- **Public files** — Menu images, QR codes, delivery photos readable by all
- **Private files** — Payment slips readable only by uploader + staff with admin claim

### Best Practices

- Never commit `.env` to version control
- Rotate Firebase API keys every 6 months
- Use separate Firebase projects for dev/staging/production
- Monitor Cloud Function logs for abuse patterns

---

## Deployment

### Deploy to Firebase Hosting

```bash
# 1. Build the project
npm run build

# 2. Deploy
firebase deploy

# 3. View live at https://your-project.web.app
```

### Deploy Cloud Functions

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

### Preview Deployment

```bash
# Test locally before deploying
firebase emulators:start

# In another terminal
npm run dev
```

### Rollback

```bash
# View deployment history
firebase hosting:channel:list

# Rollback to previous version
firebase hosting:channel:delete <channel-id>
```

---

## File Structure

### Root Level

- `CLAUDE.md` — Development context (updated each session)
- `PLAN.md` — Original build plan (historical reference)
- `FUTURE_FEATURES.md` — Planned features not yet implemented
- `firebase.json` — Firebase project config
- `firestore.rules` — Database security rules
- `storage.rules` — File storage access rules
- `vite.config.js` — Vite build configuration
- `tailwind.config.js` — Tailwind CSS configuration
- `eslint.config.js` — Linting rules

### `/public`

- `manifest.json` — PWA manifest (mobile app metadata)
- `firebase-messaging-sw.js` — Service worker for push notifications
- `logo.png` — App icon

### `/functions`

- `index.js` — Cloud Functions (notifyStaffOnNewOrder, notifyCustomerOnStatusChange)
- `package.json` — Cloud Function dependencies

### `/tests`

- `storage.rules.test.js` — Integration tests for Storage security rules (Firebase emulator)

---

## Key Decisions

| Decision                              | Rationale                                                          |
| ------------------------------------- | ------------------------------------------------------------------ |
| **Anonymous auth for customers**      | No signup friction — `ensureCustomerSession()` handles auth lazily |
| **Email/password for staff**          | Simple, secure, no social login overhead                           |
| **Real-time Firestore listeners**     | Live order updates without polling                                 |
| **Cloud Functions for notifications** | Server-side rate limiting + reliable delivery                      |
| **Module-level undo store**           | Toast survives component re-mounts                                 |
| **Separated upload utilities**        | Public URLs (menu) vs restricted (payment slips)                   |
| **Separate admin/customer i18n keys** | Different language preferences for staff vs customers              |
| **Thai Baht currency only**           | MVP focused on Thailand; add multi-currency later if needed        |

---

## Troubleshooting

### "Order not appearing in staff dashboard"

- Check Firestore Console → verify order doc exists
- Check Firestore rules → ensure staff user has read permission
- Check Cloud Function logs → look for creation errors

### "Payment slip not uploading"

- Verify user is authenticated (`ensureCustomerSession()` called)
- Check Storage rules → ensure authenticated user can write to `slips/{uid}/*`
- Check Firebase Console → Logs tab for upload errors

### "Notifications not received"

- Verify FCM token is sent to Firestore (`settings.fcmToken`)
- Check Cloud Function logs for notification send errors
- Verify browser has notification permission (click bell icon)

### "Build fails with Module not found"

- Run `npm install` to update dependencies
- Clear `.vite` cache: `rm -rf .vite`
- Check that `.env` has all required Firebase variables

---

## Contributing

### Submitting Changes

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Write tests for new features (TDD)
3. Run full test suite: `npm run test:all && npm run lint`
4. Commit with clear messages: `git commit -m "Add feature: description"`
5. Push and open a pull request

### Code Review Checklist

- [ ] Tests pass (`npm run test:all`)
- [ ] Linting passes (`npm run lint`)
- [ ] No Firebase calls outside `src/services/`
- [ ] i18n strings in `translations.js`
- [ ] Mobile-responsive design tested
- [ ] Accessibility features preserved

---

## Support & Feedback

For issues, feature requests, or questions:

- Check existing GitHub issues
- Review CLAUDE.md for architectural context
- Run tests to verify local environment

---

## License

© 2026 NOONA. All rights reserved.
