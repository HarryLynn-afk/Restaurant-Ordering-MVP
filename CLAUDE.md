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
    orders.js          → order CRUD, real-time subscriptions, payment slip and delivery photo upload
    settings.js        → restaurant settings read/write, QR code upload
  pages/
    OrderPage.jsx      → Customer menu browsing + cart (public)
    CheckoutPage.jsx   → Customer order form + submission (public)
    PaymentPage.jsx    → QR display + payment slip upload (public)
    OrderStatusPage.jsx→ Customer real-time order tracking by ID (public)
    LoginPage.jsx      → Staff email/password login
    Dashboard.jsx      → Staff dashboard shell (tabs: Orders, Menu, Settings) — protected
    dashboard/
      OrdersTab.jsx    → Orders list with date picker, search, scrollable pill filter tabs with live counts + active summary line; flat list of OrderCards
      MenuTab.jsx      → Menu item CRUD
      SettingsTab.jsx  → Restaurant settings (name, LINE ID, QR code, FCM token)
  components/
    OrderCard.jsx          → Staff order card; status dropdown for in-progress orders; Accept/Cancel for new; undo on every change
    UndoToast.jsx          → Fixed-position 5s undo toast; subscribes to undoStore; survives card re-mounts
    CartDrawer.jsx         → Customer cart slide-in
    MenuDisplay.jsx        → Menu grid for customers
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
  utils/
    i18n.jsx               → Translation context + useCustomerLanguage / useAdminLanguage hooks
    orderStatus.js         → Status normalization, filter helpers, customer progress steps
    cancelReasons.js       → Localized cancel reason options
    cartOps.js             → Pure cart manipulation functions (add, remove, update qty)
    checkoutValidation.js  → Form field validators for checkout
    currency.js            → Thai Baht formatting helpers
    compressImage.js       → Canvas-based client-side image compression
    undoStore.js           → Module-level undo event bus (triggerUndo / onUndoTrigger) — survives component re-mounts
    relativeTime.js        → formatRelativeTime(date) → "5m ago" / "2h ago" / null for >24h (caller falls back to locale date)
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

---

## Current State
- **Complete and working**: Full customer ordering flow (menu → cart → checkout → payment QR → slip upload → order tracking), staff dashboard (orders + menu management + settings), FCM push notifications both directions, Burmese/English i18n.
- **Deployed**: Firebase Hosting, project `restaurant-ordering-app-1addc`.
- **Tests passing**: 49/49 utils unit tests pass. Storage rules integration tests require Firebase emulator (`npm run test:rules`).
- **Recently shipped**: Scrollable pill filter tabs with live order counts, active status summary line ("3 New · 5 Preparing"), relative timestamps on order cards ("5m ago"), amber waiting-for-slip urgency cue on unpaid orders, delivery photo upload available during `out_for_delivery`, `formatRelativeTime` utility with full test coverage.

---

## Open Tasks
1. Delivery view — decide between Option A (dashboard toggle) or Option B (separate /delivery PIN page) once staff report friction with current filter workaround.
2. No other confirmed open tasks — check `FUTURE_FEATURES.md` for backlog ideas.

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
