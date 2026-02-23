# Frontend API Services

This directory contains service modules for interacting with the backend API.

## Available Services

### `authService.js`

Authentication and authorization

- `sendOTP(phone, purpose)` - Send OTP to phone number
- `verifyOTP(phone, otp)` - Verify OTP and login
- `register(userData)` - Register new user
- `logout()` - Logout user
- `getCurrentUser()` - Get current user from localStorage
- `isAuthenticated()` - Check if user is logged in

### `categoryService.js`

Category management

- `getAll(params)` - Get all active categories
- `getById(id)` - Get category by ID
- `getProducts(id, params)` - Get products in a category

### `productService.js`

Product management

- `getAll(params)` - Get all products
- `getById(id)` - Get product by ID
- `search(query, params)` - Search products
- `getFeatured(params)` - Get featured products
- `getByCategory(categoryId, params)` - Get products by category

### `cartService.js`

Shopping cart management

- `get()` - Get user's cart
- `addItem(productId, quantity)` - Add item to cart
- `updateItem(productId, quantity)` - Update item quantity
- `removeItem(productId)` - Remove item from cart
- `clear()` - Clear entire cart
- `syncPrices()` - Update cart prices to current product prices

## Usage Example

```javascript
import categoryService from "@/services/categoryService";
import productService from "@/services/productService";

// Fetch categories
const categories = await categoryService.getAll();

// Search products
const products = await productService.search("rice", { page: 1, limit: 20 });

// Add to cart
await cartService.addItem(productId, 2);
```

## Authentication

All services automatically:

- Add authentication token from localStorage
- Add language preference header
- Handle errors and return formatted responses

## Environment Variables

Make sure to set `NEXT_PUBLIC_API_URL` in `.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:5001/api/v1
```
