# Kantisoft Monorepo

Welcome to the **Kantisoft** monorepo! This project is a modern, scalable full-stack ecosystem managed by [Turborepo](https://turbo.build/) and [Bun](https://bun.sh/). 

## 🏗 Architecture Overview

Kantisoft is divided into standalone applications and shared packages to ensure modularity and code reuse.

### Applications (`apps/`)

*   **`api`**: The core backend API service. Built with Express.js (v5) and runs natively on Bun. It uses Drizzle ORM for database interactions, Redis for caching/sessions, and JWT/Passport for authentication.
*   **`web-app`**: The primary user-facing frontend. A React 19 SPA built with Vite. It features offline support via Dexie (IndexedDB), complex charting, internationalization, and state management using Redux.
*   **`admin-fe`**: The administrative dashboard. A React 19 application built with Vite and heavily utilizing Material UI's Data Grid for managing the system's core data.

### Packages (`packages/`)

*   **`@kantisoft/ui`**: A shared React component library powered by Material UI (MUI v7). This ensures consistent design language and reusable UI components across both `web-app` and `admin-fe`.

## 🚀 Tech Stack Highlights

*   **Package Manager & Runtime**: Bun
*   **Monorepo Tooling**: Turborepo
*   **Frontend**: React 19, Vite, Material UI (MUI), Redux, React Router v7, React Hook Form
*   **Backend**: Bun, Express v5, Drizzle ORM, Redis
*   **Monitoring**: Sentry (Browser & Bun integrations)

## 🛠 Getting Started

### Prerequisites

Ensure you have [Bun](https://bun.sh/) installed on your machine.

### Installation

Clone the repository and install dependencies at the root level:

```bash
bun install
```

### Development Scripts

Leverage Turborepo to run commands across all workspaces simultaneously.

*   `bun run dev`: Starts all applications in development mode parallelly.
*   `bun run build`: Builds all applications and packages.
*   `bun run lint`: Runs ESLint across the codebase.

---
*For more detailed information on a specific app, please refer to the `README.md` inside its respective directory.*