# Architecture & Standards

This document outlines the architectural philosophy, directory structure, and naming conventions for the Kantisoft frontend. 

We have moved away from a legacy **Type-Driven Architecture** (grouping files by what they are: components, hooks, types) to a **Feature-Driven Architecture** (grouping files by business domain). This directly mirrors our backend Modular Monolith, allowing developers to context-switch between the API and the React app seamlessly.

## The core pillars

The `src/` directory is divided into three strict pillars:

1. **`app/`**: Global configurations, React Router setup, and Context Providers.
2. **`shared/`**: Universal toolkit. Reusable elements (UI components, generic hooks, global utilities) live here. It contains zero business logic.
3. **`modules/`**: The actual business domains. Each module acts as a self contain mini app.

```text
src/
├── app/                  # App-wide configurations
│   ├── router.tsx        # React Router configuration
│   ├── main.tsx          # React entry point
│   └── styles/           # Global CSS and MUI theme configs
│
├── shared/               # Base toolkit (No business logic)
│   ├── components/       # Universal UI library (Button, Modal, DataGrid)
│   ├── hooks/            # Generic hooks (useScreenSize, useOnlineStatus)
│   ├── utils/            # Generic helpers (getRelativeTime, formatCurrency)
│   ├── types/            # Universal types (PaginationResponse, APIError)
│   └── stores/           # Global UI Zustand stores (useUIStore)
│
└── modules/              # Feature-Driven Domains (Modular Monolith)
    ├── iam/              # Identity & Access Management (Auth, Users)
    ├── inventory/        # Inventory
    ├── pos/              # Point of Sale
    └── administrator/    # Admin panel
```
## Inside the module

A module contains everything it needs to function: the UI, routing pages, state, data fetching, and validation.

### Module structure example (IAM)

```text
src/modules/iam/
├── api/                  # TanStack Query hooks and Axios calls
│   └── auth.api.ts       
├── components/           # UI components only used in this module
│   ├── login-form.component.tsx    
│   └── user-card.component.tsx     
├── pages/                # Routable Screens
│   ├── login.page.tsx    
│   └── register.page.tsx 
├── store/                # Zustand client state
│   └── auth.store.ts     
├── types/                # Type/Interface specific to this domain
│   └── auth.types.ts     
├── validation/           # Yup/Zod schemas
│   └── auth.schema.ts    
└── base.type.ts              # The entry file of the module
```

## Strict architectural rules

To prevent the codebase to degrading into a messy code web, developers must adhere to the following rules:

1. **Strict module boundaries:** Modules cannot reach into other module internal folders. If `inventory` need a user component, it must import it from `src/modules/iam/index.ts`. They must remain loosely coupled.
2. **Shared means shared:** If a spinner or a custom modal is used by both `inventory` and `pos`, it does not belong in either module. Move it to `src/shared/components/`.
3. **Colocation is king:** If a TypeScript interface is only used by the `LoginFormComponent`, define it inside the `iam` module (or within the exact same file). Do not pollute global `src/types` folder.
4. **Separation of state:**
   * **Zustand** is strictly for **Client state** (sidebar open/close, current auth token).
   * **TanStack Query (React Query)** is strictly for **Server state** (fetching, caching, and mutating database records).

## Naming convention

We use a strict `[feature].[type].[extension]` naming convention. This mirrors our backend class structures (e.g., `user.service.ts`), eliminates "export default hell" and makes VS Code file searching (`Cmd/Ctrl + P`) frictionless.

| Layer | Naming Pattern | Example                    | Purpose                                                |
| --- | --- |----------------------------|--------------------------------------------------------|
| **Pages** | `[name].page.tsx` | `login.page.tsx`           | Component attached to a URL route.                     |
| **Components** | `[name].tsx` | `login-form.component.tsx` | Standard UI building blocks (kebab-case).              |
| **State (Zustand)** | `[name].store.ts` | `auth.store.ts`            | Frontend equivalent of a service holding state.        |
| **API (Queries)** | `[name].api.ts` | `auth.api.ts`              | Frontend equivalent of a controller. Holds query logic. |
| **Validation** | `[name].schema.ts` | `auth.schema.ts`           | Yup/Zod validation objects.                            |
| **Types** | `[name].types.ts` | `auth.types.ts`            | TypeScript interfaces and types.                       |
| **Hooks** | `use-[name].hook.ts` | `use-screen-size.hook.ts`  | Custom hooks.                                          |
