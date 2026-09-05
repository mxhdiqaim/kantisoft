# Kantisoft API

A modern Point of Sale (POS) backend for stores and restaurants. This API serves as the core backend service for the Kantisoft monorepo ecosystem. It is a high-performance REST API built with Express.js and secured by Clerk.

## About

A modern, multi-tenant RESTful API for store (restaurant) Point-of-Sale (POS) systems.
Supports seamless onboarding, store and branch management, user roles, menu items/products, orders, and robust activity logging.

## Getting Started

### Prerequisites
Make sure dependencies are installed from the root of the monorepo:
```bash
bun install
```

### Environment Variables

Create a `.env` file from `.env.example` in this directory.

```bash
# Database Config
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=secret
DB_NAME=kantisoft

# App Config
NODE_ENV=development
PORT=3000

# Clerk Authentication
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

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

## 🔐 Testing Authentication in Postman

Kantisoft uses **Clerk** for identity and access management. Because Clerk relies on short-lived tokens and browser sessions, backend development requires generating a long-lived JWT to test protected routes in Postman.

### Step-by-Step Local Setup

**1. Create an Active Session**
Clerk requires an active browser session to generate a backend token.

* Open your Clerk Hosted Account Portal (Sign-in page) in your browser.
* Create a test account or log in.

**2. Get Your Clerk User ID**

* Go to the [Clerk Dashboard](https://www.google.com/search?q=https://dashboard.clerk.com).
* Navigate to **Users** and click on your test user.
* Copy the User ID (e.g., `user_2aB3...`).

**3. Generate the Token**
We have a dedicated script to fetch a long-lived token for your active session. From the `apps/api` directory, update the script with your `USER_ID` and run:

```bash
bun run get-token.ts

```

*Note: Ensure you have created a custom JWT template named `long-lived-token` in your Clerk dashboard first.*

**4. Configure Postman**

* Open Postman and go to your Kantisoft Environment settings.
* Create a variable called `clerk_token` and paste the generated JWT.
* At the Collection level, go to **Authorization** -> **Bearer Token** and set the token value to `{{clerk_token}}`.
* Set all individual requests to **Inherit auth from parent**.