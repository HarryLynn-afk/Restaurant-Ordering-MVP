importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyD9zJ2dTVEof6QNCGBg-YZpGVXZi6aNu4o',
  authDomain: 'restaurant-ordering-app-1addc.firebaseapp.com',
  projectId: 'restaurant-ordering-app-1addc',
  storageBucket: 'restaurant-ordering-app-1addc.firebasestorage.app',
  messagingSenderId: '1091372846630',
  appId: '1:1091372846630:web:a2d80e165b6aedb713a0e7',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification;
  self.registration.showNotification(title, {
    body,
    icon: '/logo.png',
  });
});
