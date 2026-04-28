# Taban Books System Documentation

Taban Books is a multi-module accounting and business management system with a React frontend, an Express and MongoDB backend, and a custom offline-first sync layer. The repository is organized as a split application:

- `frontend/` contains the user interface, routing, local persistence, and client-side sync.
- `server/` contains the API, database models, business rules, scheduled jobs, and reporting logic.

This document explains the system at a high level and then breaks it down by architecture, domain, runtime behavior, and setup.

## What The System Does

The application supports the core workflows expected in a business accounting suite:

- Sales and receivables
- Purchases and payables
- Inventory and item management
- Banking and reconciliation
- Accounting and journals
- Projects and time tracking
- Reports and dashboards
- Organization settings, automation, and customization

It also includes:

- Authentication and OTP verification
- Role-based authorization
- Multi-organization tenancy
- Email sending and template management
- Background jobs for reminders and recurring invoices
- Offline caching and sync for selected data

## Architecture

### Frontend

The frontend is a Vite + React 18 application using:

- `react-router-dom` for routing
- `@tanstack/react-query` for data orchestration
- `dexie` and IndexedDB for local persistence
- `react-hot-toast` and `react-toastify` for notifications
- Tailwind CSS for styling
- `xlsx`, `jspdf`, and `html2canvas` for export and document generation

Main frontend entry points:

- [`frontend/src/main.tsx`](frontend/src/main.tsx)
- [`frontend/src/App.tsx`](frontend/src/App.tsx)
- [`frontend/src/routes/AppRoutes.tsx`](frontend/src/routes/AppRoutes.tsx)
- [`frontend/src/services/api.ts`](frontend/src/services/api.ts)
- [`frontend/src/services/auth.tsx`](frontend/src/services/auth.tsx)
- [`frontend/src/sync/SyncEngine.ts`](frontend/src/sync/SyncEngine.ts)

### Backend

The backend is an Express API written in TypeScript and compiled to `dist/`. It uses:

- `mongoose` for MongoDB models
- `jsonwebtoken` for auth tokens
- `bcryptjs` for password hashing
- `joi` for validation
- `multer` for uploads
- `nodemailer` for email delivery

Main backend entry points:

- [`server/server.ts`](server/server.ts)
- [`server/app.ts`](server/app.ts)
- [`server/routes`](server/routes)
- [`server/controllers`](server/controllers)
- [`server/models`](server/models)
- [`server/utils`](server/utils)

### Data Storage

The system uses multiple storage layers:

- MongoDB as the source of truth for server data
- IndexedDB for local offline persistence
- LocalStorage for auth state, bootstrap cache, and selected client caches

### Sync Model

The frontend uses a stale-while-revalidate pattern:

1. Load cached data immediately from local storage or IndexedDB.
2. Revalidate in the background with conditional requests.
3. Keep cached data if the server returns `304 Not Modified`.
4. Patch and persist if the server returns updated payloads.

That behavior is documented in:

- [`frontend/src/sync/SYNC_ENGINE.md`](frontend/src/sync/SYNC_ENGINE.md)

## Core Business Domains

### 1. Sales

The sales area covers:

- Customers
- Quotes
- Invoices
- Recurring invoices
- Retainer invoices
- Sales receipts
- Credit notes
- Debit notes
- Sales orders
- Customer payments

Common actions include:

- Create, edit, delete, and export records
- Send email notifications and reminders
- Import and bulk update records
- View detailed transaction timelines
- Generate PDFs and print views

### 2. Purchases

The purchases area covers:

- Vendors
- Bills
- Recurring bills
- Expenses
- Purchase orders
- Payments made
- Vendor credits
- Purchase receipts and document intake

Typical workflows include:

- Record vendor-related transactions
- Match payments and credits
- Export and import transaction data
- Attach uploaded documents and receipts

### 3. Inventory And Items

The inventory module supports:

- Items and product records
- Inventory adjustments
- Bulk import and export
- Custom views and filters
- Stock-related business logic

### 4. Banking

The banking module supports:

- Bank account creation and management
- Statement import
- Reconciliation workflows
- Cash in hand and account dashboards
- Money-in and money-out overlays for transaction entry

### 5. Accounting

The accounting area includes:

- Chart of accounts
- Manual journals
- Budgets
- Currency adjustments
- Transaction locking
- Journal templates
- Journal import and bulk tools

### 6. Projects And Time Tracking

The time tracking area includes:

- Projects
- Time entries
- Weekly logs
- Customer approval flows
- Import tools for projects and timesheets

### 7. Reports And Dashboard

The reporting layer includes:

- Dashboard summary cards
- Financial and operational reports
- Report builder and detail pages
- Report scheduling and sharing support in the backend

### 8. Settings And Automation

Settings are broad and cover both organization-wide and module-specific configuration:

- Profile and branding
- Users and roles
- Custom fields
- Custom modules
- Taxes and VAT
- Currencies and exchange rates
- Opening balances
- Reminders and automated follow-ups
- Email templates and sender setup
- Custom domains and portals
- Web tabs and workflow automation
- Transaction number series

## Authentication And Authorization

Authentication is token-based:

- Users sign up or log in through the frontend auth screens.
- The backend issues a JWT token.
- The token is stored in browser local storage.
- Protected requests include `Authorization: Bearer <token>`.

The frontend has support for:

- Login
- Signup
- Invitation acceptance
- Identity verification
- Session bootstrap and local auth mode

Authorization is role-based and permission-driven:

- Module access is checked at the route level.
- Permission guards block pages the user cannot access.
- The root route resolves to the first module the user can use.

## Backend Runtime Behavior

When the backend starts:

1. Environment variables are loaded.
2. MongoDB connection is established.
3. Database indexes are fixed or created.
4. Background jobs are scheduled.
5. Express begins listening on the configured port.

Background jobs currently include:

- Payment reminders
- Recurring invoice processing

## Frontend Runtime Behavior

When the frontend starts:

1. The app bootstraps session data.
2. Organization branding is applied to the document title and favicon.
3. Warmup queries prime key caches.
4. The router renders protected or public pages depending on auth state.

The main shell uses:

- Header and sidebar navigation
- Role-aware routing
- Embedded mode support for selected routes

## API Surface

The backend exposes grouped routes under `/api`, including:

- Authentication
- Organizations
- Settings
- Contacts
- Sales
- Purchases
- Inventory
- Banking
- Accountant
- Projects
- Reports
- Documents
- Users
- Roles
- Recurring bills and expenses
- Payment terms
- Accounts receivable
- Dashboard
- Website

## Local Development

### Prerequisites

- Node.js
- MongoDB
- A configured `.env` file for the server

### Run The Backend

From `server/`:

```bash
npm install
npm run dev
```

### Run The Frontend

From `frontend/`:

```bash
npm install
npm run dev
```

### Build

- Backend: `npm run build` inside `server/`
- Frontend: `npm run build` inside `frontend/`

## Important Implementation Notes

- The frontend requests layer includes caching, inflight deduplication, and special handling for authentication failures.
- The backend serves uploads from a static `/uploads` path.
- Conditional GET support is used in the bootstrap and sync flows.
- Several screens support CSV, XLSX, PDF export and bulk operations.

## Documentation Map

- [`server/README.md`](server/README.md) for backend-focused documentation
- [`frontend/src/sync/SYNC_ENGINE.md`](frontend/src/sync/SYNC_ENGINE.md) for sync behavior
- [`server/STRUCTURE.md`](server/STRUCTURE.md) for backend structure notes

