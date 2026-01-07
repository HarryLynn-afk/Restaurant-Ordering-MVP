# Restaurant Ordering MVP

## Project Overview

This is a simple web application designed for small restaurants and home-based food sellers to replace manual LINE group chat ordering with an automated system. Customers can browse the daily menu, place orders as guests (no login required), upload payment slips, and track their order status in real-time. Restaurant staff can manage menus, view and update orders, and confirm payments through a secure dashboard.

## Features (MVP)

### Customer (Guest)  
- View daily menu with photos and prices  
- Add items to cart and place orders  
- Enter delivery address and contact information  
- Upload payment slip images (optional)  
- Track order status: Received, Preparing, Ready, Delivered  

### Restaurant Staff  
- Login via email and password  
- Manage daily menu: add, edit, delete items with photos  
- Mark items as sold out/unavailable  
- View incoming orders in real-time  
- Update order statuses  
- View and confirm payment slips  

## Tech Stack

- Frontend: [Next.js](https://nextjs.org/) (React)  
- Backend: [Node.js](https://nodejs.org/) with [Express](https://expressjs.com/)  
- Database & Storage: [Firebase Firestore](https://firebase.google.com/products/firestore) and [Firebase Storage](https://firebase.google.com/products/storage)  
- Authentication: Firebase Email/Password Authentication  

## Getting Started

### Prerequisites  
- Node.js installed (v14 or later recommended)  
- Firebase account and project setup  

### Installation

1. Clone the repository:  
   ```bash
   git clone https://github.com/yourusername/restaurant-ordering-mvp.git
   cd restaurant-ordering-mvp

	2.	Setup environment variables:
Create a .env.local file in the frontend folder with Firebase config:

NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id


	3.	Install dependencies for frontend and backend:

cd frontend
npm install

cd ../backend
npm install


	4.	Run frontend and backend locally:

# Frontend
cd frontend
npm run dev

# Backend
cd ../backend
node index.js



Project Structure
	•	/frontend — Next.js app for customer and restaurant interfaces
	•	/backend — Express API server for handling business logic and database operations

Roadmap
	•	Week 1: Project setup, wireframes, Firebase configuration
	•	Week 2: Customer menu, cart, and order form development
	•	Week 3: Backend API endpoints for menu and order management
	•	Week 4: Connect frontend and backend, order submission flow
	•	Week 5: Payment slip upload and storage
	•	Week 6: Restaurant dashboard with menu and order management
	•	Week 7: Testing, bug fixes, and deployment

License

This project is open source and available under the MIT License
