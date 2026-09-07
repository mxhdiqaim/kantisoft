# Migrating to a Modular Monolith: Fixing a Messy Codebase

We are moving our API from a messy, unstructured codebase where naming conventions and directories were misaligned to a well-structured, class based, modular monolith.

Now, every controller, service, and validator is instantiated as a class. This gives us clean encapsulation, a predictable file structure, and precise lifecycle management (like graceful startup and shutdown), and it also unlocks inheritance. A service can now inherit from a `BaseService` that already holds necessary utility methods such as `get`, `getOrError`, `getById`, and `getAllPaginated` etc. This provides highly reusable utility methods across the entire application.

## Zero-DB Authentication (Authn & Authz)
We ripped out our in house, stateful session based auth using (Passport.js and express-session) and replaced it with stateless JWT authentication via Clerk.

The immediate benefit is scalability. Because requests are fully stateless, the server doesn't have to make a database query just to figure out who the user is. We took this a step further by publishing basic user info (`userId`, `role`, `businessId`, and `branchId`) directly into Clerk public metadata.

Now, our `AuthMiddleware` parses the token and instantly knows the user's identity, role, and tenant associations without a single database hit. At scale, a database query just to check a session adds massive overhead. If each request takes 10 milliseconds, 500,000 requests equate to huge amount of compute time wasted just validating who the user is. We stripped that out completely. Authentication happens entirely in memory, saving database compute and speeding up the application.

## Request Context
We also introduced a global `requestContext`. When `AuthMiddleware` decodes the JWT, it drops the user metadata (`userId`, `role`, `businessId`, and `branchId`) straight into the request context.

Any service or controller touched during that request lifecycle can pull the information directly. We no longer have to use `req.user` through every method signature. It also keeps the payload tiny as we are only passing the essential IDs in memory rather than the entire user object with profile pictures and other fields. If we need that extra data, we can fetch it using the IDs.

## BaseService & Automatic Tenant Scoping
Inside our `src/shared/service` directory, we built an abstract `BaseService` class. It contains utility methods like `getOrError`, `deleteOrError`, and `getAllPaginated` etc. Instead of writing this logic manually for every entity, we just inherit it. If a bug pops up, we fix it in one place.

Also, the `BaseService` taps directly into the `requestContext`. It automatically detects if a `businessId` or `branchId` is present and quietly injects a `WHERE business_id = ?` clause into the Drizzle ORM queries. Even if a developer completely forgets to scope a query in the controller, the `BaseService` physically prevents cross-tenant data leaks.

## Strict Bounded Modules & Database Strategy
We moved away from the old pattern of dumping every controller into a global `controllers/` folder and every route into a `routes/` folder to a domain-driven modular architecture.

We started by migrating everything related to users, businesses, and branches into an IAM (Identity and Access Management) module. Within a single module, tables can use strict foreign key relationships (e.g., the user table referencing the business table) but components from different modules cannot share foreign keys.

If an Inventory module needs to reference a user, it stores the user ID as a plain string, not a foreign key constraint. We strictly forbid cross module database coupling.

Why? If we allow cross module foreign keys in a modular monolith, you are essentially building a massive highway that funnels all traffic through a single tunnel (a monolithic database). When the application grows, the bottleneck isn't the compute, it's the database finite connection limits and locking mechanisms.

By keeping modules loosely coupled at the data layer, we retain the ability to physically split the database later. When traffic demands it, we can pull the Inventory module out, drop its tables into a dedicated database on a separate machine, and the application will keep running seamlessly because there are no hard foreign key constraints tying it to the IAM database.

## Standardisation: Error Handling, Logging, and Validation
Finally, we have some errors, logging and validation standardised

- **Centralised Errors:** We stripped manual error handling out of the controllers. Errors are now caught globally and returned in a strictly standardise JSON format, giving the client a predictable structure to parse.
- **Validation:** Client input, especially request bodies and query parameters, goes through a strict validation layer before it ever hits a controller.
- **Universal Queries:** We implemented a universal request query parser. Any `GET` endpoint that requires pagination automatically extracts the `search`, `limit`, and `page` values uniformly across the entire API.