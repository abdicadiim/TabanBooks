# Taban Books Backend - Complete Structure

## 📁 Project Structure

```
server/
│
├── 📁 config/                          # Configuration Files
│   ├── database.js                      # MongoDB connection setup
│   ├── env.js                          # Environment variables loader
│   ├── roles.js                        # System roles (owner, admin, accountant...)
│   └── permissions.js                  # Permission definitions per module
│
├── 📁 models/                          # Mongoose Database Models (Schemas)
│   ├── User.js                         # User profile & authentication
│   ├── Organization.js                 # Company / tenant (multi-tenancy)
│   ├── Customer.js                     # Customers (sales)
│   ├── Vendor.js                       # Vendors (purchases)
│   ├── Item.js                         # Products / services
│   ├── InventoryAdjustment.js          # Inventory adjustments
│   ├── Invoice.js                      # Sales invoices
│   ├── Quote.js                        # Sales quotes
│   ├── CreditNote.js                   # Sales credit notes
│   ├── SalesReceipt.js                 # Sales receipts
│   ├── PaymentReceived.js              # Customer payments
│   ├── Bill.js                         # Purchase bills
│   ├── Expense.js                      # Expenses
│   ├── PurchaseOrder.js                # Purchase orders
│   ├── PaymentMade.js                  # Vendor payments
│   ├── VendorCredit.js                 # Vendor credits
│   ├── BankAccount.js                  # Bank accounts
│   ├── BankTransaction.js              # Bank transactions
│   ├── JournalEntry.js                 # Manual journal entries
│   ├── ChartOfAccount.js               # Chart of accounts
│   ├── Budget.js                       # Budgets
│   ├── Project.js                      # Projects
│   ├── TimeEntry.js                    # Time tracking entries
│   ├── Document.js                     # Documents & files
│   ├── Tax.js                          # Tax rates & rules
│   └── Currency.js                     # Currency settings & exchange rates
│
├── 📁 controllers/                     # Business Logic Controllers
│   ├── auth.controller.js              # Signup, login, logout
│   ├── sales.controller.js             # Invoices, quotes, payments received
│   ├── purchases.controller.js         # Bills, expenses, payments made
│   ├── inventory.controller.js         # Items & inventory adjustments
│   ├── banking.controller.js           # Bank accounts & transactions
│   ├── accountant.controller.js        # Journals, chart of accounts, budgets
│   ├── projects.controller.js          # Projects & time tracking
│   ├── reports.controller.js           # Financial & business reports
│   ├── documents.controller.js         # File & document handling
│   └── settings.controller.js          # Organization, users, taxes, currency
│
├── 📁 routes/                          # API Routes (Endpoints)
│   ├── auth.routes.js                  # Authentication routes
│   ├── sales.routes.js                 # Sales module routes
│   ├── purchases.routes.js             # Purchases module routes
│   ├── inventory.routes.js             # Inventory module routes
│   ├── banking.routes.js               # Banking module routes
│   ├── accountant.routes.js             # Accountant module routes
│   ├── projects.routes.js              # Projects module routes
│   ├── reports.routes.js               # Reports module routes
│   ├── documents.routes.js             # Documents module routes
│   └── settings.routes.js              # Settings module routes
│
├── 📁 middleware/                      # Express Middleware
│   ├── auth.middleware.js              # JWT authentication
│   ├── role.middleware.js              # Role & permission checks
│   ├── validation.middleware.js        # Request validation
│   ├── error.middleware.js             # Central error handler
│   └── audit.middleware.js             # Audit logs (who did what)
│
├── 📁 services/                        # Business Logic Services
│   ├── invoice.service.js              # Invoice business logic
│   ├── payment.service.js              # Payment processing logic
│   ├── inventory.service.js            # Stock calculations (to be created)
│   ├── reporting.service.js            # Reports logic (to be created)
│   ├── currency.service.js             # Exchange rates & conversions (to be created)
│   └── email.service.js                # Emails (invoices, reminders) (to be created)
│
├── 📁 jobs/                            # Scheduled Jobs
│   ├── recurringInvoices.job.js       # Scheduled invoices
│   ├── recurringBills.job.js          # Scheduled bills
│   └── reminders.job.js                # Email reminders
│
├── 📁 utils/                           # Utility Functions
│   ├── numberSeries.js                 # Invoice/bill numbering
│   ├── pdfGenerator.js                 # PDF creation (invoices, reports)
│   ├── currencyConverter.js            # Currency conversion helpers
│   └── dateUtils.js                    # Date helpers
│
├── app.js                              # Express app setup (routes, middleware)
├── server.js                           # Application entry point
├── package.json                        # Dependencies
├── .env.example                        # Environment variables template
├── .gitignore                          # Git ignore rules
├── README.md                           # Documentation
└── STRUCTURE.md                        # This file
```

## 🔗 How Everything Connects

### Request Flow

```
1. Client Request
   ↓
2. Express App (app.js)
   ↓
3. Route (routes/*.routes.js)
   ↓
4. Middleware (auth, role, validation)
   ↓
5. Controller (controllers/*.controller.js)
   ↓
6. Service (services/*.service.js) [Optional - business logic]
   ↓
7. Model (models/*.js)
   ↓
8. MongoDB Database
   ↓
9. Response back through chain
```

### Module Organization

Each feature module follows this pattern:

```
Module (e.g., Sales)
├── Model (Invoice.js, Quote.js, etc.)
├── Controller (sales.controller.js)
├── Route (sales.routes.js)
└── Service (invoice.service.js) [Optional]
```

## 🚀 Getting Started

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Setup Environment

```bash
cp .env.example .env
```

Edit `.env` with your configuration:
- MongoDB connection string
- JWT secret
- Other settings

### 3. Start MongoDB

Make sure MongoDB is running on `mongodb://127.0.0.1:27017`

### 4. Run Server

Development:
```bash
npm run dev
```

Production:
```bash
npm start
```

## 📊 Database Models Overview

### Core Models
- **User**: User accounts and authentication
- **Organization**: Multi-tenant organization/company

### Sales Models
- **Customer**: Customer information
- **Invoice**: Sales invoices
- **Quote**: Sales quotes
- **CreditNote**: Customer credit notes
- **SalesReceipt**: Sales receipts
- **PaymentReceived**: Customer payments

### Purchase Models
- **Vendor**: Vendor information
- **Bill**: Purchase bills
- **Expense**: Expenses
- **PurchaseOrder**: Purchase orders
- **PaymentMade**: Vendor payments
- **VendorCredit**: Vendor credits

### Inventory Models
- **Item**: Products/services
- **InventoryAdjustment**: Stock adjustments

### Banking Models
- **BankAccount**: Bank accounts
- **BankTransaction**: Bank transactions

### Accounting Models
- **JournalEntry**: Manual journal entries
- **ChartOfAccount**: Chart of accounts
- **Budget**: Budgets

### Project Models
- **Project**: Projects
- **TimeEntry**: Time tracking entries

### Other Models
- **Document**: Documents and files
- **Tax**: Tax rates
- **Currency**: Currency settings

## 🔐 Authentication & Authorization

### Authentication Flow
1. User signs up → Creates Organization + User
2. User logs in → Receives JWT token
3. Protected routes require `Authorization: Bearer <token>` header

### Role-Based Access Control
- **Roles**: owner, admin, accountant, manager, staff, staff_assigned, timesheet_staff, viewer
- **Permissions**: Defined per role per module (create, read, update, delete, approve, export, import, print)

## 📝 API Endpoints Structure

### Authentication
- `POST /api/auth/signup` - Register
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user (protected)
- `POST /api/auth/logout` - Logout

### Sales
- `GET /api/invoices` - List invoices
- `POST /api/invoices` - Create invoice
- `GET /api/invoices/:id` - Get invoice
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice
- Similar for quotes, payments-received, etc.

### Purchases
- Similar structure for bills, expenses, purchase-orders, etc.

### Inventory
- Similar structure for items, inventory-adjustments

### Other Modules
- Similar CRUD structure for all modules

## 🛠️ Next Steps

1. **Complete Controllers**: Expand placeholder controllers with full CRUD
2. **Add Services**: Implement business logic in services
3. **Add Validation**: Use validation middleware with Joi/Yup
4. **Add Tests**: Unit and integration tests
5. **Add Documentation**: API documentation with Swagger/OpenAPI
6. **Add File Upload**: Implement document upload handling
7. **Add Email Service**: Implement email sending
8. **Add Scheduled Jobs**: Set up cron jobs for recurring tasks
9. **Add Caching**: Redis for performance
10. **Add Logging**: Winston or similar for logging

## 📚 Notes

- All models include `organization` field for multi-tenancy
- All routes (except auth) require authentication
- Error handling is centralized in error middleware
- Audit logging is available for tracking user actions
- Structure is scalable and follows best practices


