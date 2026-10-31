# Project State

## Current State

- Portfolio demo is deployed at https://restaurant-ordering-app-1addc.web.app.
- The Functions SDK upgrade is deployed; see git history on `main` for the latest commit.
- Hosting, Cloud Functions, Firestore rules, and Storage rules deployed successfully on 2026-10-30.
- Functions SDK upgraded from 7.2.5 to 7.4.0; all three Node 22 Functions redeployed successfully on 2026-10-31.
- Lint, production build, 179 frontend tests, 13 Firestore/order tests, and 7 Storage rules tests passed. Local checks used Node 24 and emulator tests used Java 24; deployed Functions use Node 22.
- Browser workflows and device notifications have not been manually checked.

## Open Tasks

- [x] Upgrade `firebase-functions` from 7.2.5 to 7.4.0, run the existing checks, and redeploy Functions.
- [x] Move `notifyStaffOnNewOrder` and `notifyCustomerOnStatusChange` to Firestore's `asia-southeast2` region and redeploy; both confirmed ACTIVE and old `us-central1` copies removed. Device notification delivery remains pending manual verification.
- [ ] Manually check customer and staff workflows using `docs/MANUAL_CHECKS.md`.
- [ ] Review the 16 npm audit findings in Functions dependencies (including 5 high and 1 critical); this SDK upgrade does not resolve existing Admin/transitive dependency findings.

## Session Log

- 2026-10-31: Migrated both notification Functions to asia-southeast2. Configuration assertions and lint passed; deployment and functions:list confirmed both ACTIVE with matching trigger regions, with old regional copies removed. createOrder remains in us-central1. Initial Eventarc service identity preparation failed; retry succeeded. Browser/device checks remain pending; migration recorded in git history.
- 2026-10-31: Upgraded firebase-functions to 7.4.0 and updated its lockfile. Existing checks passed and all three Functions deployed successfully. No application code or regions changed. Cross-region notification warning remains for the separate migration task; manual order creation and notification checks remain pending.
- 2026-10-30: Deployed Hosting, all three Cloud Functions, and Firestore/Storage rules. Build passed; deployment noted an outdated Functions SDK and cross-region notification triggers.
