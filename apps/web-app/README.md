# Kantisoft Frontend (Web App)

A modern Point of Sale (POS) frontend for stores and restaurants. The Kantisoft Web App is the primary client-facing application of the Kantisoft monorepo. It is a feature-rich Single Page Application (SPA) built with React 19 and Vite.

## About Kantisoft

**Kanti** is a name rooted in Hausa, one of Nigeria's major languages. It means **"Store"**, **Mart**, **Supermarket**
or **"Shop"**.

- **Pronunciation:** "Kahn-tee" (with 'a' as in "car", and 't' as in "to").

## 🛠 Tech Stack & Key Features

- **Core**: React 19, Vite, TypeScript
- **Styling & UI**: Material UI (MUI v7), Emotion, and the shared `@kantisoft/ui` package.
- **State & Routing**: React Redux, React Router v7.
- **Forms**: React Hook Form with Yup validation.
- **Offline Storage**: Dexie (IndexedDB wrapper) for offline capabilities and caching.
- **Data Visualization**: Recharts for charts and `react-countup` for data presentation.
- **Internationalization**: `i18next` & `react-i18next`.
- **Utilities**: Data export via `xlsx` and `file-saver`, PDF/print generation via `react-to-print`.
- **Monitoring**: Sentry (`@sentry/react`).

## Features

- **Order Management:** Track, create, and manage store or restaurant orders.
- **Sales History:** View and export sales data by day, week, month, or all time.
- **Menu Management/Products:** Add, edit, and remove menu items.
- **User Management:** Manage staff and guest accounts with role-based permissions.
- **Activity Log:** Audit user actions (manager/admin only).
- **Store Management:** Manage multiple restaurant locations.
- **Authentication:** Secure login and password management.

## Project Structure

```
src/
  components/      # Reusable UI and feature components
  hooks/           # Custom React hooks
  pages/           # Page-level components (routes)
  routes/          # App routing
  store/           # Redux store and slices (RTK Query)
  types/           # TypeScript types and enums
  utils/           # Utility functions
```

## Getting Started

### Prerequisites
Dependencies are managed at the monorepo root via Bun. Ensure you have installed them from the root directory:
```bash
bun install
```

### Development
To start the Vite development server across the whole monorepo, run this from the monorepo root:
```bash
bun run dev
```

If you only want to start the Web App, navigate to `apps/web-app` and run:
```bash
bun run dev
```

### Architecture Context
This frontend connects directly to the Kantisoft `api` backend. It maintains visual consistency with the rest of the ecosystem by consuming the shared `@kantisoft/ui` package from the monorepo.