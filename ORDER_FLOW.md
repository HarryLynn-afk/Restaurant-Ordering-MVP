# Order Flow Documentation

Complete end-to-end flows for customer orders and staff management in NOONA.

---

## 📱 Customer Order Flow

### Flow Diagram

```
OrderPage               CheckoutPage            PaymentPage              OrderStatusPage
(Browse Menu)          (Submit Order)          (Upload Slip)            (Track Status)
   │                      │                        │                          │
   ├─ Load menu items     │                        │                          │
   │  from Firestore      │                        │                          │
   │                      │                        │                          │
   ├─ Display categories  │                        │                          │
   │  and items           │                        │                          │
   │                      │                        │                          │
   ├─ Tap item            │                        │                          │
   │  (opens ModifierSheet)                       │                          │
   │                      │                        │                          │
   ├─ Select modifiers    │                        │                          │
   │  Required + Extras   │                        │                          │
   │                      │                        │                          │
   ├─ Add to cart         │                        │                          │
   │  (CartDrawer updates) │                       │                          │
   │                      │                        │                          │
   ├─ Review cart        │                        │                          │
   │  Update qty/remove   │                        │                          │
   │                      │                        │                          │
   └─ Tap "Checkout"     ──────────────────────>  │                          │
                            │                      │                          │
                            ├─ Enter name,        │                          │
                            │  phone, address,     │                          │
                            │  notes               │                          │
                            │                      │                          │
                            ├─ Validate fields    │                          │
                            │  (required + format) │                          │
                            │                      │                          │
                            ├─ Calculate total    │                          │
                            │  price               │                          │
                            │                      │                          │
                            └─ Tap "Place Order"  ┐                          │
                               │ Firestore write   │                          │
                               │ order doc created ├────────────────────────>│
                               │                   │                          │
                               │                   ├─ Show QR code           │
                               │                   │  from settings           │
                               │                   │                          │
                               │                   ├─ Customer sends payment │
                               │                   │  via bank transfer       │
                               │                   │                          │
                               │                   ├─ Upload slip image      │
                               │                   │  → Firebase Storage      │
                               │                   │  → Firestore update      │
                               │                   │                          │
                               │                   └─ Tap "View Status"     ──┐
                               │                                               │
                               │                                   ├─ Listen to order.status
                               │                                   │  updates (onSnapshot)
                               │                                   │
                               │                                   ├─ Show: new → unpaid
                               │                                   │  → preparing → ready
                               │                                   │  → out_for_delivery
                               │                                   │  → delivered
                               │                                   │
                               │                                   ├─ Receive push notifications
                               │                                   │  on status change
                               │                                   │
                               │                                   ├─ View delivery photo
                               │                                   │  (once out_for_delivery)
                               │                                   │
                               │                                   └─ Save order ID
                               │                                      to localStorage
                               └─────────────────────────────────────────────────>
```

### Step-by-Step Details

#### Step 1: Browse Menu (OrderPage)

**What happens:**

- React component mounts
- Calls `subscribeToMenu()` from `src/services/menu.js`
- Sets up real-time Firestore listener via `onSnapshot()`
- Menu items render as grid with images, prices, categories
- Search/category filter applied client-side

**Component Stack:**

```
OrderPage.jsx
├─ MenuDisplay.jsx
│  ├─ MenuItemCard.jsx (one per item)
│  │  ├─ Image + price + name
│  │  ├─ "Add" button (tap → open ModifierSheet)
│  │  └─ "Sold Out" badge (if soldOut=true)
│  └─ Category filter pills
└─ CartDrawer.jsx
   ├─ Cart total
   ├─ Items list (qty, remove)
   └─ "Checkout" button
```

**Data Flow:**

```
Firestore: menuItems collection
   ↓ (real-time onSnapshot)
useCart hook (localStorage)
   ↓
OrderPage state (menu items, search)
   ↓
MenuDisplay renders grid
```

**Edge Cases:**

- If menu is empty → Show "No items available" message
- If network error → Show "Failed to load menu" + retry button
- If menu updates while customer browsing → New items appear instantly (live)

---

#### Step 2: Select Modifiers (ModifierSheet)

**What happens:**

- Customer taps item card
- Bottom sheet slides up showing item details + modifiers
- Required modifiers (radio buttons) must be selected
- Optional modifiers (checkboxes) can be selected
- Customer confirms → item added to cart with selected modifiers

**Component Stack:**

```
ModifierSheet.jsx
├─ Item image + price
├─ Item name + description
├─ Required modifiers (radio group)
│  └─ "Must choose one"
├─ Optional modifiers (checkboxes)
│  └─ "Extras (add cost)"
├─ Quantity selector (1–99)
└─ "Add to Cart" button
```

**Data Model (stored in cart):**

```javascript
{
  itemId: "menu-123",
  name: "Iced Coffee",
  price: 60,
  quantity: 2,
  modifiers: [
    { name: "Size", selected: "Large" },
    { name: "Temperature", selected: "Iced" },
    { name: "Extra shot", selected: true }
  ]
}
```

**Edge Cases:**

- If item has no modifiers → Show "Add" button without ModifierSheet
- If required modifier not selected → Disable "Add" button + show error
- If quantity > inventory → Cap at available quantity (future feature)

---

#### Step 3: Review Cart (CartDrawer)

**What happens:**

- CartDrawer shows persistent slide-in panel
- Lists all items with quantity, modifiers, and subtotal
- Customer can increase/decrease quantity or remove items
- Cart persists to localStorage (survives page refresh + browser close)

**Component Stack:**

```
CartDrawer.jsx
├─ Swipe-up tab (minimal view)
│  └─ Item count + total price
├─ Full drawer (slide-in from bottom)
│  ├─ Item list
│  │  └─ OrderItemsList.jsx
│  │     └─ CartItem (qty controls, remove button)
│  ├─ Subtotal breakdown
│  ├─ Fees/tips (future)
│  └─ "Checkout" button
```

**Data Flow:**

```
localStorage: cart.json
   ↓ (useCart hook)
CartDrawer reads + displays
   ↓ (update qty/remove)
localStorage updated
   ↓
Component re-renders
```

**Edge Cases:**

- If cart is empty → Show "Your cart is empty" + "Browse menu" button
- If item is removed from menu while in cart → Show warning + remove from cart
- If browser storage full → Show warning + clear old carts

---

#### Step 4: Checkout (CheckoutPage)

**What happens:**

- Customer enters delivery information (name, phone, address, notes)
- Form validates on blur (required fields, phone format, address length)
- Cart review displayed above form
- On submit:
  1. Generate order ID (random 6-char alphanumeric)
  2. Write order doc to `orders/{orderId}`
  3. Clear localStorage cart
  4. Redirect to `/payment/{orderId}`

**Component Stack:**

```
CheckoutPage.jsx
├─ Cart summary (read-only)
├─ OrderForm.jsx
│  ├─ Name field (required, 2–50 chars)
│  ├─ Phone field (required, 10 digits)
│  ├─ Address field (required, 5–200 chars)
│  ├─ Notes field (optional, 0–500 chars)
│  ├─ Form validation (on blur)
│  ├─ Error messages per field
│  └─ "Place Order" button (disabled until valid)
└─ Loading state (spinner + disabled button during submit)
```

**Order Document Structure:**

```javascript
{
  id: "AB1C2D",
  customerName: "Kyaw",
  phone: "0812345678",
  address: "123 Yaowarat Rd, Bangkok",
  notes: "Extra ice please",
  items: [
    {
      itemId: "menu-123",
      name: "Iced Coffee",
      price: 60,
      quantity: 2,
      modifiers: [{ name: "Size", selected: "Large" }]
    }
  ],
  total: 120,
  subtotal: 120,
  fees: 0,
  status: "new",
  paymentSlipUrl: null,
  deliveryPhotoUrl: null,
  cancelReason: null,
  createdAt: Timestamp,
  updatedAt: Timestamp,
  uid: "<customer-firebase-uid>" // Anonymous auth
}
```

**Firestore Write Validation:**

```firestore
match /orders/{orderId} {
  allow create if:
    request.auth != null &&
    request.resource.data.uid == request.auth.uid &&
    validateOrderCreate(request.resource.data);
}
```

**Edge Cases:**

- If network error during submit → Show retry button
- If Firestore quota exceeded → Show "System busy, try again later"
- If form data contains XSS → Sanitized by Firestore rules
- If phone already has order → Allow (no uniqueness constraint)

---

#### Step 5: Upload Payment Slip (PaymentPage)

**What happens:**

- Fetch restaurant settings (QR code URL)
- Display QR code to customer
- Customer scans QR → sends bank transfer
- Customer takes screenshot of transfer confirmation
- Upload slip image:
  1. Compress image client-side
  2. Upload to `storage/slips/{uid}/{orderId}.jpg`
  3. Firestore doc updates: `order.paymentSlipUrl` = download URL (BUT: order can only fetch if staff has admin claim)
  4. Staff receives push notification ("New payment for order AB1C2D")
  5. Redirect to `/order/{orderId}`

**Component Stack:**

```
PaymentPage.jsx
├─ Order summary
├─ QR code image (from settings)
├─ Bank account details (if available)
├─ Payment slip uploader
│  ├─ File input (image only)
│  ├─ Preview (compressing spinner)
│  ├─ Upload progress
│  └─ "Upload Slip" button
├─ Success message (after upload)
└─ "View Status" button
```

**Storage Path & Permissions:**

```
storage/slips/{uid}/{orderId}.jpg

Storage rules:
- Customer can write to slips/{uid}/{orderId}.jpg (only their own uid)
- Staff with admin claim can read all slips/
- getDownloadURL() fails for customer (write-only access)
- Staff fetches URL via Cloud Function (getPaymentSlipUrl)
```

**Image Compression:**

```javascript
// Client-side compression
compressImage(file, { maxWidth: 800, maxHeight: 600, quality: 0.8 }).then(
  (blob) => uploadToStorage(blob, `slips/${uid}/${orderId}.jpg`),
);
```

**Push Notification Flow:**

```
1. Firestore: order.paymentSlipUrl updated
   ↓ (Cloud Function trigger)
2. Cloud Function: notifyStaffOnStatusChange
   ├─ Read order + settings
   ├─ Build notification payload
   └─ Send FCM to admin.fcmToken
3. Admin receives push: "New payment for order AB1C2D"
```

**Edge Cases:**

- If QR code not set in settings → Show placeholder + error message
- If image upload fails → Show error + retry button
- If network drops during upload → Auto-resume when connection restored
- If order already has slip → Show "Already paid" + option to replace

---

#### Step 6: Track Order Status (OrderStatusPage)

**What happens:**

- Customer views order by ID (from URL: `/order/{orderId}`)
- Real-time listener set up for order doc via `onSnapshot()`
- Status updates appear instantly (no refresh needed)
- Push notifications trigger on each status change
- Delivery photo visible once `status = out_for_delivery`
- Save order ID to localStorage for quick access

**Component Stack:**

```
OrderStatusPage.jsx
├─ Order summary (fixed)
│  ├─ Items + total
│  ├─ Delivery address
│  └─ Order ID (#AB1C2D)
├─ Status timeline
│  ├─ new (just submitted)
│  ├─ unpaid (waiting for slip)
│  ├─ preparing (staff accepted)
│  ├─ ready (ready for pickup)
│  ├─ out_for_delivery (on the way)
│  └─ delivered (completed)
├─ StatusToast (slide-down on status change)
├─ Delivery photo (if available)
├─ CancelOrderForm (if status = new/unpaid and no slip)
├─ IOSPrompt (show on iOS)
└─ Relative timestamp ("5m ago", "2h ago")
```

**Real-time Status Listener:**

```javascript
unsubscribe = subscribeToOrder(orderId, (order) => {
  // Called whenever order doc changes
  setOrder(order);
  // If status changed → play sound + show toast
});
```

**Status Progression:**

```
new
  ↓ (after payment slip)
unpaid
  ↓ (staff starts preparing)
preparing
  ↓ (staff marks ready)
ready
  ↓ (staff marks out for delivery + uploads photo)
out_for_delivery
  ↓ (staff marks delivered)
delivered ✓

OR at any point:
cancelled ✗ (if staff cancels before preparing)
```

**Edge Cases:**

- If order ID invalid → Show "Order not found"
- If network error → Show "Reconnecting..." + retry
- If order deleted (admin purge) → Show "Order no longer available"
- If status changes while page in background → Trigger push notification
- If delivery photo fails to load → Show placeholder image

---

## 👨‍💼 Staff Order Management Flow

### Flow Diagram

```
LoginPage              Dashboard               OrderCard               Action
(Authenticate)        (Real-time Orders)      (Order Details)         (Update Status)
   │                      │                        │                       │
   ├─ Email input         │                        │                       │
   │  Password input      │                        │                       │
   │                      │                        │                       │
   └─ Tap "Login"        ┐                         │                       │
      │ Firebase Auth     │                        │                       │
      │ Non-anonymous    └──────────────────────>  │                       │
      │                      │                      │                       │
      │                      ├─ Show tabs           │                       │
      │                      │  (Orders | Menu      │                       │
      │                      │   | Settings)        │                       │
      │                      │                      │                       │
      │                      ├─ Orders tab active  │                       │
      │                      │                      │                       │
      │                      ├─ Load recent orders │                       │
      │                      │  from Firestore     │                       │
      │                      │  (real-time)        │                       │
      │                      │                      │                       │
      │                      ├─ Filter by date     │                       │
      │                      │  Search by #ID      │                       │
      │                      │  Filter by status   │                       │
      │                      │                      │                       │
      │                      ├─ Show order cards   │                       │
      │                      │  (flat scrollable   │                       │
      │                      │   list)             │                       │
      │                      │                      │                       │
      │                      │  Status pill tabs   │                       │
      │                      │  (unpaid: 3, ...)  │                       │
      │                      │                      │                       │
      │                      └─ Tap order card    ─────────────────────>  │
      │                                                  │                  │
      │                                                  ├─ Expand details │
      │                                                  │  (read-only)    │
      │                                                  │                  │
      │                                                  ├─ Show payment  │
      │                                                  │  slip image     │
      │                                                  │                  │
      │                                                  ├─ Status dropdown
      │                                                  │  (Accept, Prepare,
      │                                                  │   Ready, Out,
      │                                                  │   Delivered)
      │                                                  │                  │
      │                                                  └─ Tap "Prepare" ────>
      │                                                     │ ConfirmModal   │
      │                                                     │ (prevent       │
      │                                                     │  accident)     │
      │                                                     └─ Update status
      │                                                        in Firestore
      │                                                        │
      │                                                        ├─ Send FCM to
      │                                                        │  customer
      │                                                        │
      │                                                        ├─ Undo button
      │                                                        │  (5 seconds)
      │                                                        │
      │                                                        └─ Card updates
      │                                                           (real-time)
```

### Step-by-Step Details

#### Step 1: Login (LoginPage)

**What happens:**

- Staff enters email + password
- Firebase Auth validates credentials
- Non-anonymous user session created
- Firestore admin claim check (future: optional)
- Redirect to `/dashboard`

**Component Stack:**

```
LoginPage.jsx
├─ Restaurant logo
├─ Email field
├─ Password field
├─ "Sign In" button
├─ Loading state
└─ Error message (if failed)
```

**Auth Flow:**

```javascript
signInWithEmailAndPassword(auth, email, password)
  .then((userCredential) => {
    // Store user session
    navigate("/dashboard");
  })
  .catch((error) => {
    // Show error: "Invalid email or password"
  });
```

**Edge Cases:**

- If email not found → "User not found"
- If password wrong → "Invalid password"
- If account disabled → "Account disabled"
- If network error → "Connection failed, retry"

---

#### Step 2: Dashboard Overview

**What happens:**

- Load protected dashboard with 3 tabs
- Fetch restaurant settings (name, QR code, LINE ID)
- Set up real-time order listener (new + active orders)
- Display orders list filtered by date/status/search
- Show status pill tabs with live counts
- Show active orders summary (urgent counts)

**Component Stack:**

```
Dashboard.jsx
├─ Header
│  ├─ Restaurant name
│  ├─ Language toggle
│  ├─ Logout button
│  └─ Sound alert toggle
├─ Tab navigation (Orders | Menu | Settings)
├─ Orders tab (OrdersTab.jsx)
│  ├─ Date picker
│  ├─ Search field (#ID or name)
│  ├─ Status filter pills (unpaid, preparing, ready, out_for_delivery)
│  ├─ Live counts on each pill
│  ├─ Active summary (urgent line)
│  └─ OrderCard list (flat scroll)
├─ Menu tab (MenuTab.jsx)
│  ├─ Add new item button
│  ├─ Menu items list
│  ├─ Edit/delete buttons
│  └─ Sold out toggle
└─ Settings tab (SettingsTab.jsx)
   ├─ Restaurant name input
   ├─ QR code uploader
   ├─ LINE ID input
   └─ FCM token display
```

**Real-time Subscription:**

```javascript
// Fetch orders from last 7 days + all active orders
subscribeToRecentOrders((orders) => {
  setOrders(orders);
  // Check if new order arrived → play chime sound
});
```

**Data Flow:**

```
Firestore: orders collection (7-day query + active status query)
   ↓ (real-time onSnapshot)
Dashboard state (orders list)
   ↓
OrdersTab filters + displays
   ↓
Tap order → OrderCard expands
```

**Edge Cases:**

- If no orders today → Show "No orders yet" message
- If network drops → Show "Reconnecting..." + cached orders
- If staff has 50+ orders → Show pagination or infinite scroll

---

#### Step 3: View Order Details (OrderCard)

**What happens:**

- OrderCard expands to show full order details
- Payment slip image visible (if uploaded)
- Delivery photo visible (if out_for_delivery)
- Status dropdown shows available transitions
- Undo button appears (5-second window after any change)

**Component Stack:**

```
OrderCard.jsx
├─ Order header
│  ├─ Order ID (#AB1C2D)
│  ├─ Customer name + phone
│  ├─ Delivery address
│  └─ Order time (relative: "2m ago")
├─ Status badge (color-coded)
├─ Items list
│  └─ Item name, qty, modifiers
├─ Total price
├─ Payment slip section
│  ├─ Thumbnail
│  └─ "View full size" (ImageLightbox)
├─ Delivery photo section
│  └─ DeliveryPhotoSection (show/upload/delete)
├─ Status dropdown
│  └─ Available transitions
├─ Cancel button (if new/unpaid)
├─ Undo button (if just changed)
└─ Special notes (if provided)
```

**Status Dropdown Options:**

```
Current Status  │  Available Transitions
────────────────┼─────────────────────────
new             │  accepting → unpaid, cancel
unpaid          │  accept → preparing, cancel (if no slip)
preparing       │  ready
ready           │  out_for_delivery
out_for_delivery│  delivered
delivered       │  (terminal)
cancelled       │  (terminal)
```

**Edge Cases:**

- If payment slip fails to load → Show placeholder image
- If delivery photo upload in progress → Show spinner
- If order was just cancelled by customer → Show notification + remove from list
- If multiple staff editing same order → Last change wins (with conflict warning)

---

#### Step 4: Update Order Status

**What happens:**

- Staff taps status dropdown or action button
- For critical actions (payment confirm, delivery):
  - ConfirmModal appears (prevent accidental push notifications)
  - Staff confirms → proceed
- Firestore order.status updated
- Cloud Function triggered
- Push notification sent to customer
- Toast shows confirmation message
- Undo button appears (5 seconds to revert)

**Status Change Flow:**

**A. New → Unpaid (Accept Order)**

```javascript
// Click "Accept" or select "unpaid" from dropdown
1. Show ConfirmModal:
   "Mark as unpaid? Customer will be notified."
2. Staff confirms
3. Firestore: order.status = "unpaid"
4. Cloud Function fires:
   - Build notification: "We received your order #AB1C2D"
   - Send to customer.fcmToken via FCM
5. Customer gets push notification
6. OrderCard updates (realtime)
7. UndoToast shows "Undo" button
8. If "Undo" clicked within 5s: revert to "new"
```

**B. Unpaid → Preparing (Start Preparing)**

```javascript
// Click "Start Preparing" or select "preparing" from dropdown
1. Show ConfirmModal:
   "Confirm payment received? Notify customer?"
2. Staff confirms (implies: payment slip verified)
3. Firestore: order.status = "preparing"
4. Cloud Function fires:
   - Build notification: "We're preparing your order"
   - Send to customer FCM
5. Customer gets push notification
6. OrderCard updates
7. Timer starts (estimated 20 mins = visible to customer)
8. UndoToast shows "Undo"
```

**C. Preparing → Ready**

```javascript
// Click "Mark Ready" or select "ready"
1. (No confirmation needed — internal status)
2. Firestore: order.status = "ready"
3. Cloud Function fires:
   - Build notification: "Your order is ready for pickup!"
   - Send to customer FCM
4. Customer gets push notification
5. OrderCard updates
6. UndoToast shows "Undo"
```

**D. Ready → Out for Delivery**

```javascript
// Click "Out for Delivery" or select "out_for_delivery"
1. (No confirmation — driver has order)
2. Firestore: order.status = "out_for_delivery"
3. DeliveryPhotoSection appears (editable)
4. Cloud Function fires:
   - Build notification: "Your order is on the way!"
   - Send to customer FCM
5. UndoToast shows "Undo"
```

**E. Out for Delivery → Delivered (Mark Delivered)**

```javascript
// Click "Delivered" or select "delivered"
1. Show ConfirmModal:
   "Mark as delivered? Final action."
2. Staff confirms
3. Require delivery photo (if not uploaded):
   - Show error: "Please upload delivery photo"
   - Open file picker
4. Firestore: order.status = "delivered"
5. Cloud Function fires:
   - Build notification with delivery photo
   - Send to customer FCM
6. Order marked as complete
7. UndoToast shows "Undo" (but only can revert within 5s)
```

**F. Cancel Order**

```javascript
// Click "Cancel" button (only if new/unpaid and no slip)
1. Open CancelOrderForm modal
2. Staff selects reason (no slots, customer request, etc.)
3. Optional: add custom reason text
4. Firestore: order.status = "cancelled", cancelReason = selected
5. Cloud Function fires:
   - Build notification: "Your order has been cancelled"
   - Reason text included
   - Send to customer FCM
6. OrderCard disappears from list (filtered out)
7. UndoToast shows "Undo"
```

**Undo Mechanism:**

```
UndoToast.jsx (global component in Dashboard)
├─ Subscribes to undoStore (module-level event bus)
├─ Shows toast for 5 seconds
├─ "Undo" button calls previous change
└─ Survives OrderCard re-mounts (store is singleton)
```

**Edge Cases:**

- If customer's fcmToken is missing → Log error but don't block status update
- If delivery photo is corrupted → Show "Invalid image" + retry
- If network error during Firestore write → Retry up to 3x + show error
- If staff changes mind within 5s → Click "Undo" → reverts to previous status

---

### Tab 2: Menu Management (MenuTab)

**What happens:**

- View all menu items in list or grid
- Add new item → MenuItemForm modal
- Edit existing item → MenuItemForm modal (pre-filled)
- Delete item → ConfirmModal confirmation
- Toggle "Sold Out" (no delete needed)
- Upload image → Firebase Storage → get URL → save to Firestore

**Component Stack:**

```
MenuTab.jsx
├─ "Add New Item" button
├─ Menu items list
│  └─ MenuItem
│     ├─ Item image thumbnail
│     ├─ Name + price
│     ├─ Category badge
│     ├─ "Sold Out" toggle
│     ├─ "Edit" button
│     └─ "Delete" button (with confirmation)
└─ MenuItemForm.jsx (modal)
   ├─ Item name (required)
   ├─ Price (required, number)
   ├─ Category (required, dropdown)
   ├─ Description (optional)
   ├─ Image uploader (optional)
   │  └─ Compress + upload to storage
   ├─ Modifiers section
   │  ├─ Required modifier group
   │  │  └─ Radio button options
   │  ├─ Optional modifier group
   │  │  └─ Checkbox options
   │  └─ Add/remove modifier groups
   ├─ "Save Item" button
   └─ "Cancel" button
```

**Add Item Flow:**

```javascript
1. Staff taps "Add New Item"
2. MenuItemForm opens (empty)
3. Staff fills: name, price, category, description, image, modifiers
4. Staff taps "Save"
5. Validation: name + price required
6. If image provided:
   - Compress client-side
   - Upload to storage/menu/{itemId}.jpg
   - Get download URL
7. Firestore: create menuItems/{itemId}
   {
     id: "item-123",
     name: "Iced Coffee",
     price: 60,
     category: "Beverages",
     description: "Cold brew coffee",
     imageUrl: "https://storage.firebase.com/...",
     modifiers: [
       { group: "Size", required: true, options: ["Small", "Medium", "Large"] },
       { group: "Extras", required: false, options: ["Extra shot", "Whipped cream"] }
     ],
     soldOut: false,
     createdAt: Timestamp,
     updatedAt: Timestamp
   }
8. Toast: "Item added successfully"
9. Modal closes
10. Menu list updates (real-time)
```

**Edit Item Flow:**

```javascript
1. Staff taps "Edit" on item card
2. MenuItemForm opens (pre-filled with current data)
3. Staff makes changes
4. Staff taps "Save"
5. Firestore: update menuItems/{itemId}
6. If image changed: upload new image
7. Toast: "Item updated"
8. Modal closes
9. Menu list updates
```

**Delete Item Flow:**

```javascript
1. Staff taps "Delete" on item card
2. ConfirmModal: "Delete this item? Cannot be undone."
3. Staff confirms
4. Firestore: delete menuItems/{itemId}
5. Storage: delete storage/menu/{itemId}.jpg (optional cleanup)
6. Toast: "Item deleted"
7. Menu list updates
```

**Toggle Sold Out:**

```javascript
1. Staff taps toggle on item card
2. Firestore: update menuItems/{itemId}.soldOut
3. Customer sees "Sold Out" badge instantly (real-time)
4. Can't add sold out items to cart (UI disabled)
```

**Edge Cases:**

- If image too large → Compress on client + show progress
- If upload fails → Show retry button + cache item locally
- If category doesn't exist → Auto-create category
- If staff deletes popular item → Show warning (future: analytics)
- If item name duplicated → Allow (no uniqueness constraint)

---

### Tab 3: Settings (SettingsTab)

**What happens:**

- Read current settings from Firestore
- Update restaurant name, LINE ID, QR code
- View FCM token status (for testing)
- Save changes → Firestore update

**Component Stack:**

```
SettingsTab.jsx
├─ Restaurant name input
├─ LINE ID input
├─ QR code uploader
│  ├─ Current QR image (if exists)
│  ├─ File picker
│  └─ Upload progress
├─ FCM token display (read-only)
│  └─ "Copy" button
├─ Save button
└─ Success/error messages
```

**Settings Data Model:**

```javascript
// Firestore: settings/restaurant
{
  restaurantName: "NOONA Cafe",
  lineId: "@noona-cafe",
  qrCodeUrl: "https://storage.firebase.com/...",
  fcmToken: "c8JqfD7K...",
  openingHours: null, // future
  closedMessage: null, // future
  updatedAt: Timestamp
}
```

**Update Name Flow:**

```javascript
1. Staff edits restaurant name field
2. Tap "Save"
3. Validation: name required, 2–50 chars
4. Firestore: update settings/restaurant.restaurantName
5. Toast: "Restaurant name updated"
6. All customers see new name instantly (real-time)
```

**Update QR Code Flow:**

```javascript
1. Staff taps "Upload QR Code"
2. File picker → select image
3. Image preview shown
4. Auto-compress client-side
5. Upload to storage/settings/qr-code.jpg
6. Get download URL
7. Firestore: update settings/restaurant.qrCodeUrl
8. Toast: "QR code updated"
9. PaymentPage shows new QR instantly (real-time)
```

**FCM Token Status:**

```javascript
// Display current token (for testing/debugging)
// Staff can re-generate if needed (Cloud Function)
// Token auto-synced every session
```

**Edge Cases:**

- If QR code too small → Show warning (recommend 500x500px min)
- If NAME change duplicates → Allow (no uniqueness)
- If LINE ID invalid → Show format warning (must start with @)
- If no upload permission → Show "Upload failed" + retry

---

## 🔄 Real-time Synchronization

### Customer & Staff Sync

```
Customer updates order (cancel, view):
  ↓
Firestore doc updates
  ↓
Cloud Function trigger (if status relevant)
  ↓
Admin listener hears change (real-time)
  ↓
OrderCard re-renders

Staff updates order (status, delivery photo):
  ↓
Firestore doc updates
  ↓
Cloud Function trigger (if customer should be notified)
  ↓
Send FCM push to customer.fcmToken
  ↓
Customer listener hears change (real-time)
  ↓
OrderStatusPage re-renders + sound/toast notification
```

### Menu Sync

```
Staff edits menu (add/update/delete item):
  ↓
Firestore menuItems collection updates
  ↓
Customer's real-time listener fires
  ↓
MenuDisplay re-renders (instant, no refresh needed)
```

---

## ⚠️ Error Handling & Recovery

### Network Errors

- **Customer losing connection during checkout** → Show "Connection lost" + retry button
- **Staff receiving stale order data** → Show "Reconnecting..." + refetch
- **FCM notification fails to send** → Log error, don't block status update

### Data Validation

- **Firestore rule violation** → Show friendly error (no direct rule message)
- **Rate limit exceeded (5 orders/hour)** → Show "Too many orders, wait a bit" + auto-cancel
- **Invalid modifier selection** → Disable submit + show error

### Conflict Resolution

- **Staff A and B both update same order status** → Last write wins (with warning toast)
- **Order deleted while customer viewing** → Show "Order no longer available"
- **Item removed while in customer's cart** → Show warning + remove from cart

---

## 📊 Order Status Reference

### Status Codes

| Code               | Customer Label      | Staff Action        | FCM Sent |
| ------------------ | ------------------- | ------------------- | -------- |
| `new`              | (internal)          | Accept order        | No       |
| `unpaid`           | Waiting for payment | Verify slip upload  | Yes      |
| `preparing`        | Being prepared      | Start cooking       | Yes      |
| `ready`            | Ready for pickup    | Mark ready          | Yes      |
| `out_for_delivery` | On the way          | Send delivery photo | Yes      |
| `delivered`        | Delivered ✓         | Mark delivered      | Yes      |
| `cancelled`        | Cancelled ✗         | Cancel reason       | Yes      |

### Allowed Transitions

```
new ────→ unpaid ────→ preparing ────→ ready ────→ out_for_delivery ────→ delivered
 │                                                                           ▲
 └───────────────────── cancel (if new/unpaid) ─────────── no slip ─────────┘
```

---

## 📱 Push Notification Templates

### Customer Notifications

- **Order Accepted** → "We received your order #AB1C2D. Waiting for payment slip."
- **Order Preparing** → "We're preparing your order. Estimated 20 mins."
- **Order Ready** → "Your order is ready for pickup! 🎉"
- **Out for Delivery** → "Your order is on the way! [delivery photo] 📦"
- **Delivered** → "Order delivered! Thanks for ordering. Rate us? [link]"
- **Cancelled** → "Your order has been cancelled. Reason: No slots available."

### Staff Notifications

- **New Order** → "New order #AB1C2D: Iced Coffee x2 (฿120) → Payment slip waiting"
- **Payment Received** → "Payment slip uploaded for order #AB1C2D"

---

## 🧪 Testing Scenarios

### Scenario 1: Happy Path (Complete Order)

```
1. Customer browses menu → adds 2 items + modifiers
2. Checkout with delivery info
3. Receives order ID (#AB1C2D)
4. Uploads payment slip
5. Staff notified (chime sound)
6. Staff marks "Preparing" → customer gets push
7. Staff marks "Ready" → customer gets push
8. Staff marks "Out for Delivery" → uploads photo → customer gets push
9. Customer sees delivery photo on OrderStatusPage
10. Staff marks "Delivered" → customer gets final push
```

### Scenario 2: Cancel Before Payment

```
1. Customer places order
2. Staff sees order in "new" status
3. Staff clicks "Cancel" (cancellation allowed because no slip yet)
4. Selects reason: "No slots available"
5. Customer gets push: "Your order has been cancelled"
6. Order marked as cancelled in customer's history
```

### Scenario 3: Network Failure & Recovery

```
1. Customer submitting checkout form
2. Network drops mid-submission
3. Customer sees "Connection failed" + retry button
4. Customer reconnects
5. Clicks retry
6. Order successfully submitted
7. Continues to payment flow
```

### Scenario 4: Admin Modifies Menu

```
1. Customer viewing menu (MenuDisplay open)
2. Staff adds new "Cappuccino" item via MenuTab
3. New item appears instantly on customer's screen (real-time)
4. Customer can immediately order it
5. Staff marks "Iced Coffee" as sold out
6. Customer sees "Sold Out" badge instantly
7. Can't add to cart (button disabled)
```

---

## 📋 Checklist: Adding a New Order Status

If you need to add a new status in the future:

- [ ] Add status code to `orders.js` status enum
- [ ] Add i18n label in `translations.js` (EN + MY)
- [ ] Add color mapping in `orderStatus.js` (`ADMIN_STATUS_BADGE_COLORS`, `CUSTOMER_TONE_CONTAINER`, `CUSTOMER_TONE_TEXT`)
- [ ] Update status transition logic in `orderStatus.js` (allowed next statuses)
- [ ] Update OrderCard dropdown options
- [ ] Add Cloud Function notification template (if customer should be notified)
- [ ] Add test cases in `orderStatus.test.js`
- [ ] Update this document's status reference table
