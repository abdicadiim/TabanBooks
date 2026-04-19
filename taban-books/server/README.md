# Taban Books Backend Server

Complete backend structure for Taban Books accounting system.

## Project Structure

```
server/
├── config/              # Configuration files
│   ├── database.js      # MongoDB connection
│   ├── env.js           # Environment variables
│   ├── roles.js         # System roles
│   └── permissions.js   # Permission definitions
│
├── models/              # Mongoose models
│   ├── User.js
│   ├── Organization.js
│   ├── Customer.js
│   ├── Vendor.js
│   ├── Item.js
│   └── ... (all models)
│
├── controllers/         # Business logic controllers
│   ├── auth.controller.js
│   ├── sales.controller.js
│   ├── purchases.controller.js
│   └── ... (all controllers)
│
├── routes/              # API routes
│   ├── auth.routes.js
│   ├── sales.routes.js
│   └── ... (all routes)
│
├── middleware/          # Express middleware
│   ├── auth.middleware.js
│   ├── role.middleware.js
│   ├── validation.middleware.js
│   ├── error.middleware.js
│   └── audit.middleware.js
│
├── services/            # Business logic services
│   └── ... (services)
│
├── utils/               # Utility functions
│   ├── numberSeries.js
│   └── dateUtils.js
│
├── jobs/                # Scheduled jobs
│   └── ... (jobs)
│
├── app.js               # Express app setup
├── server.js            # Entry point
├── package.json
└── .env                 # Environment variables
```

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Update `.env` with your configuration:
- MongoDB connection string
- JWT secret
- Other settings

## Running

Development:
```bash
npm run dev
```

Production:
```bash
npm start
```

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user (protected)

## Database

MongoDB is required. Default connection: `mongodb://127.0.0.1:27017/taban_books`

## Notes

- All routes (except auth) require authentication
- Use JWT token in Authorization header: `Bearer <token>`
- Organization-based multi-tenancy is built-in


