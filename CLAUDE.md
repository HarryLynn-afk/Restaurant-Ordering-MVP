# NOONA Restaurant Ordering MVP
> Claude reads this file at the start of every session.
> Read [AGENTS.md](AGENTS.md) for the user’s browser-verification preference before planning checks.
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
    useSettings.js         → Wraps subscribeToSettings; returns { settings }; single Firestore subscription shared by all consumers
  utils/
    i18n.jsx               → Translation context + useCustomerLanguage / useAdminLanguage hooks (imports translations.js)
    translations.js        → EN + MY translation dictionary — edit here to add/change strings; no logic inside
    orderStatus.js         → Status normalization, transition/terminal helpers, filter helpers, customer progress steps; also owns ADMIN_STATUS_BADGE_COLORS, CUSTOMER_TONE_CONTAINER, CUSTOMER_TONE_TEXT
    cancelReasons.js       → Localized cancel reason options
    cartOps.js             → Pure cart manipulation functions (add, remove, update qty)
    checkoutValidation.js  → Form field validators for checkout
    currency.js            → Thai Baht formatting helpers
    compressImage.js       → Canvas-based client-side image compression
    undoStore.js           → Module-level undo event bus (triggerUndo / onUndoTrigger) — survives component re-mounts
    relativeTime.js        → formatRelativeTime(date) → "5m ago" / "2h ago" / null for >24h (caller falls back to locale date)
    date.js                → Shared date helpers: todayMidnight(), toLocalDateStr(d) — always use toLocalDateStr for date input value/max (avoids UTC timezone shift)
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
- **Firebase initialization lives in `src/firebase.js`.** Data services import initialized instances from it.
- **`_upload.js` is internal to services.** Use `uploadImage` when you need a download URL (menus/, settings/, delivery/). Use `storeImage` for paths with restricted read access (slips/) — do NOT call `getDownloadURL` after storing a slip.
- **Customers are anonymous Firebase Auth users.** Always call `ensureCustomerSession()` before any Firestore write that requires auth. Staff require the explicit `staff: true` custom claim; email/password sign-in alone grants no privileges.
- **Never add raw Firestore calls in components or pages** — this was explicitly refactored out (commit `8b8810e`).
- **Use `useSettings()` hook to read restaurant settings in any page or component.** Never call `subscribeToSettings` or `getSettings` directly in pages/components — the hook is the single shared subscription (commit `31c9c44`).
- **Status → Tailwind class mappings live exclusively in `orderStatus.js`** — `ADMIN_STATUS_BADGE_COLORS`, `CUSTOMER_TONE_CONTAINER`, `CUSTOMER_TONE_TEXT`. Never define local status color dicts in components (commit `31c9c44`).
- **Run the emulator test suite before touching `storage.rules` or `firestore.rules`** — `npm run test:rules`.

---

## Key Decisions Made
- **Anonymous auth for customers** — no sign-up friction. `ensureCustomerSession()` handles sign-in lazily. Orders belong to their creator UID. Clearing the anonymous session loses order access; there is no cross-session slip-linking fallback.
- **`paid` status is treated as an alias for `preparing`** — `normalizeAdminStatus()` maps `paid → preparing` everywhere in the admin UI. The raw value may still appear in Firestore.
- **Order statuses** (in order): `new → unpaid → preparing (≈paid) → ready → out_for_delivery → delivered | cancelled`. `out_for_delivery` was added between `ready` and `delivered` (commit `68874f9`).
- **Status dropdown (reverted back)** — contextual step buttons were tried then reverted. At 70–150 orders/day a flat list + dropdown is faster than a strict linear flow. Staff need to jump statuses freely (commit `133ca81`).
- **Undo toast uses module-level store** — `undoStore.js` is a singleton event bus so the toast in `Dashboard.jsx` survives when order cards unmount/remount on status change (commit `fe028e0`).
- **`_upload.js` split into `uploadImage` / `storeImage`** — to keep receipt paths in order documents instead of publishing download URLs. Receipt owners and staff can read slips; receipt objects are create-only.
- **Manual chunk splitting** — Firebase modules split into `firebase-app`, `firebase-data`, `firebase-messaging` chunks to reduce initial load.
- **Rate limiting** — enforced server-side in Cloud Functions (5 orders/hour/uid via `rateLimits/{uid}` collection). The Firestore rule for `rateLimits` denies all client reads/writes.
- **Menu caching** — `subscribeToMenu` uses real-time onSnapshot; initial load performance improved via Firebase preconnect hints (commit `6eb1224`).
- **Delivery view** — not built yet. Current workaround: filter dashboard to Ready orders manually. Future option: A (toggle in dashboard) or B (separate /delivery page with PIN), see `FUTURE_FEATURES.md`.
- **OrdersTab filter state lives in Dashboard** — `selectedDate`, `search`, `statusFilter` lifted up from `OrdersTab` into `Dashboard` (commit `c3e788d`). Any future "focus X" intent (e.g. focus unpaid) is just a handler calling those setters — no new props or signals needed. See `FUTURE_FEATURES.md` → "Quick Focus Shortcuts".
- **Atomic order creation** — the callable validates current menu prices and modifiers, then commits the order and per-UID counter together. Excess requests are rejected before creation; database failures reject the request. Checkout displays translated errors.
- **Admin order visibility includes stale active orders** — `subscribeToRecentOrders()` merges the normal 7-day recent query with a second active-status query, so old `new/unpaid/preparing/ready/out_for_delivery/paid` orders stay visible until staff resolves them. OrdersTab also includes active orders outside the selected date and supports searching by displayed `#SHORTID`.
- **Admin cancellation is UI-limited before payment** — cancellation is allowed for `new` orders and `unpaid` orders without a slip. Once a slip exists or an order is in progress, the admin UI no longer offers cancel. Firestore rules now enforce the same constraint via `isValidStaffUpdate()` (commit `e521af1`).
- **Confirmation modals on destructive admin actions** — "Start Preparing" (payment confirmation) and "Mark as Delivered" both require a ConfirmModal confirmation before firing. Prevents accidental push notifications and terminal status changes during lunch rush.

---

## Current State
- This is a portfolio demo. Preserve the existing stack and prioritize reliable workflows, sound permissions, reproducible checks, and accurate documentation.
- Source setup and commands: [README.md](README.md) and `package.json`. Do not infer current test or deployment status from historical session notes.
- The original atomic rate-limit release is deployed. Later pricing and permission improvements are committed but await staff-role migration and rollout. See [STAFF_ACCESS.md](docs/STAFF_ACCESS.md).
- Browser verification is performed by the user under [AGENTS.md](AGENTS.md). Manual acceptance remains pending; do not claim the complete browser workflow or device notifications are verified.

## Open Tasks
1. Identify intended staff accounts and grant their explicit roles before deploying the new permissions.
2. Deploy the matching functions, frontend, Firestore rules, and Storage rules.
3. Ask the user to complete [manual acceptance checks](docs/MANUAL_CHECKS.md) and fix reported failures.

---

## What NOT to do
- Never import `firebase/firestore`, `firebase/storage`, or `firebase/auth` directly in components or pages — always use `src/services/` and `src/firebase.js`.
- Never call `getDownloadURL` after uploading to `slips/` — order documents store receipt paths. Use `getPaymentSlipUrl()` where an authorized reader needs the URL.
- Never modify `firestore.rules` or `storage.rules` without running the emulator test suite first (`npm run test:rules`).
- Never add new npm dependencies without asking the user first.
- Never bypass `ensureCustomerSession()` before Firestore writes that require auth.
- Never commit `.env` (contains Firebase credentials).
- **Never write or apply any code changes without the user's explicit approval.** Always explain the plan first and wait for a clear "yes" or "do it" before touching any file.

---

## Historical Session Log
These dated notes are historical, not current requirements or verification evidence.
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
| 2026-05-22 | PWA manifest rebranded to Noona; Cloud Functions upgraded to Node.js 22 + firebase-functions v7 + firebase-admin v13; date picker fixed (Buddhist Era + backdrop dismiss + timezone bug); deployed `43240d8` | Always use toLocalDateStr() for date input value/max — never toISOString() (UTC shift breaks Thai timezone) |
| 2026-05-23 | Business pitch strategy session for NOONA (2-month free trial, 500–700 THB/month after, both LINE + website in parallel, pitch in Burmese). HTML title fixed to "Noona", favicon set to `data:,` to override cached vite.svg, SW push icon updated to /logo.png, public/vite.svg deleted; deployed `abade42`. Test database fully cleaned (orders + rateLimits via CLI, slips/ + delivery/ via Firebase Console). | Verbal price agreement upfront with owner — no written contract. Admin handles new→ready, rider uses same dashboard for ready→delivered (no delivery view needed). Don't anchor pricing to NOONA — they get founding-customer discount; restaurants #2–7 priced at 1,000–1,500 THB/month. Browser favicon caching of old vite.svg is unfixable from server side and only affects own browser — real customers from LINE link see clean version. |
| 2026-05-28 | Architecture: extracted useSettings() hook (replaces 4 independent subscribeToSettings calls); centralised status/tone → Tailwind color maps in orderStatus.js; added 5 tests for useSettings. 156 tests total. Committed `31c9c44`, pushed — not yet deployed. | useSettings() is now the canonical way to read settings in any component. Status color dicts must live in orderStatus.js, never inline in components. Medium-priority held items: localStorage boilerplate and orders.js god service — tackle in next architecture session. |
