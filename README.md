# Kantisoft Software

## Engineering Blog

We document our major architectural decisions, system design choices, and engineering shifts directly in this repository.

* [001: Migrating to a Modular Monolith: Fixing a Messy Codebase](./docs/architecture/001-migrating-modular-monolith.md)
  *Details our shift to a domain-driven design, Zero-DB stateless auth via Clerk, global request context, and loosely coupled database modules.*

## API Tech Stack
* **Runtime / Framework:** Node.js / Express
* **Database / ORM:** PostgreSQL / Drizzle ORM
* **Authentication:** Clerk JWT
* **Validation:** Zod

## Client Tech Stack
* **Runtime / Framework:** Bun / React
* **Style:** MUI
* **State Management:** Redux RTK
* **Validation:** Yup