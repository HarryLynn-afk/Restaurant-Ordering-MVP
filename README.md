# NOONA Restaurant Ordering

A portfolio web application for restaurant ordering. Customers browse a menu, choose modifiers, place an order, upload payment proof, and track status. Staff manage orders, menu availability, delivery photos, and restaurant settings.

[Live demo](https://restaurant-ordering-app-1addc.web.app)

Use fictional customer information and a sample receipt when exploring the demo. Payment is a manual transfer workflow; uploading a receipt does not verify or charge a payment. Staff access is restricted; the public demo does not provide staff credentials.

## Demo walkthrough

1. Add a menu item, choosing any required options.
2. Review the cart and enter fictional delivery details with a valid-format Thai phone number.
3. Place the order and open its tracking page. Orders start at `new`; staff accept them before payment.
4. When payment becomes available, upload a sample image as payment proof.
5. Staff move the order through preparation, ready, delivery, and completion. Tracking updates through Firestore listeners.

The demo uses a shared backend, so settings and availability may change. Order links depend on browser authentication. Do not rely on the demo to retain important information.

## Stack and structure

React 19, React Router, Tailwind CSS, Vite, Firebase Authentication, Firestore, Storage, Cloud Functions (Node.js 22), and Cloud Messaging. Vitest and Testing Library cover frontend behavior; Firebase emulators cover database transactions and security rules.

| Location | Responsibility |
| --- | --- |
| `src/pages/` | Customer checkout/tracking and staff dashboard |
| `src/components/` | Forms, menu, cart, order controls, dialogs |
| `src/hooks/` | Cart, settings, saved order, notification audio |
| `src/services/` | Firebase reads, subscriptions, writes, uploads |
| `src/utils/` | Validation, translations, formatting, cart operations |
| `functions/create-order.js` | Server validation, rate limiting, atomic order creation |
| `functions/index.js` | Callable endpoint and notification triggers |
| `firestore.rules`, `storage.rules` | Client access controls |

Order creation goes from checkout to a callable function, which authenticates and validates the request. One Firestore transaction commits both the order and its rate-limit counter. Order updates trigger notifications when a browser token is present. Browsers also subscribe to Firestore for live status changes.

## Run locally

Requirements: Node.js 22.12+ and npm. Emulator tests also require Java 21+ and Firebase CLI (`firebase-tools`); CI uses version 15.34.1.

```bash
npm ci
npm ci --prefix functions
cp .env.example .env
npm run dev
```

Fill `.env` with the web application configuration from **your own Firebase development project**. Enable anonymous authentication for customers and email/password authentication for staff. Grant staff accounts the explicit role described in [Staff access](docs/STAFF_ACCESS.md). Deploy its functions and rules before testing ordering. Local development currently connects to the configured cloud project; it does not seed data or automatically connect the app to emulators.

The messaging service worker in `public/firebase-messaging-sw.js` contains the demo project's Firebase configuration. Update it to match your development project before testing push notifications. A VAPID key, notification permission, and a supported browser are required. The manifest supports installation; full offline ordering is not implemented.

Never place service-account credentials or private server keys in frontend environment variables. Firebase web configuration is delivered to browsers; security depends on authentication and access controls.

## Verification

```bash
npm test                 # Frontend unit and component tests; no Firebase credentials needed
npm run test:watch       # Watch frontend tests
npm run test:orders      # Firestore emulator: concurrency, validation, rollback, direct-write blocking
npm run test:rules       # Storage emulator: payment slip access
npm run test:all         # All three suites, sequentially
npm run lint
npm run build
```

Emulator tests use `demo-restaurant-rate-limit`, an isolated demo project. Ensure Java 21+ is on PATH (or configure JAVA_HOME). The first run downloads emulator binaries. Tests require local ports 8080 and 9199 to be available. They do not require production credentials.

For browser acceptance, follow the [manual checklist](docs/MANUAL_CHECKS.md). These checks are performed by the project owner and remain pending until reported.

The GitHub Actions workflow runs these checks for pushes to main and pull requests, with Node.js 22 and Java 21. A passing build does not verify actual device notification delivery or the complete deployed browser workflow.

## Engineering decisions and limits

- **Atomic rate limiting:** up to five accepted orders per Firebase user ID in a one-hour window starting with the first order. Concurrent submissions share a database counter. Excess requests fail before creating an order, and failed order writes do not consume a slot.
- **Anonymous customers:** avoids signup for a small ordering flow. Clearing browser data or changing browsers can create a new identity and bypass the per-user limit. There is no IP limit, CAPTCHA, or App Check enforcement. Rejected requests still consume backend resources.
- **Real-time subscriptions:** menu, settings, and order status use Firestore listeners rather than polling.
- **Manual payment confirmation:** receipt upload and staff review are separate from payment verification. No payment gateway is integrated.
- **Server-controlled pricing:** the order transaction reads current menu items and category modifier definitions, validates option IDs, and rebuilds names, modifier summaries, and prices. Menu and extra prices are normalized to two decimals when saved; totals use integer satang during calculation. Legacy prices with fractional satang must be edited and saved again before ordering. Missing/sold-out items, closed stores/categories, and stale prices are rejected before writing. Checkout offers an explicit cart reset after changes; older saved modifier carts may need to be rebuilt.
- **Order access:** customers can read and update only their own orders; receipt paths must belong to the current user. Receipts are linked once while payment is due, and existing receipt objects cannot be overwritten. Staff require an explicit `staff: true` claim. Clearing anonymous browser authentication loses order access. See [Staff access and rollout](docs/STAFF_ACCESS.md) before deploying the new permission model.
- **Notifications:** functions attempt delivery when tokens exist. Push delivery depends on browser permission and token validity; it has not been verified across devices. The dashboard has no staff token registration UI.

## Deployment

Deploy to a project you control. Select that project explicitly when working with a copy of this repository; `.firebaserc` currently points to the shared demo.

```bash
npm run build
firebase deploy --only functions --project YOUR_PROJECT_ID
firebase deploy --only hosting --project YOUR_PROJECT_ID
firebase deploy --only firestore:rules,storage --project YOUR_PROJECT_ID
```

Deploy the order callable and updated notification functions before the frontend and rules. Old notification code would count orders twice; old frontend code writes orders directly and is rejected by the new rules. Refresh older open tabs after deployment.

See [ORDER_FLOW.md](ORDER_FLOW.md) for additional flow notes. Code and tested behavior take precedence where older planning documents differ.
