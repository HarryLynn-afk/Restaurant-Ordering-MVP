# Staff access and deployment

Staff access requires the Firebase Auth custom claim `staff: true`. Email/password sign-in alone grants no staff privileges. The dashboard guard, Firestore rules, and Storage rules enforce the claim. Customers can read and update only their own orders.

## Grant access

Create the intended email/password account in Firebase Authentication and copy its UID. A trusted maintainer with Firebase Admin privileges must grant the claim. There is deliberately no public endpoint for granting roles.

Using a trusted Node.js environment with Application Default Credentials configured for the target project, run the following from `functions/`. Replace both placeholders and confirm the UID belongs to the intended staff member before running it. Never commit credentials or place them in browser configuration.

```js
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

initializeApp({ credential: applicationDefault(), projectId: 'YOUR_PROJECT_ID' });
async function grantStaff() {
  const auth = getAuth();
  const user = await auth.getUser('STAFF_UID');
  await auth.setCustomUserClaims(user.uid, { ...user.customClaims, staff: true });
}
grantStaff().catch(error => { console.error(error.message); process.exitCode = 1; });
```

To remove access, set `staff: false` while preserving the other claims. Changed claims take effect when a new ID token is issued. Sign out and back in after granting access. Token refresh timing also matters for revocation; claim changes do not immediately invalidate every existing token.

Reference: [Firebase custom claims documentation](https://firebase.google.com/docs/auth/admin/custom-claims).

## Rollout checklist

1. Identify the accounts that should retain staff access. Grant their claims before deploying the updated rules and dashboard.
2. Sign out and back in; inspect the token claim in a trusted development session. Do not copy or publish tokens.
3. Run `npm run test:all`, lint, and build.
4. Deploy the frontend and both sets of security rules to the same project. Rules provide actual enforcement; the dashboard guard provides navigation feedback.
5. Confirm intended staff can manage orders, and an ordinary email/password account cannot. Verify a customer can track and upload payment proof for their own order.

An order URL does not grant access. Clearing browser authentication or switching browsers loses access to an anonymous customer's order. Returning customers should use the browser that placed it. The UI explains this when an order cannot be opened. Recovering anonymous accounts across browsers is outside the demo's scope.
