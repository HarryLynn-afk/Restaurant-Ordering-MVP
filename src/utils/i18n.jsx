import { createContext, useContext, useMemo, useState } from 'react';

const LANGUAGE_STORAGE_KEYS = {
  customer: 'language_customer',
  admin: 'language_admin',
};

const DEFAULT_LANGUAGE = 'en';
const SUPPORTED_LANGUAGES = new Set(['en', 'my']);

const translations = {
  en: {
    common: {
      all: 'All',
      total: 'Total',
      back: 'Back',
      cancel: 'Cancel',
      confirm: 'Confirm',
      save: 'Save',
      delete: 'Delete',
      deleteConfirm: "Delete '{{name}}'?",
      edit: 'Edit',
      add: 'Add',
      loading: 'Loading...',
      notSet: 'Not set',
      yourOrder: 'Your Order',
      paymentSlip: 'Payment Slip',
      deliveryPhoto: 'Delivery Photo',
      contactLine: 'Contact us on LINE',
    },
    customer: {
      restaurantFallback: 'NOONA',
      busyDefault: "We're currently busy - orders may take longer than usual.",
      storeClosedTitle: "We're closed for today",
      storeClosedMessage: "We're not accepting orders right now. Please check back tomorrow.",
      loadingMenu: 'Loading menu...',
      failedToLoadMenu: 'Failed to load menu',
      noItemsInCategory: 'No items in this category.',
      cartTitle: 'Your Cart',
      cartEmpty: 'Your cart is empty',
      placeOrder: 'Place Order →',
      orderMoreFood: 'Order More Food',
      backToMenu: 'Back to Menu',
      backToHome: 'Back to Home',
      todaysMenu: "Today's Menu",
      itemsCount: '{{count}} items',
      noMenuTitle: 'No menu items yet',
      noMenuDescription: 'Menu items will appear here once the restaurant adds them.',
      soldOut: 'Sold Out',
      add: 'Add',
      addToCart: 'Add to Cart',
      required: 'Required',
      optional: 'Optional',
      checkoutTitle: 'Confirm Order',
      orderSummary: 'Order Summary',
      deliveryInfo: 'Delivery Information',
      clearInfo: 'Not you? Clear info',
      soldOutWarningTitle: 'Some items are now sold out:',
      soldOutWarningBody: 'Please go back and remove them before ordering.',
      genericError: 'Something went wrong. Please try again.',
      placingOrder: 'Placing order...',
      confirmPay: 'Confirm & Pay →',
      form: {
        fullName: 'Full Name',
        fullNamePlaceholder: 'Enter your name',
        phoneNumber: 'Phone Number',
        phonePlaceholder: 'e.g. 0812345678',
        address: 'Delivery Address',
        addressPlaceholder: 'House number, street, district, city',
        notes: 'Notes (optional)',
        notesPlaceholder: 'e.g. No onions, extra spicy',
        lineId: 'LINE ID (optional)',
        lineIdPlaceholder: 'e.g. yourlineid',
        lineIdHelp: 'So the restaurant can contact you via LINE',
      },
      validation: {
        nameRequired: 'Name is required.',
        phoneRequired: 'Phone number is required.',
        phoneInvalid: 'Enter a valid Thai mobile number (e.g. 0812345678).',
        addressRequired: 'Address is required.',
        lineIdInvalid: 'LINE ID must be 4-20 characters and start with a letter.',
      },
      payment: {
        title: 'Payment',
        loadingError: 'Order not found.',
        imageTooLarge: 'Image must be under 5MB.',
        uploadFailed: 'Upload failed. Please try again.',
        amountDue: 'Amount Due',
        scanQr: 'Scan QR Code to Pay',
        qrNotSet: 'QR code not set up yet.',
        payViaBank: 'Pay via your banking app, then upload your payment slip below.',
        uploadSlip: 'Upload Payment Slip',
        uploadedTitle: 'Payment slip uploaded!',
        uploadedDescription: 'Your slip is attached to the order and the kitchen will start once it is checked.',
        trackOrder: 'Track My Order →',
        chooseSlip: 'Tap to choose a slip photo',
        chooseAgain: 'Choose Again',
        submitSlip: 'Submit Slip',
        uploading: 'Uploading...',
      },
      orderStatus: {
        title: 'Order Status',
        orderNotFound: 'Order not found.',
        cancelled: 'Order Cancelled',
        reasonLabel: 'Reason: {{reason}}',
        waitingConfirm: 'Waiting for restaurant to confirm your order...',
        payNow: 'Pay Now →',
        slipReceived: 'Slip received',
        slipReceivedDescription: 'We have your slip and the kitchen will start once it is checked.',
        progress: 'Progress',
        deliveryPhotoCaption: 'Photo taken by delivery staff',
        getNotifications: 'Get order notifications',
        addToHomeScreen: 'Add this page to your home screen to receive updates when your order status changes:',
        tapShare: 'Tap the Share button at the bottom of Safari',
        selectAddToHome: 'Select "Add to Home Screen"',
        openFromHome: 'Open the app from your home screen',
        dismiss: 'Dismiss',
        status: {
          orderReceived: 'Order Received',
          pleasePay: 'Please Pay',
          paymentReview: 'Payment under review',
          preparing: 'Preparing your order',
          outForDelivery: 'Out for Delivery',
          delivered: 'Delivered',
        },
        statusDescription: {
          orderReceived: 'Your order is in the queue and waiting for restaurant confirmation.',
          pleasePay: 'Complete payment and upload your slip so the restaurant can confirm it.',
          paymentReview: 'We have your slip. The kitchen will start once payment is confirmed.',
          preparing: 'Payment is confirmed and the kitchen is now preparing your order.',
          outForDelivery: 'Your order is on the way to you.',
          delivered: 'Your order has been delivered successfully.',
        },
      },
    },
    admin: {
      login: {
        title: 'Staff Login',
        subtitle: 'Restaurant dashboard access only',
        email: 'Email',
        emailPlaceholder: 'staff@restaurant.com',
        password: 'Password',
        passwordPlaceholder: '••••••••',
        invalidError: 'Invalid email or password. Please try again.',
        signingIn: 'Signing in...',
        signIn: 'Sign In',
      },
      protectedRoute: {
        loading: 'Loading...',
      },
      orders: {
        searchPlaceholder: 'Search by name, phone, order ID, or item...',
        searchResults: '{{count}} result{{suffix}} for "{{query}}"',
        noOrdersFound: 'No orders found.',
        today: 'Today',
        noOrdersToday: 'No orders today.',
        noFilteredOrdersToday: 'No {{status}} orders today.',
        noOrdersOnDate: 'No orders on {{date}}.',
      },
      menu: {
        soldOut: 'Sold Out',
        available: 'Available',
        uncategorized: 'Uncategorized',
        searchPlaceholder: 'Search items...',
        markAllAvailable: 'Mark All Available',
        resetting: 'Resetting...',
        addItem: 'Add Item',
        editCategories: 'Edit Categories',
        noItemsMatching: 'No items matching "{{query}}".',
        noItemsHere: 'No items here.',
      },
      settings: {
        general: 'General',
        categories: 'Categories',
        restaurantInfo: 'Restaurant Info',
        restaurantName: 'Restaurant Name',
        lineId: 'LINE ID',
        lineIdPlaceholder: '@yourlineid',
        busyModeMessage: 'Busy Mode Message',
        busyModePlaceholder: "e.g. We're busy - orders may take 45+ min",
        busyModeHelp: 'Shown to customers when Busy is toggled on.',
        paymentQrCode: 'Payment QR Code',
        changeQr: 'Change QR',
        uploadQrCode: 'Upload QR Code',
        uploadingQr: 'Uploading QR...',
        saving: 'Saving...',
        noCategoriesYet: 'No categories yet. Add one below.',
        menuCategories: 'Menu Categories',
        categoryPlaceholder: 'e.g. Rice, Drinks, Desserts',
      },
      dashboard: {
        title: 'Dashboard',
        newOrdersNeedAction: '{{count}} new order{{suffix}} need action',
        storeClosed: 'Closed',
        storeOpen: 'Open',
        busy: 'Busy',
        notBusy: 'Not Busy',
        soundOn: 'Sound On',
        soundOff: 'Sound Off',
        logOut: 'Log Out',
        logoutConfirmMessage: "You'll need to sign in again to access the dashboard.",
        storeClosedConfirmMessage: 'This will stop accepting new orders immediately.',
        storeOpenConfirmMessage: 'This will allow customers to place orders again.',
        tapToEnableSound: 'Tap to enable sound',
        enableSoundTitle: 'Enable Alert Sound',
        enableSoundMessage: 'The alert sound is blocked by your browser. Tap Enable to turn it on.',
        enableSound: 'Enable',
        ordersTab: 'Orders',
        menuTab: 'Menu',
        settingsTab: 'Settings',
        newOrdersWaiting: '{{count}} new order{{suffix}} waiting for action',
        acceptOrCancel: 'Accept or cancel each order to clear this alert.',
        viewOrders: 'View Orders',
        notifications: 'Notifications: {{status}}',
        enableBrowserNotifications: 'Click to enable browser notifications for new orders.',
        enableNotifications: 'Enable Notifications',
        notificationStatus: {
          idle: 'idle',
          requesting: 'requesting',
          failed: 'failed',
          success: 'success',
        },
      },
      menuItemForm: {
        editTitle: 'Edit Menu Item',
        addTitle: 'Add New Item',
        photo: 'Photo',
        photoTooLarge: 'Photo must be under 10MB.',
        choosePhoto: 'Choose a photo',
        itemName: 'Item Name',
        itemNamePlaceholder: 'e.g. Fried Rice',
        description: 'Description',
        descriptionPlaceholder: 'e.g. Fried rice with shrimp and egg',
        category: 'Category',
        noCategory: 'No category',
        price: 'Price',
        photoUploadFailed: 'Photo upload failed: {{message}}',
        saveFailed: 'Save failed: {{message}}',
        uploadingPhoto: 'Uploading photo...',
        modifierGroups: 'Choices & Extras',
        addRequiredChoice: '+ Required Choice',
        addOptionalExtras: '+ Optional Extras',
        requiredChoiceBadge: 'Required choice',
        optionalExtrasBadge: 'Optional extras',
        requiredChoiceHint: 'Customer must pick one before ordering',
        optionalExtrasHint: 'Customer can add any (price optional)',
        groupNamePlaceholderRequired: 'e.g. Which type?',
        groupNamePlaceholderExtras: 'e.g. Add extras',
        optionNamePlaceholder: 'e.g. Chicken',
        extraPricePlaceholder: 'Price',
        addOption: '+ Add option',
        noOptionsYet: 'No options yet. Add one below.',
      },
      orderCard: {
        chatOnLine: 'Chat on LINE ({{lineId}})',
        noSlipYet: 'No slip yet',
        slipReceived: 'Slip received',
        removePhoto: 'Remove photo',
        uploadPhoto: 'Upload Photo',
        uploadFailed: 'Upload failed: {{message}}',
        statusUpdated: 'Status updated successfully.',
        startPreparing: 'Start Preparing',
        starting: 'Starting...',
        accept: 'Accept',
        processing: 'Processing...',
        cancelOrder: 'Cancel Order',
        selectCancellationReason: 'Select cancellation reason:',
        otherReasonPlaceholder: 'Please specify reason...',
        confirmCancel: 'Confirm Cancel',
        cancelling: 'Cancelling...',
        updateStatus: 'Update Status:',
        updating: 'Updating...',
        reasonLabel: 'Reason: {{reason}}',
        reasonOptions: {
          outOfStock: 'Out of stock',
          restaurantClosed: 'Restaurant closed',
          outOfDeliveryArea: 'Out of delivery area',
          other: 'Other',
        },
      },
      status: {
        filter: {
          all: 'All',
          new: 'New',
          unpaid: 'Unpaid',
          preparing: 'Preparing',
          ready: 'Ready',
          delivered: 'Delivered',
          cancelled: 'Cancelled',
        },
        card: {
          new: 'New Order',
          unpaid: 'Unpaid',
          preparing: 'Preparing',
          ready: 'Ready',
          delivered: 'Delivered',
          cancelled: 'Cancelled',
        },
        progress: {
          unpaid: 'Unpaid',
          preparing: 'Preparing',
          ready: 'Ready',
          delivered: 'Delivered',
        },
      },
    },
  },
  my: {
    common: {
      all: 'အားလုံး',
      total: 'စုစုပေါင်း',
      back: 'နောက်သို့',
      cancel: 'မလုပ်တော့',
      confirm: 'အတည်ပြု',
      save: 'သိမ်းမည်',
      delete: 'ဖျက်မည်',
      deleteConfirm: "'{{name}}' ဖျက်မည်?",
      edit: 'ပြင်မည်',
      add: 'ထည့်မည်',
      loading: 'ဖွင့်နေသည်...',
      notSet: 'မသတ်မှတ်ရသေးပါ',
      yourOrder: 'သင့်အော်ဒါ',
      paymentSlip: 'ငွေလွှဲစလစ်',
      deliveryPhoto: 'ပို့ဆောင်ဓာတ်ပုံ',
      contactLine: 'LINE မှ ဆက်သွယ်မည်',
    },
    customer: {
      restaurantFallback: 'NOONA',
      busyDefault: 'အခုအချိန်မှာ အော်ဒါများနေပါတယ်။ အချိန်ပိုကြာနိုင်ပါတယ်။',
      storeClosedTitle: 'ယနေ့အတွက် ပိတ်ထားပါသည်',
      storeClosedMessage: 'အခုအချိန်တွင် အော်ဒါများ မတင်နိုင်ပါ။ မနက်ဖြန် ပြန်လာပါ။',
      loadingMenu: 'မီနူးကို ဖွင့်နေသည်...',
      failedToLoadMenu: 'မီနူးဖွင့်မရပါ',
      noItemsInCategory: 'ဤအမျိုးအစားတွင် မီနူးမရှိသေးပါ။',
      cartTitle: 'သင့်စျေးခြင်းတောင်း',
      cartEmpty: 'စျေးခြင်းတောင်းထဲမှာ ဘာမှမရှိသေးပါ။',
      placeOrder: 'အော်ဒါတင်မည် →',
      orderMoreFood: 'အစားအစာ ထပ်မှာမည်',
      backToMenu: 'မီနူးသို့ ပြန်မည်',
      backToHome: 'ပင်မစာမျက်နှာသို့ ပြန်မည်',
      todaysMenu: 'ယနေ့ မီနူး',
      itemsCount: '{{count}} ခု',
      noMenuTitle: 'မီနူးမရှိသေးပါ',
      noMenuDescription: 'ဆိုင်မှ မီနူးထည့်ပြီးသည်နှင့် ဤနေရာတွင် ပေါ်လာပါမည်။',
      soldOut: 'ကုန်သွားပြီ',
      add: 'ထည့်မည်',
      addToCart: 'တောင်းထဲ ထည့်မည်',
      required: 'ရွေးချယ်ရမည်',
      optional: 'ရွေးချယ်နိုင်',
      checkoutTitle: 'အော်ဒါ အတည်ပြုရန်',
      orderSummary: 'အော်ဒါ အနှစ်ချုပ်',
      deliveryInfo: 'ပို့ဆောင်ရေး အချက်အလက်',
      clearInfo: 'အခြားသူလား? အချက်အလက်ရှင်းမည်',
      soldOutWarningTitle: 'မီနူးအချို့ ကုန်သွားပါပြီ:',
      soldOutWarningBody: 'အော်ဒါမတင်မီ နောက်သို့ပြန်ပြီး ဖယ်ရှားပါ။',
      genericError: 'တစ်ခုခုမှားယွင်းသွားပါသည်။ ထပ်မံကြိုးစားပါ။',
      placingOrder: 'အော်ဒါတင်နေသည်...',
      confirmPay: 'အတည်ပြုပြီး ငွေချေမည် →',
      form: {
        fullName: 'အမည်အပြည့်အစုံ',
        fullNamePlaceholder: 'သင့်အမည်ထည့်ပါ',
        phoneNumber: 'ဖုန်းနံပါတ်',
        phonePlaceholder: 'ဥပမာ 0812345678',
        address: 'ပို့ဆောင်ရမည့် လိပ်စာ',
        addressPlaceholder: 'အိမ်နံပါတ်၊ လမ်း၊ မြို့နယ်၊ မြို့',
        notes: 'မှတ်ချက် (မလိုအပ်ပါ)',
        notesPlaceholder: 'ဥပမာ ကြက်သွန်မပါ၊ အစပ်ပို',
        lineId: 'LINE ID (မလိုအပ်ပါ)',
        lineIdPlaceholder: 'ဥပမာ yourlineid',
        lineIdHelp: 'ဆိုင်မှ LINE မှတဆင့် ဆက်သွယ်နိုင်ရန်',
      },
      validation: {
        nameRequired: 'အမည်ဖြည့်ရန်လိုပါသည်။',
        phoneRequired: 'ဖုန်းနံပါတ်ဖြည့်ရန်လိုပါသည်။',
        phoneInvalid: 'မှန်ကန်သော ထိုင်းမိုဘိုင်းဖုန်းနံပါတ်ကို ဖြည့်ပါ (ဥပမာ 0812345678)။',
        addressRequired: 'လိပ်စာဖြည့်ရန်လိုပါသည်။',
        lineIdInvalid: 'LINE ID သည် 4-20 လုံးဖြစ်ရပြီး အက္ခရာဖြင့် စရပါမည်။',
      },
      payment: {
        title: 'ငွေပေးချေမှု',
        loadingError: 'အော်ဒါကို မတွေ့ပါ။',
        imageTooLarge: 'ပုံဖိုင်သည် 5MB အောက်ဖြစ်ရပါမည်။',
        uploadFailed: 'တင်မရပါ။ ထပ်မံကြိုးစားပါ။',
        amountDue: 'ပေးချေရမည့် ပမာဏ',
        scanQr: 'ငွေချေရန် QR ကို စကင်လုပ်ပါ',
        qrNotSet: 'QR code မသတ်မှတ်ရသေးပါ။',
        payViaBank: 'ဘဏ် app ဖြင့် ငွေပေးချေပြီးနောက် ငွေလွှဲစလစ်ကို အောက်တွင် တင်ပါ။',
        uploadSlip: 'ငွေလွှဲစလစ် တင်ပါ',
        uploadedTitle: 'စလစ်တင်ပြီးပါပြီ!',
        uploadedDescription: 'စလစ်ကို အော်ဒါနှင့် ချိတ်ထားပြီး ဆိုင်မှ စစ်ဆေးပြီးနောက် စတင်ပြင်ဆင်ပါမည်။',
        trackOrder: 'အော်ဒါကို ကြည့်မည် →',
        chooseSlip: 'စလစ်ပုံရွေးရန် နှိပ်ပါ',
        chooseAgain: 'ထပ်ရွေးမည်',
        submitSlip: 'စလစ်တင်မည်',
        uploading: 'တင်နေသည်...',
      },
      orderStatus: {
        title: 'အော်ဒါ အခြေအနေ',
        orderNotFound: 'အော်ဒါကို မတွေ့ပါ။',
        cancelled: 'အော်ဒါကို ပယ်ဖျက်ထားပါသည်',
        reasonLabel: 'အကြောင်းပြချက်: {{reason}}',
        waitingConfirm: 'ဆိုင်မှ သင့်အော်ဒါကို အတည်ပြုနေသည်...',
        payNow: 'ယခု ငွေချေမည် →',
        slipReceived: 'စလစ် လက်ခံရရှိပြီး',
        slipReceivedDescription: 'စလစ်ကို ရရှိထားပြီး ဆိုင်မှ စစ်ဆေးပြီးနောက် စတင်ပြင်ဆင်ပါမည်။',
        progress: 'အခြေအနေ',
        deliveryPhotoCaption: 'ပို့ဆောင်သူမှ ရိုက်ထားသော ဓာတ်ပုံ',
        getNotifications: 'အော်ဒါ အသိပေးချက်များ ရယူရန်',
        addToHomeScreen: 'အော်ဒါအခြေအနေ ပြောင်းလဲသောအခါ အသိပေးချက်ရယူရန် ဤစာမျက်နှာကို home screen သို့ ထည့်ပါ:',
        tapShare: 'Safari အောက်ခြေရှိ Share ခလုတ်ကို နှိပ်ပါ',
        selectAddToHome: '"Add to Home Screen" ကို ရွေးပါ',
        openFromHome: 'Home screen မှ app ကို ဖွင့်ပါ',
        dismiss: 'ပိတ်မည်',
        status: {
          orderReceived: 'အော်ဒါ လက်ခံပြီး',
          pleasePay: 'ငွေချေပါ',
          paymentReview: 'ငွေပေးချေမှု စစ်ဆေးနေသည်',
          preparing: 'အော်ဒါကို ပြင်ဆင်နေပါတယ်',
          outForDelivery: 'ပို့ဆောင်နေပါတယ်',
          delivered: 'ပို့ပြီးပါပြီ',
        },
        statusDescription: {
          orderReceived: 'သင့်အော်ဒါကို ဆိုင်မှ စစ်ဆေးအတည်ပြုရန် စောင့်နေပါသည်။',
          pleasePay: 'ငွေပေးချေပြီး စလစ်တင်ပေးပါက ဆိုင်မှ စစ်ဆေးအတည်ပြုနိုင်ပါသည်။',
          paymentReview: 'သင့်စလစ်ကို လက်ခံရရှိထားပြီး ငွေပေးချေမှု အတည်ပြုပြီးနောက် စတင်ပြင်ဆင်ပါမည်။',
          preparing: 'ငွေပေးချေမှု အတည်ပြုပြီးဖြစ်ပြီး အော်ဒါကို စတင်ပြင်ဆင်နေပါသည်။',
          outForDelivery: 'သင့်အော်ဒါကို ပို့ဆောင်လာနေပါသည်။',
          delivered: 'သင့်အော်ဒါကို အောင်မြင်စွာ ပို့ဆောင်ပြီးပါပြီ။',
        },
      },
    },
    admin: {
      login: {
        title: 'ဝန်ထမ်း ဝင်ရန်',
        subtitle: 'စားသောက်ဆိုင် dashboard အတွက်သာ',
        email: 'အီးမေးလ်',
        emailPlaceholder: 'staff@restaurant.com',
        password: 'လျှို့ဝှက်နံပါတ်',
        passwordPlaceholder: '••••••••',
        invalidError: 'အီးမေးလ် သို့မဟုတ် လျှို့ဝှက်နံပါတ် မှားနေပါသည်။ ထပ်မံကြိုးစားပါ။',
        signingIn: 'ဝင်နေသည်...',
        signIn: 'ဝင်မည်',
      },
      protectedRoute: {
        loading: 'ဖွင့်နေသည်...',
      },
      orders: {
        searchPlaceholder: 'အမည်၊ ဖုန်း၊ အော်ဒါ ID သို့မဟုတ် မီနူးအမည်ဖြင့် ရှာပါ...',
        searchResults: '"{{query}}" အတွက် {{count}} ခု တွေ့ရှိသည်',
        noOrdersFound: 'အော်ဒါမတွေ့ပါ။',
        today: 'ယနေ့',
        noOrdersToday: 'ယနေ့ အော်ဒါမရှိပါ။',
        noFilteredOrdersToday: 'ယနေ့ {{status}} အော်ဒါမရှိပါ။',
        noOrdersOnDate: '{{date}} တွင် အော်ဒါမရှိပါ။',
      },
      menu: {
        soldOut: 'ကုန်သွားပြီ',
        available: 'ရနိုင်သည်',
        uncategorized: 'အမျိုးအစားမသတ်မှတ်ထား',
        searchPlaceholder: 'မီနူးများကို ရှာပါ...',
        markAllAvailable: 'အားလုံးကို ရနိုင်အောင်လုပ်မည်',
        resetting: 'ပြန်လည်သတ်မှတ်နေသည်...',
        addItem: 'မီနူး ထည့်မည်',
        editCategories: 'အမျိုးအစား ပြင်ဆင်ရန်',
        noItemsMatching: '"{{query}}" နှင့် ကိုက်ညီသော မီနူးမရှိပါ။',
        noItemsHere: 'ဤနေရာတွင် မီနူးမရှိပါ။',
      },
      settings: {
        general: 'အထွေထွေ',
        categories: 'အမျိုးအစားများ',
        restaurantInfo: 'ဆိုင် အချက်အလက်',
        restaurantName: 'ဆိုင်အမည်',
        lineId: 'LINE ID',
        lineIdPlaceholder: '@yourlineid',
        busyModeMessage: 'အော်ဒါများချိန် စာသား',
        busyModePlaceholder: 'ဥပမာ အော်ဒါများနေပါသည်။ 45 မိနစ်ကျော် စောင့်ရနိုင်ပါသည်။',
        busyModeHelp: 'Busy ဖွင့်ထားစဉ် customer များကို ပြသမည်။',
        paymentQrCode: 'ငွေပေးချေမှု QR Code',
        changeQr: 'QR ပြောင်းမည်',
        uploadQrCode: 'QR Code တင်မည်',
        uploadingQr: 'QR တင်နေသည်...',
        saving: 'သိမ်းနေသည်...',
        noCategoriesYet: 'အမျိုးအစားမရှိသေးပါ။ အောက်တွင် ထည့်ပါ။',
        menuCategories: 'မီနူး အမျိုးအစားများ',
        categoryPlaceholder: 'ဥပမာ Rice, Drinks, Desserts',
      },
      dashboard: {
        title: 'ဒက်ရှ်ဘုတ်',
        newOrdersNeedAction: 'အော်ဒါအသစ် {{count}} ခုကို အရေးယူရန်လိုသည်',
        storeClosed: 'ပိတ်',
        storeOpen: 'ဖွင့်',
        busy: 'အော်ဒါများ',
        notBusy: 'မအားသေး',
        soundOn: 'အသံဖွင့်',
        soundOff: 'အသံပိတ်',
        logOut: 'ထွက်မည်',
        logoutConfirmMessage: 'ဒက်ရှ်ဘုတ်သို့ ပြန်ဝင်ရောက်ရန် ထပ်မံ ဝင်ရောက်ရပါမည်။',
        storeClosedConfirmMessage: 'ဆိုင်ပိတ်လိုက်ပါက အော်ဒါအသစ်များ ချက်ချင်းရပ်တန့်သွားမည်။',
        storeOpenConfirmMessage: 'ဆိုင်ဖွင့်လိုက်ပါက ဖောက်သည်များ အော်ဒါပြန်တင်နိုင်မည်။',
        tapToEnableSound: 'အသံဖွင့်ရန် နှိပ်ပါ',
        enableSoundTitle: 'သတိပေးအသံ ဖွင့်မည်',
        enableSoundMessage: 'Browser မှ အသံကို ပိတ်ထားသည်။ Enable နှိပ်၍ ဖွင့်ပါ။',
        enableSound: 'ဖွင့်မည်',
        ordersTab: 'အော်ဒါများ',
        menuTab: 'မီနူး',
        settingsTab: 'ဆက်တင်',
        newOrdersWaiting: 'အော်ဒါအသစ် {{count}} ခု စောင့်နေသည်',
        acceptOrCancel: 'အသိပေးချက်ကို ဖြုတ်ရန် အော်ဒါတိုင်းကို လက်ခံ သို့မဟုတ် ပယ်ဖျက်ပါ။',
        viewOrders: 'အော်ဒါများ ကြည့်မည်',
        notifications: 'အသိပေးချက်များ: {{status}}',
        enableBrowserNotifications: 'အော်ဒါအသစ်များအတွက် browser အသိပေးချက် ဖွင့်ပါ။',
        enableNotifications: 'အသိပေးချက် ဖွင့်မည်',
        notificationStatus: {
          idle: 'မစတင်ရသေး',
          requesting: 'ခွင့်ပြုချက် တောင်းနေသည်',
          failed: 'မအောင်မြင်ပါ',
          success: 'အောင်မြင်ပါပြီ',
        },
      },
      menuItemForm: {
        editTitle: 'မီနူးကို ပြင်မည်',
        addTitle: 'မီနူးအသစ် ထည့်မည်',
        photo: 'ဓာတ်ပုံ',
        photoTooLarge: 'ဓာတ်ပုံဖိုင်သည် 10MB အောက်ဖြစ်ရပါမည်။',
        choosePhoto: 'ဓာတ်ပုံ ရွေးမည်',
        itemName: 'မီနူးအမည်',
        itemNamePlaceholder: 'ဥပမာ Fried Rice',
        description: 'ဖော်ပြချက်',
        descriptionPlaceholder: 'ဥပမာ ပုစွန်နှင့် ကြက်ဥပါသော ထမင်းကြော်',
        category: 'အမျိုးအစား',
        noCategory: 'အမျိုးအစားမရှိ',
        price: 'စျေးနှုန်း',
        photoUploadFailed: 'ဓာတ်ပုံတင်မရပါ: {{message}}',
        saveFailed: 'သိမ်းမရပါ: {{message}}',
        uploadingPhoto: 'ဓာတ်ပုံ တင်နေသည်...',
        modifierGroups: 'ရွေးချယ်မှုများ နှင့် ဖြည့်စွက်မှုများ',
        addRequiredChoice: '+ မဖြစ်မနေ ရွေးချယ်မှု ထည့်မည်',
        addOptionalExtras: '+ ဖြည့်စွက်မှု ထည့်မည်',
        requiredChoiceBadge: 'မဖြစ်မနေ ရွေးချယ်ရမည်',
        optionalExtrasBadge: 'ရွေးချယ်နိုင်သည်',
        requiredChoiceHint: 'တစ်ခုကို မဖြစ်မနေ ရွေးချယ်ရမည်',
        optionalExtrasHint: 'မည်သည့်အရာကိုမဆို ထည့်နိုင်သည် (စျေးနှုန်း ထည့်ရန် မဖြစ်မနေ မလို)',
        groupNamePlaceholderRequired: 'ဥပမာ မည်သည့်အမျိုးအစား?',
        groupNamePlaceholderExtras: 'ဥပမာ ဖြည့်စွက်မှုများ',
        optionNamePlaceholder: 'ဥပမာ ကြက်ကြော်',
        extraPricePlaceholder: 'စျေးနှုန်း',
        addOption: '+ ရွေးချယ်မှု ထည့်မည်',
        noOptionsYet: 'ရွေးချယ်မှုများ မရှိသေးပါ။',
      },
      orderCard: {
        chatOnLine: 'LINE ဖြင့် စကားပြောမည် ({{lineId}})',
        noSlipYet: 'စလစ် မရှိသေးပါ',
        slipReceived: 'စလစ် လက်ခံရရှိပြီး',
        removePhoto: 'ဓာတ်ပုံ ဖယ်မည်',
        uploadPhoto: 'ဓာတ်ပုံ တင်မည်',
        uploadFailed: 'တင်မရပါ: {{message}}',
        statusUpdated: 'အခြေအနေ ပြောင်းပြီးပါပြီ။',
        startPreparing: 'စတင် ပြင်ဆင်မည်',
        starting: 'စတင်နေသည်...',
        accept: 'လက်ခံမည်',
        processing: 'လုပ်ဆောင်နေသည်...',
        cancelOrder: 'အော်ဒါ ပယ်မည်',
        selectCancellationReason: 'ပယ်ဖျက်ရသည့် အကြောင်းရင်းကို ရွေးပါ:',
        otherReasonPlaceholder: 'အကြောင်းရင်း ထည့်ပါ...',
        confirmCancel: 'ပယ်ဖျက်မည်',
        cancelling: 'ပယ်ဖျက်နေသည်...',
        updateStatus: 'အခြေအနေ ပြောင်းမည်:',
        updating: 'ပြောင်းနေသည်...',
        reasonLabel: 'အကြောင်းပြချက်: {{reason}}',
        reasonOptions: {
          outOfStock: 'ကုန်သွားသည်',
          restaurantClosed: 'ဆိုင်ပိတ်ထားသည်',
          outOfDeliveryArea: 'ပို့ဆောင်နယ်ပယ် ပြင်ပ',
          other: 'အခြား',
        },
      },
      status: {
        filter: {
          all: 'အားလုံး',
          new: 'အသစ်',
          unpaid: 'ငွေမချေရသေး',
          preparing: 'ပြင်ဆင်နေသည်',
          ready: 'အဆင်သင့်',
          delivered: 'ပို့ပြီး',
          cancelled: 'ပယ်ဖျက်ထားသည်',
        },
        card: {
          new: 'အော်ဒါအသစ်',
          unpaid: 'ငွေမချေရသေး',
          preparing: 'ပြင်ဆင်နေသည်',
          ready: 'အဆင်သင့်',
          delivered: 'ပို့ပြီး',
          cancelled: 'ပယ်ဖျက်ထားသည်',
        },
        progress: {
          unpaid: 'ငွေမချေရသေး',
          preparing: 'ပြင်ဆင်နေသည်',
          ready: 'အဆင်သင့်',
          delivered: 'ပို့ပြီး',
        },
      },
    },
  },
};

const LanguageContext = createContext(null);

const getStoredLanguage = (scope) => {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEYS[scope]);
  return SUPPORTED_LANGUAGES.has(stored) ? stored : DEFAULT_LANGUAGE;
};

const setStoredLanguage = (scope, language) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LANGUAGE_STORAGE_KEYS[scope], language);
};

const lookupTranslation = (language, key) => {
  const parts = key.split('.');
  let value = translations[language];

  for (const part of parts) {
    value = value?.[part];
  }

  if (typeof value === 'string') return value;

  value = translations.en;
  for (const part of parts) {
    value = value?.[part];
  }

  return typeof value === 'string' ? value : key;
};

const interpolate = (template, values = {}) => (
  template.replace(/\{\{(.*?)\}\}/g, (_, key) => {
    const trimmed = key.trim();
    return values[trimmed] == null ? '' : String(values[trimmed]);
  })
);

export const getLanguageLocale = (language) => (
  language === 'my' ? 'my-MM' : 'en-US'
);

export const LanguageProvider = ({ children }) => {
  const [customerLanguage, setCustomerLanguageState] = useState(() => getStoredLanguage('customer'));
  const [adminLanguage, setAdminLanguageState] = useState(() => getStoredLanguage('admin'));

  const setCustomerLanguage = (language) => {
    if (!SUPPORTED_LANGUAGES.has(language)) return;
    setCustomerLanguageState(language);
    setStoredLanguage('customer', language);
  };

  const setAdminLanguage = (language) => {
    if (!SUPPORTED_LANGUAGES.has(language)) return;
    setAdminLanguageState(language);
    setStoredLanguage('admin', language);
  };

  const value = useMemo(() => ({
    customerLanguage,
    adminLanguage,
    setCustomerLanguage,
    setAdminLanguage,
  }), [customerLanguage, adminLanguage]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

const useScopedLanguage = (scope) => {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error('useScopedLanguage must be used within LanguageProvider');
  }

  const language = scope === 'admin' ? context.adminLanguage : context.customerLanguage;
  const setLanguage = scope === 'admin' ? context.setAdminLanguage : context.setCustomerLanguage;
  const locale = getLanguageLocale(language);

  const t = useMemo(() => (
    (key, values) => interpolate(lookupTranslation(language, key), values)
  ), [language]);

  return { language, setLanguage, locale, t };
};

export const useCustomerLanguage = () => useScopedLanguage('customer');
export const useAdminLanguage = () => useScopedLanguage('admin');
