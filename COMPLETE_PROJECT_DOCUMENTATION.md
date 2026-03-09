# EventFaceMatch - Complete Project Documentation

## 1. Project Overview
EventFaceMatch is a serverless web application designed for event photographers and agencies. It uses AI (AWS Rekognition) to index faces in event photos, allowing guests to find their photos instantly by uploading a selfie. The system includes a comprehensive invoicing and payment module tailored for the Romanian market.

## 2. Technology Stack

### Frontend
-   **Framework**: React (Vite)
-   **Language**: TypeScript
-   **Styling**: TailwindCSS + Vanilla CSS (Glassmorphism Design)
-   **State Management**: React Context API
-   **Routing**: React Router
-   **Payments**: Stripe Elements (@stripe/react-stripe-js)

### Backend (Serverless)
-   **Cloud Provider**: AWS
-   **Framework**: Serverless Framework v4
-   **Runtime**: Node.js 20
-   **Database**: AWS DynamoDB (Tables: Users, Events, Faces, Photos, Orders)
-   **Storage**: AWS S3 (Buckets for Photos and QR Codes)
-   **AI/ML**: AWS Rekognition (Face Indexing & Searching)
-   **Authentication**: Custom Token-based Auth (SHA-256 Hashing)
-   **Payments**: Stripe API

## 3. Key Features

### A. Core Features (Event & Face Match)
1.  **Event Creation**: Users can create events (e.g., Weddings, Parties).
2.  **Photo Upload**: Bulk upload photos to S3 via signed URLs.
3.  **Face Indexing**: Lambda triggers automatically index faces using AWS Rekognition.
4.  **Face Search**: Guests upload a selfie to find all photos they appear in.
5.  **QR Codes**: Unique QR codes for each event for easy guest access.

### B. Invoicing & Billing (Romanian Standards)
1.  **Company Profile**: Users store billing details (Company Name, CUI, Reg Com, Bank, IBAN).
2.  **Compliance**: Fields match Romanian invoicing requirements.

### C. Pricing & Payments
1.  **Stripe Integration**: Secure credit card processing using Stripe Payment Intents.
2.  **Pricing Packages**:
    *   **Starter (99 RON)**: 500 Photos, 1 Month Storage.
    *   **Professional (249 RON)**: 3,000 Photos, 6 Months Storage, Advanced AI.
3.  **Checkout Flow**: Package Selection -> Stripe Payment -> Order Confirmation.

### D. Admin Panel
1.  **Invoices View**: (`/admin/invoices`) Admins can view a list of all orders/payments.

## 4. Architecture & Database Schema

### DynamoDB Tables
*   **UsersTable**: `userId` (PK), `email` (GSI), `companyDetails`, `subscriptionStatus`.
*   **OrdersTable**: `orderId` (PK), `userId` (GSI), `amount`, `status`, `packageId`.
*   **EventsTable**: `eventId` (PK), `userId`, `totalPhotos`, `totalFaces`.
*   **FacesTable**: `faceId` (PK), `eventId`, `externalImageId`.
*   **PhotosTable**: `photoId` (PK), `eventId`, `s3Key`.

### AWS Lambda Functions
*   **Auth**: `authRegister`, `authLogin`, `authMe`, `authUpdateProfile`.
*   **Events**: `createEvent`, `getEvents`, `getEvent`.
*   **Photos**: `uploadPhoto`, `processPhoto` (S3 Trigger), `getEventPhotos`.
*   **Face Match**: `matchFace`, `getEventFaces`.
*   **Payment**: `createPaymentIntent` (Stripe), `createOrder`, `getOrders`.

## 5. Project Structure

```
d:/EventFaceMatch/
├── backend/
│   ├── functions/          # Lambda function logic
│   │   ├── auth/           # Login, Register, Profile
│   │   ├── payment/        # Stripe & Orders
│   │   └── ...             # Core Event/Photo logic
│   ├── src/utils/          # DynamoDB & Response helpers
│   ├── serverless.yml      # Infrastructure as Code (AWS config)
│   └── package.json        # Backend dependencies
├── frontend/
│   ├── src/
│   │   ├── api/            # Axios API clients
│   │   ├── components/     # Reusable UI components
│   │   ├── contexts/       # AuthProvider
│   │   ├── pages/          # React Pages (Dashboard, Pricing, Checkout)
│   │   └── types/          # TypeScript interfaces
│   └── package.json        # Frontend dependencies
└── COMPLETE_PROJECT_DOCUMENTATION.md (This file)
```

## 6. Setup & Deployment Guide

### Prerequisites
-   Node.js v20+
-   AWS CLI (configured with credentials)
-   Stripe Account (Test Keys)

### Local Development (Frontend)
```bash
cd frontend
npm install
npm run dev
# Running on http://localhost:5173
```

### Backend Deployment
```bash
cd backend
npm install
serverless deploy --stage dev
```

### Environment Variables
**Backend (`serverless.yml`):**
-   `STRIPE_SECRET_KEY`: Your Stripe Secret Key (sk_test_...)
-   `FRONTEND_URL`: URL of the frontend (for CORS)

**Frontend (`.env` or hardcoded):**
-   API Base URL: https://[api-id].execute-api.eu-central-1.amazonaws.com/dev
-   Stripe Publishable Key: pk_test_...

## 7. How to Test the Full Flow
1.  **Register**: Create an account at `/register`.
2.  **Buy Credits**: Go to Dashboard -> "Buy Credits".
3.  **Select Plan**: Choose "Starter" (99 RON) or "Professional" (249 RON).
4.  **Pay**: Enter test card details (4242 4242 4242 4242).
5.  **Profile**: Go to Profile and fill in "Billing Information".
6.  **Create Event**: (Requires Active Subscription - Logic implemented in Dashboard).
7.  **Admin**: View the transaction at `/admin/invoices`.

---
*Generated by Antigravity - Google Deepmind*
