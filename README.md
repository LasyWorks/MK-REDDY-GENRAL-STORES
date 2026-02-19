# MK Kirana Stores

A production-ready e-commerce platform with a backend API (Node.js/Express) and a frontend (React).

---

## Project Structure

```
MK Kirrana Stores/
├── backend/                  # Node.js Express API
│   ├── src/                  # Source code
│   ├── tests/                # Unit & Integration tests
│   ├── uploads/              # Product images/Excel files
│   ├── logs/                 # Error and access logs
│   ├── .env                  # Environment variables
│   ├── package.json          # Backend dependencies
│   └── ...
├── frontend/                 # Frontend application (To be implemented)
└── package.json              # Root scripts for easy management
```

---

## Backend Features

- Authentication & Authorization
  - OTP-based login for customers
  - Email/Phone + Password login for admin
  - JWT with refresh token mechanism
  - Role-Based Access Control
- Product Management
  - CRUD operations with bilingual support (Telugu/English)
  - Category management
  - Stock management
- Order Management
  - Cart operations
  - Order placement and tracking
- Billing & Invoicing
  - GST calculation and Invoice generation
  - Idempotent payment processing

---

## Installation & Setup

### 1. Prerequisites
- Node.js (v18.x or higher)
- MySQL 8.x

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env     # Then edit .env with your DB credentials
npm run migrate          # Create database tables
npm run seed             # Seed sample data (Admin: talpaneni064@gmail.com / admin123)
```

### 3. Running the App
From the root directory:
```bash
npm run dev:backend      # Starts backend in development mode
```
Or from the backend directory:
```bash
cd backend
npm run dev
```

---

## API Documentation

### Base URL
`http://localhost:3000/api/v1`

### Authentication
- `POST /api/v1/auth/otp/send` - Send OTP to phone
- `POST /api/v1/auth/otp/verify` - Verify OTP
- `POST /api/v1/auth/admin/login` - Admin login with password
- `GET /api/v1/auth/me` - Get current user info

### Categories & Products
- `GET /api/v1/categories` - List categories (Bilingual)
- `GET /api/v1/products` - List products with filters
- `POST /api/v1/products` - Create product (Admin)

### Orders & Invoices
- `POST /api/v1/orders` - Place a new order
- `GET /api/v1/invoices/:id` - Get invoice details
- `PUT /api/v1/invoices/:id/paid` - Mark invoice as paid (Idempotent)

---

## Testing

### Automated Tests
```bash
cd backend
npm test
```

### Manual Idempotency Test
To verify the system is safe from duplicate payment clicks:
1. Call `PUT /api/v1/invoices/1/paid` (First time) -> Returns success.
2. Call `PUT /api/v1/invoices/1/paid` (Second time) -> Returns success (Idempotent), preventing errors.

---

## Language Support
Set `Accept-Language: te` for Telugu or `Accept-Language: en` for English in your request headers.
