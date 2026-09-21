# Kantisoft Software

## Engineering Blog

I document any major architectural and engineering decisions/choices, system design choices.

* [001: Migrating the API to Modular Monolith: Fixing a Messy Codebase](docs/architecture/001-migrating-the-api-to-modular-monolith.md)
  *Details the shift to a domain-driven design, Zero-DB stateless auth via Clerk, global request context, and loosely coupled database modules.*

## API Tech Stack
* **Runtime / Framework:** Node.js / Express
* **Database / ORM:** PostgreSQL / Drizzle ORM
* **Authentication:** Clerk JWT
* **Validation:** Zod

## Client Tech Stack
* **Runtime / Framework:** Bun / React
* **Style:** MUI
* **State Management:** Redux RTK (Moving to Tanstack Query)
* **Validation:** Yup