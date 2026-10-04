ROOTFIN - README
================

Project Name: RootFin
Version: 1.0.0
Last Updated: April 29, 2025

DESCRIPTION
-----------
RootFin is a modern financial technology platform designed to simplify and empower personal and business finance management. The platform provides users with tools to manage expenses, track savings, access loans, and analyze financial health through intuitive dashboards and secure APIs.

FEATURES
--------
- User authentication and authorization
- Dashboard for income, expenses, and savings visualization
- Transaction history with filters and search
- They haven’t closed their store balance
- Cash / Bank Ledger


TECH STACK
----------
Frontend:
- React.js
- Tailwind CSS

Backend:
- Node.js
- Express.js
- MongoDB
- JWT for authentication

Other Integrations:
- Plaid API / Razorpay / Stripe (optional for financial services)
- Cron Jobs for daily summaries or reminders

SETUP INSTRUCTIONS
------------------
1. Clone the repository:
   git clone https://github.com/yourusername/rootfin.git

2. Navigate to the project directory:
   cd rootfin

3. Install dependencies:
   For backend:
   cd backend
   npm install

   For frontend:
   cd ../frontend
   npm install

4. Set environment variables:
   Create a `.env` file in both backend and frontend with the following:

   (Backend)
 JWT_SECRET=
 MONGODB_URI= 


   (Frontend)
   - VITE_API_URL=

5. Run the app:
   Backend:
   npm run dev

   Frontend:
   npm run dev

6. Visit:
   http://localhost:3000 (or configured port)

FOLDER STRUCTURE
----------------
/rootfin
  ├── /backend
  │     ├── controllers/
  │     ├── routes/
  │     ├── models/
  │     └── server.js
  ├── /frontend
  │     ├── components/
  │     ├── pages/
  │     └── main.jsx
  └── README.txt

  📁 API Endpoints
Method	    Endpoint	       Description
POST	    /signin	           Register a new user
POST     	/login	           Login existing user
POST    	/createPayment	   Add a new payment
GET	        /Getpayment	Get    list of all payments
POST     	/saveCashBank	   Save cash/bank closing data
GET      	/getsaveCashBank   Retrieve cash/bank closing info


🏗️ Tech Stack
Frontend: React.js

Backend: Node.js, Express.js

Database: MongoDB

Authentication: JWT & Bcrypt

API Testing: Postman or any REST client

📦 Company Data Integration
This software is capable of handling structured financial data from companies. Each company provides 5 rows of financial data, which are stored and processed through the above APIs.

📌 Setup Instructions
Clone the repository

Run npm install in both frontend and backend

Set up your environment variables (MongoDB URI, JWT secret, etc.)

Run backend: npm start

Run frontend: npm start

CONTACT
-------
Project Dev: Jishnu M
Email: mjishnu990@gmail.com
LinkedIn: https://www.linkedin.com/in/jishnu-m-11760b2b0/  
GitHub: https://github.com/jishnuMgit

LICENSE
-------
MIT License - Rootments.
