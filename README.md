# NOONA Restaurant Ordering

A full-stack restaurant ordering application built with React and Firebase. Customers place delivery orders and track progress in real time; staff manage the menu, review payment receipts, and move orders through fulfillment. The interface supports English and Burmese.

**[Live demo](https://restaurant-ordering-app-1addc.web.app)** · [Order flow](ORDER_FLOW.md) · [Staff access setup](docs/STAFF_ACCESS.md)

## Features

| Customers | Restaurant staff |
| --- | --- |
| Browse the menu and select required options or extras | Add and edit menu items, images, and category modifiers |
| Save a cart locally and submit delivery details | Manage availability and store/category closures |
| Upload payment proof after staff accepts the order | Review receipts and update order status |
| Track order status and view delivery photos | Search and filter orders, upload delivery photos, and undo status changes |
| Switch between English and Burmese | Configure the restaurant name, payment QR code, and LINE contact |

Payment uses a manual transfer and receipt-review workflow. The app does not process payments or automatically verify receipts.

## Try the demo

1. Browse the menu, choose any required options, and add items to the cart.
2. Open checkout and use fictional delivery details with a valid-format Thai phone number.
3. Submit the order to open its live tracking page.

Orders begin at `new`. Payment becomes available after staff acceptance; completing the remaining workflow requires an authorized staff account. Staff credentials are not published. Use a sample receipt image if testing payment proof, and do not make a bank transfer.

The demo shares one backend, so availability may change. Reopen an order in the browser that placed it: an order link alone does not grant access.

## Engineering highlights

- **Server-controlled pricing:** a callable Function reads the current menu and modifier definitions, rebuilds item descriptions and prices, and rejects stale prices or unavailable items. Totals are calculated in integer satang to avoid floating-point rounding errors.
- **Atomic order creation and rate limiting:** one Firestore transaction writes both the order and its per-user counter. Concurrent submissions cannot exceed five accepted orders per hour per Firebase user ID; a failed order write rolls back the counter.
- **Role-based access:** customers use anonymous Firebase authentication and can access only their own orders. Staff need the explicit `staff: true` custom claim. Firestore and Storage rules enforce access independently of the dashboard guard.
- **Receipt protection:** a customer can attach a receipt once while payment is due. Stored receipt objects cannot be overwritten, and reads are restricted to the owner and staff.
- **Real-time updates:** Firestore subscriptions keep menu availability, settings, and order tracking current. Firebase calls live in the service layer, with shared hooks for cart, settings, and saved-order state.
- **Regional notification triggers:** the two Firestore notification Functions run in `asia-southeast2`, alongside the database. The order-creation callable runs in `us-central1`.

## Stack

| Layer | Technologies |
| --- | --- |
| Frontend | React 19, React Router 7, Tailwind CSS 3, Vite 7 |
| Backend | Firebase Authentication, Firestore, Storage, Cloud Functions v2 on Node.js 22 |
| Notifications | Firebase Cloud Messaging and a browser service worker |
| Testing | Vitest, React Testing Library, Firebase emulators |
| Delivery | Firebase Hosting, GitHub Actions |

## Run locally

Use Node.js 22.12+ and npm. Firebase deployment and emulator commands also require the Firebase CLI; CI uses `firebase-tools@15.34.1`. Emulator tests require Java 21+.

```bash
npm ci
npm ci --prefix functions
cp .env.example .env
```

Configure **your own Firebase development project**:

1. Fill `.env` using the project's Firebase web app configuration.
2. Enable anonymous authentication for customers and email/password authentication for staff.
3. Create a staff account and grant its role using [Staff access setup](docs/STAFF_ACCESS.md).
4. Deploy the Functions and security rules using the commands below.
5. Start the app with `npm run dev`. Sign in at `/login` to add menu items and configure the restaurant in the dashboard.

Local development connects to the cloud project specified in `.env`. The app does not automatically use emulators or seed sample data. Never put service-account credentials or private server keys in frontend environment variables.

For push notifications, update the Firebase configuration in `public/firebase-messaging-sw.js` to match your project and set `VITE_FIREBASE_VAPID_KEY`. Delivery also requires notification permission and a supported browser.

## Tests and checks

The latest local verification passed **199 tests**: 179 frontend tests, 13 Firestore/order tests, and 7 Storage rules tests. Lint and the production build also passed. The Functions dependency audit reported zero vulnerabilities after the Firebase Admin 14.5.0 upgrade; this is a point-in-time result, not a security guarantee.

```bash
npm test                 # Frontend unit and component tests
npm run test:watch       # Frontend tests in watch mode
npm run test:orders      # Firestore transactions, validation, and access rules
npm run test:rules       # Storage access rules
npm run test:all         # All three suites, sequentially
npm run lint
npm run build
npm audit --prefix functions
```

Emulator tests use the isolated `demo-restaurant-rate-limit` project and do not need production credentials. Keep ports 8080 and 9199 available and ensure Java 21+ is on PATH (or set JAVA_HOME). The first run downloads emulator binaries.

[GitHub Actions](.github/workflows/checks.yml) runs lint, all test suites, and the production build on pushes to `main` and pull requests, using Node.js 22 and Java 21.

Manual browser/device acceptance testing was skipped for this portfolio polish. Actual push delivery and the complete deployed browser workflow remain unverified. The [manual checklist](docs/MANUAL_CHECKS.md) is available for future verification.

## Project structure

```text
src/
  pages/         Customer ordering, tracking, and staff dashboard
  components/    Menu, cart, forms, dialogs, and order controls
  hooks/         Shared cart, settings, saved-order, and audio state
  services/      Firebase reads, subscriptions, writes, and uploads
  utils/         Validation, translations, formatting, and cart operations
functions/
  create-order.js  Server validation and atomic order creation
  index.js        Callable endpoint and notification triggers
firestore.rules   Database access controls
storage.rules     File access controls
tests/            Storage emulator tests
```

## Deploy your own copy

Select your project explicitly: the checked-in `.firebaserc` points to the shared demo. Set up Firebase CLI authentication and the required Firebase services and billing before deployment.

```bash
npm run build
firebase deploy --only functions --project YOUR_PROJECT_ID
firebase deploy --only firestore:rules,storage --project YOUR_PROJECT_ID
firebase deploy --only hosting --project YOUR_PROJECT_ID
```

Deploy the backend and rules before using the frontend. Configure your Firestore location consistently with the notification triggers in `functions/index.js`.

## Scope and limitations

- One restaurant, with manual payment confirmation and no payment gateway.
- Anonymous order ownership is tied to browser authentication. Clearing browser data or switching browsers loses order access.
- Rate limiting is per Firebase user ID. A new anonymous identity can bypass it; IP limits, CAPTCHA, and App Check enforcement are not implemented.
- Push delivery depends on permissions and valid tokens. The dashboard has no staff token registration UI.
- The manifest supports installation, but full offline ordering is not implemented.
