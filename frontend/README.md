# Frontend

The frontend is a Next.js App Router application that delivers the customer storefront and the admin UI. It integrates Google OAuth, email OTP login, and a bilingual catalog experience.

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [User Journeys](#user-journeys)
3. [Application Architecture](#application-architecture)
4. [Route Map](#route-map)
5. [Component and Feature Organization](#component-and-feature-organization)
6. [State and Data Strategy](#state-and-data-strategy)
7. [API Client Design](#api-client-design)
8. [Authentication UX Behavior](#authentication-ux-behavior)
9. [Caching and Deduplication](#caching-and-deduplication)
10. [Styling and UI System](#styling-and-ui-system)
11. [Project Layout](#project-layout)
12. [Environment Configuration](#environment-configuration)
13. [Developer Workflow](#developer-workflow)
14. [Testing Strategy](#testing-strategy)
15. [Build and Deployment Guidance](#build-and-deployment-guidance)
16. [Route and Sub Route Screenshots](#route-and-sub-route-screenshots)
17. [Troubleshooting](#troubleshooting)

## Executive Summary

* Next.js App Router storefront and admin console
* Google OAuth and email OTP login with profile completion
* Bilingual catalog and language switching
* SEO metadata, structured data, and dynamic sitemap

## User Journeys

Public visitor journey

1. Land on the home page
2. Browse categories and featured products
3. Search for products
4. View product detail and variants
5. Add items to cart and proceed to checkout

Admin journey

1. Authenticate in the login page
2. Enter the dashboard
3. Operate product, category, and pricing modules
4. Review orders, reports, and notifications
5. Maintain birthday offers and voice dictionary

## Application Architecture

```mermaid
flowchart TB
  U[User browser] ==> R[App routes]
  R ==> P[Page components]
  P ==> C[Feature components]
  P ==> S[API service layer]
  S ==> B[Backend API]
```

## Route Map

Core storefront

* / for home and category navigation
* /products for full catalog
* /products/\[id] for product detail and variants
* /category/\[category] for parent category view
* /category/\[category]/\[subcategory] for subcategory view
* /categories/\[id] for legacy category detail

Discovery and marketing

* /featured for curated highlights
* /hot-deals for discounted products
* /new-arrivals for new catalog entries
* /recently-updated for restocked and updated items
* /search for keyword search and suggestions

Account and checkout

* /login for Google OAuth and email OTP
* /register redirects to login
* /checkout for cart review and order placement
* /orders and /orders/\[id] for order history and detail
* /profile and /profile/settings for account management
* /privacy and /terms for policy pages

Admin UI

* /admin/dashboard for analytics and operations
* /admin/billing for invoice review and printing
* /admin/birth-day for monthly birthday offer assignment
* /admin/voice-dictionary for Telugu voice dictionary management

Honeypot traps

* /admin, /backup, /config, /database, /shell.php, /wp-admin, /xmlrpc.php

## Component and Feature Organization

Main component groups

* Home sections for banners, highlights, and curated lists
* Category and product components for grids and detail views
* Cart and checkout components for order placement
* Admin components for dashboard widgets and tables
* Shared UI components for buttons, forms, dialogs, and skeletons

## State and Data Strategy

* Language provider stores selection and sets request headers
* Cart provider holds items, totals, and sync logic
* Promotions provider manages active deals and discounts
* Category provider supplies navigation data
* Dialog provider centralizes toasts and confirm flows

## API Client Design

* Centralized API client with base URL configuration
* Token attachment for authenticated calls
* 401 handling to clear session and redirect
* Request signing for cache revalidation

## Authentication UX Behavior

* Google OAuth is the primary login method
* Email OTP is supported for customers
* Admin login uses password and OTP
* Profile completion is enforced for display name, date of birth, and phone
* Account merge flow resolves phone and email conflicts

## Caching and Deduplication

* Lazy loaded homepage sections to reduce initial payload
* Pagination for catalog and search
* Image proxy caching for external assets
* Backend cache reduces repeat API calls for list screens

## Styling and UI System

* Tailwind CSS with utility first styling
* Responsive layout shell with navigation and footer
* Skeleton states for loading heavy sections
* Consistent spacing and typography scale

## Project Layout

```
frontend/
  app/
  components/
  context/
  lib/
  public/
  services/
  package.json
```

## Environment Configuration

* NEXT\_PUBLIC\_API\_URL: backend API base URL
* NEXT\_PUBLIC\_SITE\_URL: public site URL
* NEXT\_PUBLIC\_GOOGLE\_CLIENT\_ID: Google OAuth client id
* SERPAPI\_KEY: image search API key
* SERPAPI\_KEY\_2: optional image search key
* SERPAPI\_KEY\_3: optional image search key
* REVALIDATION\_SECRET: HMAC secret for revalidate requests

## Developer Workflow

1. cd frontend
2. npm install
3. npm run dev

Screenshot automation

1. npm run screenshots:auth
2. Log in with Google OAuth in the opened browser
3. Press Enter in the terminal to save the session
4. npm run screenshots

Using the local Edge profile

1. Close Edge before capturing
2. Set SCREENSHOT\_USER\_DATA\_DIR to the Edge profile path from edge://version
3. npm run screenshots

## Testing Strategy

* Manual validation for critical storefront and admin flows
* Screenshot capture for visual regression review

## Build and Deployment Guidance

* Set environment variables for the target environment
* Build with npm run build
* Start with npm run start
* Verify pages, auth flows, and API calls

## Route and Sub Route Screenshots

Public and account routes

* Home: ![Home](../docs/images/screenshots/home.png)
* Products: ![Products](../docs/images/screenshots/products.png)
* Product detail: ![Product detail](../docs/images/screenshots/product-detail.png)
* Category: ![Category](../docs/images/screenshots/category-parent.png)
* Subcategory: ![Subcategory](../docs/images/screenshots/category-subcategory.png)
* Search: ![Search](../docs/images/screenshots/search.png)
* Login: ![Login](../docs/images/screenshots/login.png)
* Checkout: ![Checkout](../docs/images/screenshots/checkout.png)
* Orders: ![Orders](../docs/images/screenshots/orders.png)

Admin routes and sections

* Dashboard: ![Admin dashboard](../docs/images/screenshots/admin-dashboard.png)
* Products tab: ![Admin products tab](../docs/images/screenshots/admin-dashboard-products.png)
* Categories tab: ![Admin categories tab](../docs/images/screenshots/admin-dashboard-categories.png)
* Orders tab: ![Admin orders tab](../docs/images/screenshots/admin-dashboard-orders.png)
* Pricing tab: ![Admin pricing tab](../docs/images/screenshots/admin-dashboard-pricing.png)
* Promotions tab: ![Admin promotions tab](../docs/images/screenshots/admin-dashboard-promotions.png)
* Users tab: ![Admin users tab](../docs/images/screenshots/admin-dashboard-users.png)
* Settings tab: ![Admin settings tab](../docs/images/screenshots/admin-dashboard-settings.png)
* Billing: ![Admin billing](../docs/images/screenshots/admin-billing.png)
* Birth day: ![Admin birth day](../docs/images/screenshots/admin-birth-day.png)
* Voice dictionary: ![Admin voice dictionary](../docs/images/screenshots/admin-voice-dictionary.png)

## Troubleshooting

* Login redirects on protected routes: confirm auth session and tokens are present
* Images not loading: check NEXT\_PUBLIC\_API\_URL and /api/img proxy
* Search empty state: verify catalog data exists in the backend
* Revalidate errors: ensure REVALIDATION\_SECRET matches backend

