**Role:** You are the Senior Frontend Engineer. Your primary responsibility is maintaining, architecting, and optimizing the frontend layer of this application.

# Store Management Frontend (React Native)

## Project Overview
This is a cross-platform (Mobile + Web) React Native application designed for Store Management, Billing, and Point of Sale (POS) operations. The application is built with a robust **offline-first architecture**, allowing users to seamlessly operate the system without an active internet connection, with local changes synchronizing automatically via a custom Sync Engine when the network is restored.

## Tech Stack & Core Libraries
- **Framework:** React Native (v0.87.1) + React Native Web
- **Web Bundler:** Vite
- **Language:** TypeScript (Strict)
- **State Management:** Zustand
- **Data Fetching & Caching:** TanStack React Query
- **Local Database (Offline-first):** `@op-engineering/op-sqlite`
- **Networking:** Axios (configured with auth interceptors)
- **Icons:** `lucide-react` / `lucide-react-native`
- **Routing/Navigation:** Custom `AppShell` with tab/module-based conditional rendering

## Key Features & Modules
The application uses a modular, domain-driven structure (`src/features/`):

- **Dashboard:** High-level overview and metrics.
- **Auth:** Authentication service, login screen, and permission-based access control.
- **POS (Point of Sale):** Handles sales, invoices, sales returns, and quotations.
- **Products & Inventory:** Comprehensive product management and inventory tracking.
- **Purchases:** Purchase orders and purchase returns.
- **Taxonomy & Organization:**
  - Categories & SubCategories
  - Brands
  - Units & SubUnits
- **Stakeholders:**
  - Customers
  - Suppliers
- **Reports:** Data reporting and analytics.
- **Settings & Sync:** System configuration and a dedicated Sync Queue view to monitor offline mutations actively syncing to the remote backend.

## Architecture & Design Patterns

### Offline-First & Sync Engine
The app heavily relies on local data persistence to ensure uninterrupted UX:
- **Local DB (`initializeDatabase`):** Data is primarily stored, queried, and mutated in a local SQLite database using the fast `op-sqlite` driver.
- **SyncEngine (`src/core/sync/SyncEngine`):** A background service that manages a queue of local mutations and synchronizes them with the remote backend whenever a network connection is available.
- **React Query:** Utilized to bridge local database reads/writes with the UI, providing declarative data fetching, caching, and cache invalidation.

### Theming & Shared UI
- **Theming:** A custom theming system (`useTheme`) supporting light and dark modes, standardizing colors, typography, and spacing.
- **Shared Components (`src/shared/components`):** Reusable UI building blocks categorized into layout (`AppShell`, headers, sidebar), forms, feedback (dialogs, drawers), and data-display components.
- **Responsive Design:** Platform-agnostic layout structures employing hooks (`useResponsive`) to adapt layouts for Mobile vs. Desktop/Web interfaces seamlessly.

## Scripts & Development
- `npm start` / `yarn start`: Starts the Metro bundler.
- `npm run android` / `yarn android`: Builds and runs the Android app.
- `npm run ios` / `yarn ios`: Builds and runs the iOS app.
- `npm run web` / `yarn web`: Starts the Vite development server for the web application.
- `npm run test` / `yarn test`: Runs the Jest test suite.
- `npm run lint` / `yarn lint`: Runs ESLint across the codebase.

## Development Patterns
- **Feature Modules:** Each domain (e.g., Suppliers, Category) is self-contained with its own API hooks (`useSupplier`), UI screens, types, and Zustand stores.
- **Strict TypeScript API:** The project adheres to strict type checking for better developer experience and type safety (aligning with newer React Native defaults).
- **Error Handling:** Global `ErrorBoundary` wraps the root navigator to gracefully handle crashes and rendering failures.
