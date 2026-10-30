# Manual acceptance checks

The user performs these checks. Automated tests do not establish that the complete browser experience or device notifications work. No browser checks have been completed for this quality pass.

Use the updated local app (`npm run dev`) or the updated deployment. The public demo remains on the earlier release until the staff-role migration and deployment are completed. Local development uses the Firebase project configured in `.env`, not emulator data. Use fictional details and sample images; do not make a bank transfer.

## Prerequisites

- Deploy matching frontend, functions, Firestore rules, and Storage rules before testing the full new behavior.
- Grant the intended staff accounts `staff: true` as described in [Staff access](STAFF_ACCESS.md), then sign out and back in.
- Keep a customer browser session and a separate staff session so logging in as staff does not replace the customer's anonymous identity.

## Customer workflow

1. Browse on a narrow mobile screen and a desktop screen. Verify no horizontal overflow, readable labels, and usable dialogs. Switch English/Burmese.
2. Add an item with a required choice and an extra. Verify the required choice is enforced, extras change the displayed price, and quantities/totals remain correct in the cart and checkout. Try keyboard-only navigation.
3. Submit an empty checkout form. Verify errors identify the missing fields. Submit fictional details with a valid-format Thai phone number; verify one order is created and tracking opens.
4. Refresh tracking in the same browser. Verify access is retained. Open the link in a separate customer session; verify access is refused with guidance rather than showing customer details.
5. Before staff acceptance, open the payment URL directly. Verify there are no payment or receipt controls. After staff accepts, verify payment becomes available.
6. Select a non-image or an image over 5 MB. Verify feedback. Upload a sample image; verify the success state and tracking link. Refresh and verify another receipt cannot be attached.
7. Change an item's price, availability, or modifiers from the staff session after adding it to the customer cart. Submit the stale checkout; verify no order is created and the clear-cart action returns to the menu.
8. Verify cancelled and delivered orders cannot request another payment. Check missing order URLs and a failed network request show useful feedback.

## Staff workflow

1. Sign in as an ordinary email/password account without a role. Verify a clear authorization error and no dashboard access.
2. Sign in as authorized staff. Verify orders load and a newly placed order appears.
3. Accept → confirm receipt → prepare → ready → out for delivery → delivered. Verify each change appears in the customer session and the delivery image displays.
4. Exercise the undo action. Cancel a new/unpaid order without a receipt; verify the reason appears to the customer. Verify cancellation after receipt attachment is blocked.
5. Add/edit a fictional menu item with an image, mark it sold out, and restore availability. Verify customer view updates. Check store/category closure behavior.
6. Verify errors are visible if an update/upload fails. Confirm a mistaken click does not silently change order state.

## Optional notifications

If testing push, grant notification permission manually. Check foreground and background delivery on the actual device. Do not report notification delivery as verified merely because a function is deployed or an FCM token exists.

## Report results

For each failure, send the step number, device/browser, language, action, expected result, and actual result. Report completed steps explicitly; unreported steps remain unverified.
