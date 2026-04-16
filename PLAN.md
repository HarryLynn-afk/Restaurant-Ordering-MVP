# Restaurant Ordering MVP — Build Plan

## Context
The project currently has a Vite + React shell with routing, Tailwind, and Firebase SDK configured but unused.
The goal is to build a full working MVP where customers order via a web link (no login), upload payment slips,
and restaurant staff manage menu + orders via a protected dashboard.

**Key decisions confirmed:**
- Staff login: Firebase Auth (email/password)
- Payment QR: Staff uploads a static QR image once in dashboard settings
- Scope: Single restaurant only

---

## Data Model (Firestore)

### `menuItems` collection
```
{ id, name, description, price, imageUrl, soldOut, createdAt }
```

### `orders` collection
```
{ id, customerName, phone, address, notes, items[{id,name,price,quantity}],
  total, status (unpaid|paid|preparing|ready|delivered),
  paymentSlipUrl, createdAt }
```

### `settings` document → `settings/restaurant`
```
{ restaurantName, qrCodeUrl, lineId }
```

---

## File Structure (new/changed files)

```
src/
├── firebase.js               ← keep, move credentials to .env
├── App.jsx                   ← add /login + protected /dashboard
├── pages/
│   ├── OrderPage.jsx         ← rewrite: real menu from Firestore + cart
│   ├── CheckoutPage.jsx      ← NEW: customer info form + order submit
│   ├── PaymentPage.jsx       ← NEW: QR code display + slip upload
│   ├── OrderStatusPage.jsx   ← NEW: customer tracks order by ID
│   ├── LoginPage.jsx         ← NEW: staff email/password login
│   └── Dashboard.jsx         ← rewrite: full staff dashboard
├── components/
│   ├── MenuDisplay.jsx       ← keep + minor update
│   ├── OrderForm.jsx         ← implement: customer info form
│   ├── OrderCard.jsx         ← implement: staff order card
│   ├── ProtectedRoute.jsx    ← NEW: auth guard for /dashboard
│   └── MenuItemForm.jsx      ← NEW: add/edit menu item modal
└── .env                      ← NEW: Firebase credentials
```

---

## Build Phases & Tasks

### Phase 1 — Environment & Firebase Cleanup
1. Create `.env` with `VITE_FIREBASE_*` variables, update `firebase.js` to use them
2. Delete `test-firebase.js`
3. Add `.env` to `.gitignore`

### Phase 2 — Auth & Routing
4. Create `LoginPage.jsx` — email/password form using `signInWithEmailAndPassword`
5. Create `ProtectedRoute.jsx` — redirects to `/login` if not authenticated
6. Update `App.jsx` — add `/login` route, wrap `/dashboard` with `ProtectedRoute`

### Phase 3 — Customer Ordering Flow
7. Rewrite `OrderPage.jsx` — fetch menu from Firestore (real-time `onSnapshot`), display with cart (items + total price)
8. Implement `OrderForm.jsx` — customer name, phone, delivery address, notes fields
9. Create `CheckoutPage.jsx` — shows cart summary + `OrderForm`, submits order to Firestore
10. Create `PaymentPage.jsx` — fetches `settings/restaurant` QR code URL, shows it, handles payment slip upload to Firebase Storage, updates order `paymentSlipUrl`
11. Create `OrderStatusPage.jsx` — customer enters order ID → shows real-time status

### Phase 4 — Staff Dashboard
12. Rewrite `Dashboard.jsx` — tab layout: Orders | Menu | Settings, logout button
13. Implement orders tab — real-time orders list using `onSnapshot`, filter by status
14. Implement `OrderCard.jsx` — shows order details, payment slip image, status dropdown to update
15. Create `MenuItemForm.jsx` — modal form for add/edit menu item with image upload to Firebase Storage
16. Implement menu management tab — list items, add/edit/delete, toggle sold out
17. Implement settings tab — upload restaurant QR code image, save restaurant name + LINE ID

### Phase 5 — Polish & Connect
18. Update `OrderPage.jsx` header to show restaurant name from settings
19. Add "Open LINE" button on `PaymentPage.jsx` using LINE ID from settings
20. Store last order ID in `localStorage` so customers can recheck status easily
21. Add loading states and error handling across all pages

---

## Routing Map
```
/                  → OrderPage (browse menu, cart)
/checkout          → CheckoutPage (customer info + submit)
/payment/:orderId  → PaymentPage (QR code + slip upload)
/order/:orderId    → OrderStatusPage (track status)
/login             → LoginPage (staff)
/dashboard         → Dashboard (protected, staff only)
```

---

## Verification
- Customer flow: browse menu → add to cart → fill form → submit → see QR → upload slip → track status
- Staff flow: log in → see new order → view slip → confirm payment → update status through all stages
- Menu management: add item with photo → appears on customer menu → mark sold out → greyed out for customers
- Settings: upload QR code → appears on customer payment page
