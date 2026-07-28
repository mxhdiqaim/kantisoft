# Strict Modular Monolith Architecture

## 1. Architectural Philosophy

This backend runs as a single process but enforces strict microservice-style boundaries.

**Rules:**

1. **Strict Bounded Contexts:** A module can only write to its own tables. Cross-module database joins are forbidden.
2. **Soft Linking:** Modules reference data in other modules using standard string columns (e.g., `productId`, `sellerId`, `locationId`, `tenantId`).
3. **Multi-Tenant by Default:** Every applicable database row must carry a `tenantId`. Most operational rows (orders, stock) must also carry a `locationId`.
4. **Data Leaks are Fatal:** Every service query must explicitly filter by `tenantId` to prevent Cross-Tenant Data Leaks.


## 2. Multi-Tenant & Multi-Location

The hierarchy is: **Tenant (Business) -> Locations (Outlets) -> Users / Stock / Sales.**

* **Tenant Isolation:** A tenant is the root business entity. Data is logically isolated via a `tenantId` column on almost every table (Logical Sharding).
* **Location Scoping:** A tenant can have multiple locations (e.g., Lagos, Abuja). Inventory and POS sales happen *at a location*. Online sales happen *at a tenant level* and are routed to a location for fulfillment.
* **Request Lifecycle:** A global Express middleware (`tenantResolver`) intercepts every incoming request, extracts the `tenantId` and `locationId` from the headers, and injects them into the `req` object for the controllers to pass to the services.

## 3. The Bounded Modules

Based on a complete retail flow, the system is divided into five core modules.

### A. IAM (Identity & Access Management)

* **Responsibility:** Who are you, where do you work, and what can you do?
* **Core Principle:** Authentication (passwords/logins/resets) is handled **entirely by Clerk**. This backend module only handles *Authorization*.
* **Tables:**
* `tenants` (The businesses)
* `locations` (The physical outlets, soft linked to `tenants`)
* `users` (Synced via Clerk identity provider)
* `roles` (e.g., Admin, Cashier, Manager)
* `user_roles` (Many-to-many: Users can have multiple roles)
* `user_locations` (Which outlets a cashier is allowed to operate in)

### B. Catalog (Product Master Data)

* **Responsibility:** What do we sell? (Independent of how many we have).
* **Tables:** `products`, `categories`, `brands`.
* **Rules:** Scoped by `tenantId`. A business defines a "Coca-Cola 50cl" once in the Catalog, and that definition is shared across all their Locations.

### C. Inventory (Stock Management)

* **Responsibility:** How many do we have, and where are they?
* **Tables:** `stock_levels`, `stock_ledger` (audit trail of every unit moving in/out).
* **Rules:** Scoped by BOTH `tenantId` and `locationId`. "Coca-Cola 50cl" might have 50 units in Lagos and 10 units in Abuja.

### D. Sales (Checkout & Orders)

* **Responsibility:** Cart processing, payments, and receipt generation.
* **Tables:** `orders`, `order_line_items`.
* **Rules:** Dual-channel checkout.
* Stores `price_at_sale` locally so historical receipts don't change if the Catalog price changes.
* `sellerId` (Soft Link -> IAM)
* `locationId` (Soft Link -> IAM)
* `productId` (Soft Link -> Catalog)

### E. CRM (Customers)

* **Responsibility:** Tracking online shoppers and loyal in-store customers.
* **Tables:** `customers`, `customer_addresses`.
* **Rules:** E-commerce orders in the Sales module soft-link to the `customerId`.

## 4. Communication Patterns

Because database joins across modules are forbidden, modules communicate via two pathways:

### Pattern A: Synchronous Read

When a manager requests an Order Receipt, the `SalesService` handles the aggregation:

1. Fetches `order` and `order_line_items` (using `tenantId`).
2. Calls `IAMService.getUserName(sellerId)` to get the cashier's name.
3. Calls `CatalogService.getProductNames([productIds])`.
4. Merges the data in memory and returns the payload.

### Pattern B: Asynchronous Write via BullMQ/Redis (Event-Driven Architecture)

Used to decouple domain logic and speed up response times.

* **In-Store Checkout:** `SalesService` saves the order and publishes `"POS_OrderCompleted"`. The `InventoryService` listens and deducts the stock asynchronously. If the stock drops below zero, it triggers a `"CycleCountRequired"` event.
* **User Onboarding:** Clerk triggers a webhook -> IAM creates the user -> publishes `"TenantUserCreated"`.

### Pattern C: Synchronous Write (Saga Pattern)

Used for E-commerce where strict guarantees are required before saving an order.

* **Online Checkout:** `SalesService` synchronously calls `InventoryService.reserveStock(items, locationId)`. If successful, the order is created. If order creation fails, a `"CompensateStock"` event is fired to revert the inventory.

## 5. Codebase &  Practices

* **Drizzle Composition over Inheritance:** Database queries will utilise functional composition. Generic helpers (e.g., `getByIdOrError`, `getAllPaginated`) live in `src/shared/database/util.database.ts` and accept the Drizzle schema and context.
* **One-Way Drizzle Relationships:** To prevent circular dependency crashes at runtime, Drizzle relational queries will strictly use one-way mapping within their own bounded context.
* **Centralized Error Handling:** Instead of passing Express `res` objects into services, services will throw custom `AppError` subclasses (e.g., `NotFoundError`, `UnauthorizedError`). A global Express `errorHandler` middleware catches these and formats standard JSON responses.
* **Redis Real-Time Caching:** Online catalog queries will read from Redis hashes (`tenant:123:loc:456:product:789:stock`) rather than hitting Postgres, ensuring the mobile app feels instant without throttling the POS database.

## 6. Directory Structure

```text
src/
├── shared/                       # Cross-domain infrastructure
│   ├── database/                 # Drizzle client, migrations, generic query utils
│   ├── events/                   # BullMQ workers, queues, Redis client
│   ├── errors/                   # AppError, global error handler
│   └── middleware/               # tenantResolver, requireAuth, requireRole
│
├── modules/                      # The strict Bounded Contexts
│   ├── iam/
│   │   ├── iam.schema.ts         # Tenants, Locations, Users, Roles
│   │   ├── iam.service.ts
│   │   ├── iam.controller.ts
│   │   └── iam.events.ts
│   │
│   ├── catalog/
│   │   ├── catalog.schema.ts     # Products, Categories
│   │   └── ...
│   │
│   ├── inventory/
│   │   ├── inventory.schema.ts   # Stock Levels, Ledger
│   │   └── ...
│   │
│   ├── sales/
│   │   ├── sales.schema.ts       # Orders, Line Items
│   │   └── ...
│   │
│   └── crm/                      # Customers
│
└── server.ts                     # Express app setup, route registration

```