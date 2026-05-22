# NOONA Restaurant Ordering MVP
> Claude reads this file at the start of every session.
> Update this file at the end of every session using /end-session.

---

## Stack
- Frontend: React 19, Vite 7, Tailwind CSS 3, React Router v7, lucide-react
- Backend: Firebase (Firestore, Auth, Storage, Cloud Functions v2, FCM)
- Testing: Vitest + @testing-library/react (jsdom); @firebase/rules-unit-testing + Firebase emulator for storage rules
- Deployment: Firebase Hosting (`dist/`)
- Language: Custom i18n (English + Burmese `my`), separate localStorage keys for customer vs admin

---

## Folder Structure
```
src/
  firebase.js          → Firebase init, ensureCustomerSession(), FCM helpers — the only file that imports from firebase/*
  services/            → ALL Firestore and Storage calls live here. No raw Firebase imports in pages or components.
    _upload.js         → Internal shared upload helper (uploadImage returns URL; storeImage does not — used for slips/)
    menu.js            → menuItems CRUD + image upload
    orders.js          → order CRUD, real-time subscriptions (recent + active orders for admin), payment slip and delivery photo upload
    settings.js        → restaurant settings read/write, QR code upload
  pages/
    OrderPage.jsx      → Customer menu browsing + cart (public)
    CheckoutPage.jsx   → Customer order form + submission (public)
    PaymentPage.jsx    → QR display + payment slip upload (public)
    OrderStatusPage.jsx→ Customer real-time order tracking by ID (public)
    LoginPage.jsx      → Staff email/password login
    Dashboard.jsx      → Staff dashboard shell (tabs: Orders, Menu, Settings) — protected
    dashboard/
      OrdersTab.jsx    → Orders list with date picker, search (#short-id supported), scrollable pill filter tabs with live counts + active summary line; flat list of OrderCards
      MenuTab.jsx      → Menu item CRUD
      SettingsTab.jsx  → Restaurant settings (name, LINE ID, QR code, FCM token)
  components/
    OrderCard.jsx          → Staff order card; status dropdown for in-progress orders; Accept/Cancel before payment; undo on every change
    UndoToast.jsx          → Fixed-position 5s undo toast; subscribes to undoStore; survives card re-mounts
    CartDrawer.jsx         → Customer cart slide-in
    MenuDisplay.jsx        → Menu grid for customers (imports MenuItemCard)
    MenuItemCard.jsx       → Single menu item card; delegates to ModifierSheet when item has modifiers
    ModifierSheet.jsx      → Bottom-sheet modifier picker (required choices + optional extras)
    IOSPrompt.jsx          → iOS "Add to Home Screen" install prompt (shown on OrderStatusPage)
    StatusToast.jsx        → Slide-down status change toast (shown on OrderStatusPage)
    CancelOrderForm.jsx    → Cancel reason form (customer + staff)
    DeliveryPhotoSection.jsx → Staff delivery photo upload/delete
    ImageLightbox.jsx      → Full-screen image viewer
    MenuItemForm.jsx       → Add/edit menu item modal with image upload
    ConfirmModal.jsx       → Generic confirmation dialog
    CategoryModal.jsx      → Category picker modal
    ProtectedRoute.jsx     → Auth guard — redirects non-staff to /login
    LanguageToggle.jsx     → EN/MY toggle (separate per customer/admin)
    ErrorBoundary.jsx      → Top-level React error boundary
  hooks/
    useCart.js             → Cart state hook (localStorage-backed)
    useLastOrder.js        → Centralizes lastOrderId localStorage key; exposes redirectIfActive(), saveLastOrder(id), clearLastOrder()
    useOrderAudio.js       → Web Audio API chime; hides AudioContext lifecycle; exposes playChime()
  utils/
    i18n.jsx               → Translation context + useCustomerLanguage / useAdminLanguage hooks (imports translations.js)
    translations.js        → EN + MY translation dictionary — edit here to add/change strings; no logic inside
    orderStatus.js         → Status normalization, transition/terminal helpers, filter helpers, customer progress steps
    cancelReasons.js       → Localized cancel reason options
    cartOps.js             → Pure cart manipulation functions (add, remove, update qty)
    checkoutValidation.js  → Form field validators for checkout
    currency.js            → Thai Baht formatting helpers
    compressImage.js       → Canvas-based client-side image compression
    undoStore.js           → Module-level undo event bus (triggerUndo / onUndoTrigger) — survives component re-mounts
    relativeTime.js        → formatRelativeTime(date) → "5m ago" / "2h ago" / null for >24h (caller falls back to locale date)
    date.js                → Shared date helpers such as todayMidnight()
functions/
  index.js               → Cloud Functions: notifyStaffOnNewOrder, notifyCustomerOnStatusChange, rate limiting
firestore.rules          → Firestore security rules (field-level validation on order create)
storage.rules            → Storage security rules (slips/ read restricted to uploader + staff)
tests/
  storage.rules.test.js  → Integration tests for storage rules (run against emulator)
```

---

## Architecture Rules
- **All Firestore and Storage calls go through `src/services/` only.** Never import `firebase/firestore` or `firebase/storage` directly in pages or components.
- **All Firebase SDK imports go through `src/firebase.js` only.** Services import `{ db, storage, auth, ensureCustomerSession }` from `../firebase`.
- **`_upload.js` is internal to services.** Use `uploadImage` when you need a download URL (menus/, settings/, delivery/). Use `storeImage` for paths with restricted read access (slips/) — do NOT call `getDownloadURL` after storing a slip.
- **Customers are anonymous Firebase Auth users.** Always call `ensureCustomerSession()` before any Firestore write that requires auth. Staff are non-anonymous (email/password).
- **Never add raw Firestore calls in components or pages** — this was explicitly refactored out (commit `8b8810e`).
- **Run the emulator test suite before touching `storage.rules` or `firestore.rules`** — `npm run test:rules`.

---

## Key Decisions Made
- **Anonymous auth for customers** — no sign-up friction. `ensureCustomerSession()` handles sign-in lazily. Session can change across browser resets, so slip uploads use uid-in-path linking (both Firestore write and Storage write must match the same current uid).
- **`paid` status is treated as an alias for `preparing`** — `normalizeAdminStatus()` maps `paid → preparing` everywhere in the admin UI. The raw value may still appear in Firestore.
- **Order statuses** (in order): `new → unpaid → preparing (≈paid) → ready → out_for_delivery → delivered | cancelled`. `out_for_delivery` was added between `ready` and `delivered` (commit `68874f9`).
- **Status dropdown (reverted back)** — contextual step buttons were tried then reverted. At 70–150 orders/day a flat list + dropdown is faster than a strict linear flow. Staff need to jump statuses freely (commit `133ca81`).
- **Undo toast uses module-level store** — `undoStore.js` is a singleton event bus so the toast in `Dashboard.jsx` survives when order cards unmount/remount on status change (commit `fe028e0`).
- **`_upload.js` split into `uploadImage` / `storeImage`** — to handle the case where `slips/` has no `getDownloadURL` permission for the uploader. The URL is fetched by staff via `getPaymentSlipUrl()` instead.
- **Manual chunk splitting** — Firebase modules split into `firebase-app`, `firebase-data`, `firebase-messaging` chunks to reduce initial load.
- **Rate limiting** — enforced server-side in Cloud Functions (5 orders/hour/uid via `rateLimits/{uid}` collection). The Firestore rule for `rateLimits` denies all client reads/writes.
- **Menu caching** — `subscribeToMenu` uses real-time onSnapshot; initial load performance improved via Firebase preconnect hints (commit `6eb1224`).
- **Delivery view** — not built yet. Current workaround: filter dashboard to Ready orders manually. Future option: A (toggle in dashboard) or B (separate /delivery page with PIN), see `FUTURE_FEATURES.md`.
- **OrdersTab filter state lives in Dashboard** — `selectedDate`, `search`, `statusFilter` lifted up from `OrdersTab` into `Dashboard` (commit `c3e788d`). Any future "focus X" intent (e.g. focus unpaid) is just a handler calling those setters — no new props or signals needed. See `FUTURE_FEATURES.md` → "Quick Focus Shortcuts".
- **Rate limit auto-cancel** — Cloud Function cancels orders with `cancelReason: 'other'` when customer exceeds 5 orders/hour. During testing, clear `rateLimits/{uid}` doc in Firestore Console to reset. Intentionally left as-is (no UX message added).
- **Admin order visibility includes stale active orders** — `subscribeToRecentOrders()` merges the normal 7-day recent query with a second active-status query, so old `new/unpaid/preparing/ready/out_for_delivery/paid` orders stay visible until staff resolves them. OrdersTab also includes active orders outside the selected date and supports searching by displayed `#SHORTID`.
- **Admin cancellation is UI-limited before payment** — cancellation is allowed for `new` orders and `unpaid` orders without a slip. Once a slip exists or an order is in progress, the admin UI no longer offers cancel. Firestore rules now enforce the same constraint via `isValidStaffUpdate()` (commit `e521af1`).
- **Confirmation modals on destructive admin actions** — "Start Preparing" (payment confirmation) and "Mark as Delivered" both require a ConfirmModal confirmation before firing. Prevents accidental push notifications and terminal status changes during lunch rush.

---

## Current State
- **Complete and working**: Full customer ordering flow (menu → cart → checkout → payment QR → slip upload → order tracking), staff dashboard (orders + menu management + settings), FCM push notifications both directions, Burmese/English i18n.
- **Deployed**: Firebase Hosting, project `restaurant-ordering-app-1addc`. Latest deploy: commit `e521af1`.
- **Tests passing**: `npx vitest run src` passes 151 tests across 20 files. `npm run build` passes. `npm run lint` has 0 errors, 0 warnings. Storage rules integration tests require Firebase emulator (`npm run test:rules`).
- **Recently shipped**: Fixed FCM labels (ready/out_for_delivery), Firestore cancel hardening via `isValidStaffUpdate()`, admin confirmation modals for payment confirm and delivered, CheckoutPage hook warning resolved.

---

## Open Tasks
1. Delivery view — decide between Option A (dashboard toggle) or Option B (separate /delivery PIN page) once staff report friction with current filter workaround. User confirmed this is low priority for now.

---

## What NOT to do
- Never import `firebase/firestore`, `firebase/storage`, or `firebase/auth` directly in components or pages — always use `src/services/` and `src/firebase.js`.
- Never call `getDownloadURL` after uploading to `slips/` — the uploader has write-only access. Use `getPaymentSlipUrl()` (staff-side) to fetch slip URLs.
- Never modify `firestore.rules` or `storage.rules` without running the emulator test suite first (`npm run test:rules`).
- Never add new npm dependencies without asking the user first.
- Never bypass `ensureCustomerSession()` before Firestore writes that require auth.
- Never commit `.env` (contains Firebase credentials).

---

## Session Log
| Date | Task completed | Decisions made |
|------|---------------|----------------|
| 2026-05-09 | Generated CLAUDE.md from codebase scan | Initial documentation |
| 2026-05-09 | Ran /init-project and /end-session to establish session workflow | none |
| 2026-05-14 | Added out_for_delivery status, undo toast (module-level store), storage rules regression tests, flat order list with status dropdown | Reverted Kanban/swimlane + step buttons — flat list + dropdown better for this order volume |
| 2026-05-16 | Replaced status dropdown with scrollable pill tabs + live counts; added active summary line, relative timestamps, unpaid urgency cue, delivery photo on out_for_delivery; tests for relativeTime and fixed stale orderStatus tests | none |
| 2026-05-16 | Architecture: extracted translations.js from i18n.jsx, added getItemKey() to cartOps; added i18n and translations test suites (17 new tests) | Translations are pure data in translations.js — never mix logic into it |
| 2026-05-16 | Fix View Orders banner (lift OrdersTab filter state to Dashboard, reset on click); fix iOS Safari stale status via visibilitychange refresh | Lift state over token-signal pattern; filter state in Dashboard so future focus intents are plain setters |
| 2026-05-16 | Fixed customer order recovery and stale active admin visibility; deployed commits `98174a2` and `f8865b2` | Active admin orders are visible independent of selected date; cancellation is UI-limited before payment |
| 2026-05-17 | Architecture deepening: extracted ModifierSheet, MenuItemCard, IOSPrompt, StatusToast, useOrderAudio, useLastOrder; 16 new tests (151 total); deployed `f2df9ad` | lastOrderId localStorage key centralised in useLastOrder — never reference it directly in pages |
| 2026-05-22 | Fixed FCM labels (ready/out_for_delivery), Firestore cancel hardening, admin confirmation modals for payment + delivered, CheckoutPage hook warning; deployed `e521af1` | Confirmation modals on payment confirm and delivered — prevents accidental push notifications and terminal status changes |
