# Kantisoft

## 🏗 Architecture

Kantisoft is divided into standalone applications and shared packages to ensure modularity and code reuse.

### Applications (`apps/`)

*   **`api`**: The core backend API service. Built with Express.js (v5) and runs natively on Bun. It uses Drizzle ORM for database interactions, Redis for caching/sessions, and JWT/Passport for authentication.
*   **`web-app`**: The primary user-facing frontend. A React 19 SPA built with Vite. It features offline support via Dexie (IndexedDB), complex charting, internationalization, and state management using Redux.
*   **`admin-fe`**: The administrative dashboard. A React 19 application built with Vite and heavily utilizing Material UI's Data Grid for managing the system's core data.

### Packages (`packages/`)

*   **`@kantisoft/ui`**: A shared React component library powered by Material UI (MUI v7). This ensures consistent design language and reusable UI components across both `web-app` and `admin-fe`.

## 🚀 Tech Stack

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

Leverage Turborepo to run commands across all workspaces simultaneously. You can run these scripts using `bun run <script_name>`.

*   **`bun run dev`**: Starts all applications (`api`, `web-app`, `admin-fe`) in development mode parallelly.
*   **`bun run dev:tui`**: Starts all applications in development mode with Turborepo's terminal user interface (TUI).
*   **`bun run dev:app`**: Starts only the backend API (`api`) and the primary user-facing frontend (`web-app`) in parallel.
*   **`bun run dev:admin-full`**: Starts only the backend API (`api`) and the administrative dashboard (`admin-fe`) in parallel.
*   **`bun run dev:api`**: Starts only the core backend API service (`api`).
*   **`bun run dev:web`**: Starts only the primary user-facing frontend (`web-app`).
*   **`bun run dev:admin`**: Starts only the administrative dashboard (`admin-fe`).
*   **`bun run build`**: Builds all applications and packages in the monorepo.
*   **`bun run lint`**: Runs ESLint across the entire codebase to check for linting errors.

---
*For more detailed information on a specific app, please refer to the `README.md` inside its respective directory.*
