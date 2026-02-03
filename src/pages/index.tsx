// Home screens
export {default as HomeScreen} from "./home";
export {default as DashboardScreen} from "./dashboard";

// POS & Sales screens
export {default as PointOfSaleScreen} from "./point-of-sale";
export {default as SalesHistoryScreen} from "./point-of-sale/sales";
export {default as ViewSalesHistoryScreen} from "@/pages/point-of-sale/sales/view-sales-history";

export {default as MenuItemScreen} from "./menu-item";

export {default as ActivityLogScreen} from "./activity-log";

export {default as ProfileScreen} from "./profile";
export {default as ChangePasswordScreen} from "./profile/change-password";

// Inventory screens
export {default as InventoryManagementScreen} from "./inventory";
export {default as SingleInventoryTransactionScreen} from "./inventory/single-inventory-transaction.tsx";
export {default as InventoryTransactionsScreen} from "./inventory/inventory-transactions.tsx";

// Auth screens
export {default as LoginScreen} from "./auth/login";
export {default as RegisterScreen} from "./auth/register";
export {default as ForgetPasswordScreen} from "./auth/forget-password";

// Feedback screens
export {default as NotFoundScreen} from "./feedbacks/not-found";

// Raw Material Inventory Management Sub-screens
export {default as RawMaterialsScreen} from "./raw-materials"; // Master list of ingredients
export {default as RawMaterialInventoryScreen} from "./raw-materials/raw-material-inventory.tsx"; // Actual stock levels/min stock
export {default as RawMaterialInventoryTransactionScreen} from "./raw-materials/raw-material-inventory-transaction.tsx"; // Stock in/out transactions
export {default as UnitOfMeasurementsScreen} from "./raw-materials/unit-of-measurements.tsx"; // Units of measurement

// Production screens
export {default as ProductionScreen} from "./production"

// Records
// export {default as ProfitabilityWastageScreen} from "./records/profitability-wastage.tsx"

// Administrator
export {default as TrashBinScreen} from "./administrator/trash-bin";
export {default as AddUserScreen} from "./administrator/users/add-user";
export {default as UsersScreen} from "./administrator/users";
export {default as EditUserScreen} from "./administrator/users/edit-user";
export {default as ViewUserScreen} from "./administrator/users/view-user";
export {default as StoreScreen} from "./administrator/stores";
export {default as StoreFormScreen} from "./administrator/stores/store-form";
export {default as ViewStoreScreen} from "./administrator/stores/view-store";

// Categories
export {default as CategoriesScreen} from "./categories";
