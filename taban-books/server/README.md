# Taban Books Backend Documentation

This backend powers the accounting, sales, purchasing, inventory, banking, and settings features used by the frontend application.

## What Lives Here

The backend is responsible for:

- Authentication and session bootstrap
- Authorization and permission enforcement
- CRUD APIs for all core business records
- Multi-organization data isolation
- Email delivery and reminder automation
- File uploads and document serving
- Background jobs for recurring work
- Reporting, dashboard, and aggregation logic

## Runtime Entry Points

- [`server.ts`](server.ts) starts the process, loads environment variables, connects to MongoDB, fixes indexes, and starts scheduled jobs.
- [`app.ts`](app.ts) configures Express middleware, CORS, JSON parsing, static uploads, route mounting, and error handling.

## Main Backend Modules

### Routes

The server exposes grouped route files for:

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
- Recurring expenses
- Recurring bills
- Payment terms
- Accounts receivable
- Dashboard
- Website

### Controllers

Controllers are split by domain and contain the business logic for:

- Auth and verification
- Sales documents and payments
- Purchases and vendor flows
- Inventory adjustments
- Banking and reconciliation
- Accounting and journals
- Projects and time tracking
- Reports and dashboards
- Settings, portals, templates, and automation

### Models

The model layer includes core entities such as:

- User and Organization
- Customer and Vendor
- Item and Unit
- Invoice, Quote, Credit Note, Debit Note, Sales Receipt, Sales Order, Retainer Invoice
- Bill, Expense, Purchase Order, Payment Made, Vendor Credit, Recurring Bill, Recurring Expense
- Bank Account, Bank Transaction, Bank Statement, Bank Rule, Bank Reconciliation
- Chart of Account, Journal Entry, Budget, Transaction Lock, Currency, Currency Adjustment
- Project, Time Entry, Approval Rule, Workflow Rule, Workflow Action, Workflow Log, Workflow Schedule
- Document, Report, Tag Assignment, Reminder, Sender Email, Web Tab

## Security Model

Authentication is JWT-based. The frontend sends the token in the `Authorization` header for protected calls.

Authorization is role and permission based:

- Roles define the general access profile.
- Permissions define module-level actions such as view, create, edit, delete, import, export, print, and approve.

The backend also supports account verification flows and invitation-based onboarding.

## Data And Storage

MongoDB is the primary database. The backend also manages:

- Uploads served through `/uploads`
- Versioned responses for bootstrap and sync-aware flows
- Scheduled database maintenance and index repair

## Scheduled Work

The server starts background jobs for:

- Sending reminders
- Processing recurring invoices
- Potentially recurring bills and related automation flows

These jobs are gated by environment variables so they can be enabled or disabled per deployment.

## Development

From `server/`:

```bash
npm install
npm run dev
```

Build and production startup:

```bash
npm run build
npm start
```

## Configuration

Key environment values expected by the backend include:

- `MONGO_URI`
- `PORT`
- `FRONTEND_URL`
- `NODE_ENV`
- Debug and background-job toggles

## API Notes

- `/api/health` returns a basic health payload.
- `/api/auth/*` covers signup, login, bootstrap, verification, OTP, and logout.
- Most application routes require authentication and an active organization context.

## Related Documentation

- [`../README.md`](../README.md) for the full system overview
- [`../docs/advanced-swr-sync.md`](../docs/advanced-swr-sync.md) for sync behavior
- [`STRUCTURE.md`](STRUCTURE.md) for a more detailed backend structure map


