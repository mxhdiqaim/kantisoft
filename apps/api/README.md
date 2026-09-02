# Kantisoft API

A modern Point of Sale (POS) backend for stores and restaurants. This API serves as the core backend service for the Kantisoft monorepo ecosystem. It is a high-performance REST API built with Express.js (v5) and optimized to run on the [Bun](https://bun.sh/) runtime.

## About

A modern, multi-tenant RESTful API for store (restaurant) Point-of-Sale (POS) systems.
Supports seamless onboarding, store and branch management, user roles, menu items/products, orders, and robust activity logging.

---

## 🚀 Tech Stack

- **Runtime & Execution**: Bun (with live reloading)
- **Framework**: Express.js (v5)
- **Database & ORM**: PostgreSQL, Drizzle ORM
- **Caching & Sessions**: Redis (`ioredis`), `express-session`, `connect-pg-simple`
- **Authentication & Security**: Passport, JWT (`jsonwebtoken`), Bcrypt, Express Rate Limit
- **Monitoring & Error Tracking**: Sentry (`@sentry/bun`)

---

## Features

- **Multi-Tenancy:** Each store is isolated with its own users, menu, and orders.
- **Role-Based Access:** Manager, Admin, User, and Guest roles with fine-grained permissions.
- **Self-Service Onboarding:** Anyone can register, create a store, and start managing their business.
- **Branch Support:** Stores can have branches (child stores) linked to a parent.
- **Menu/Products Management:** CRUD for menu items, with per-store isolation.
- **Order Management:** Create, update, and track orders with payment and status.
- **Activity Logging:** All critical actions are logged for auditing and dashboarding.
- **Rate Limiting:** Protects the API from abuse and accidental overload.
- **Secure Authentication:** JWT-based authentication with password hashing.

---

## Getting Started

### Prerequisites
Make sure dependencies are installed from the root of the monorepo:
```bash
bun install
```

### Environment Variables
Create a `.env` file from `.env.example` in this directory. 
```bash
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=secret
DB_NAME=kantisoft

NODE_ENV=development
PORT=3000
JWT_SECRET=supersecret
SESSION_SECRET=supersecret
```

### Development
To start the API in development mode (with hot reloading enabled via Bun), run this command from the monorepo root:
```bash
bun run dev
```

Alternatively, from within `apps/api`:
```bash
bun run dev
```

### Database Operations
From the `apps/api` directory, you can run:

```bash
bun run generate # Generate migrations
bun run migrate  # Run migrations
bun run seed     # (Optional) Seed the database
```

### Building
To compile TypeScript paths for production, run from the monorepo root:
```bash
bun run build
```

---

## API Overview

### Authentication
- `POST /api/register` — Register a new manager and store
- `POST /api/login` — Login and receive a JWT
- `POST /api/logout` — Logout (JWT required)

### Users
- `GET /users` — List users (Manager/Admin)
- `POST /users/create` — Create user (Manager/Admin)
- `PATCH /users/:id` — Update user
- `DELETE /users/:id` — Delete user (soft delete)
- `PATCH /users/update-password` — Change password

### Stores
- `GET /stores` — List stores/branches
- `POST /stores` — Create branch
- `PATCH /stores/:id` — Update store
- `DELETE /stores/:id` — Delete store

### Menu Items/Products
- `GET /menu-items` — List menu items
- `POST /menu-items/create` — Add menu item
- `PATCH /menu-items/:id` — Update menu item
- `DELETE /menu-items/:id` — Delete menu item

### Orders
- `GET /orders` — List orders
- `POST /orders/create` — Create order
- `PATCH /orders/:id` — Update order status
- `DELETE /orders/:id` — Delete order

### Activity Log
- `GET /activities` — View activity log (Manager: all, Admin: non-manager actions)

---

## Development Notes

- **Rate Limiting:** Configured globally to prevent abuse (see `src/server.ts`).
- **Activity Logging:** All critical actions are logged automatically (see `src/service/activity-logger.ts`).
- **Multi-Tenancy:** All queries are scoped by `storeId` for data isolation.