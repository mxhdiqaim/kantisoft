import { type ComponentType, type ReactNode } from "react";
import {
    ActivityLogScreen,
    CategoriesScreen,
    ChangePasswordScreen,
    DashboardScreen,
    GoodsScreen,
    InventoryTransactionsScreen,
    MenuItemScreen,
    PointOfSaleScreen,
    ProductionScreen,
    ProfileScreen,
    RawMaterialInventoryScreen,
    RawMaterialInventoryTransactionScreen,
    RawMaterialsScreen,
    SalesHistoryScreen,
    SingleInventoryTransactionScreen,
    StoreScreen,
    TrashBinScreen,
    UnitOfMeasurementsScreen,
    UsersScreen,
    ViewSalesHistoryScreen,
} from "@/pages";
import { DashboardOutlined, KitchenOutlined } from "@mui/icons-material";
import AddAlertOutlinedIcon from "@mui/icons-material/AddAlertOutlined";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import RestaurantMenuOutlinedIcon from "@mui/icons-material/RestaurantMenuOutlined";
import InventoryOutlinedIcon from "@mui/icons-material/InventoryOutlined";

import { LoginPage, RegisterPage, ForgetPasswordPage, OnboardingPage } from "@/modules/iam/pages";
import { HomePage } from "@/app/pages";
import { NotFoundPage } from "@/pages/feedbacks";

import { type UserRole, UserRoleEnum } from "@/modules/iam/types";

export interface AppRouteType {
    to: string;
    element?: ComponentType;
    title?: string;
    icon?: ReactNode;
    useLayout?: boolean;
    authGuard?: boolean;
    hidden?: boolean; // True = Hide from the sidebar, but it accessed through navigation
    children?: AppRouteType[];
    roles?: UserRole[];
}

// Application routes with layout
export const appRoutes: AppRouteType[] = [
    // ---------------------------------
    // Home
    // ---------------------------------
    {
        to: "/",
        title: "Home",
        element: HomePage,
        hidden: true,
        useLayout: false,
        roles: [...Object.values(UserRoleEnum)],
    },

    {
        to: "/onboarding",
        element: OnboardingPage,
        useLayout: false,
        hidden: true,
        roles: [UserRoleEnum.OWNER],
    },

    // ---------------------------------
    // Dashboard
    // ---------------------------------
    {
        to: "/dashboard",
        title: "Dashboard",
        element: DashboardScreen,
        icon: <DashboardOutlined />,
        roles: [...Object.values(UserRoleEnum)],
    },

    // ---------------------------------
    // POS & SALES (Revenue)
    // ---------------------------------
    {
        to: "/pos-sale",
        title: "posAndSales",
        icon: <AddAlertOutlinedIcon />,
        roles: [...Object.values(UserRoleEnum)],
        children: [
            {
                to: "pos",
                title: "orderTracking",
                element: PointOfSaleScreen,
                roles: [...Object.values(UserRoleEnum)],
            },
            {
                to: "history",
                title: "history",
                element: SalesHistoryScreen,
                roles: [...Object.values(UserRoleEnum)],
                children: [
                    {
                        to: ":id/view",
                        element: ViewSalesHistoryScreen,
                        hidden: true,
                        roles: [...Object.values(UserRoleEnum)],
                    },
                ],
            },
        ],
    },

    // ---------------------------------
    // PRODUCT CATALOG (Definitions)
    // ---------------------------------
    {
        to: "/inventory",
        title: "Inventory",
        icon: <RestaurantMenuOutlinedIcon />,
        roles: [...Object.values(UserRoleEnum)],
        children: [
            {
                to: "goods",
                title: "Goods",
                element: GoodsScreen,
                roles: [...Object.values(UserRoleEnum)],
                children: [
                    {
                        to: ":id/transactions",
                        title: "menuItemTransactions",
                        element: SingleInventoryTransactionScreen,
                        hidden: true,
                        roles: [...Object.values(UserRoleEnum)],
                    },
                ],
            },
            {
                to: "menu-items",
                title: "menuItems",
                element: MenuItemScreen,
                roles: [...Object.values(UserRoleEnum)],
            },
            {
                to: "transactions",
                title: "Transactions",
                element: InventoryTransactionsScreen,
                roles: [...Object.values(UserRoleEnum)],
            },
            {
                to: "categories",
                title: "Categories",
                element: CategoriesScreen,
                roles: [...Object.values(UserRoleEnum)],
            },
        ],
    },

    // ---------------------------------
    // INVENTORY & STOCK (Tracking)
    // ---------------------------------
    {
        to: "/raw-materials",
        title: "Raw Material",
        icon: <InventoryOutlinedIcon />,
        roles: [...Object.values(UserRoleEnum)],
        children: [
            {
                to: "list",
                title: "List",
                element: RawMaterialsScreen,
                roles: [...Object.values(UserRoleEnum)],
            },
            {
                to: "inventory",
                title: "Inventory",
                element: RawMaterialInventoryScreen,
                roles: [...Object.values(UserRoleEnum)],
            },
            {
                to: "transactions",
                title: "Transactions",
                element: RawMaterialInventoryTransactionScreen,
                roles: [...Object.values(UserRoleEnum)],
            },
            {
                to: "measurements",
                title: "Measurements",
                element: UnitOfMeasurementsScreen,
                roles: [...Object.values(UserRoleEnum)],
            },
        ],
    },

    // ---------------------------------
    // KITCHEN & PRODUCTION (Operations)
    // ---------------------------------
    {
        to: "/production",
        title: "Production",
        icon: <KitchenOutlined />,
        element: ProductionScreen,
        roles: [UserRoleEnum.ADMIN, UserRoleEnum.MANAGER],
    },

    // ---------------------------------
    // SETTINGS & ADMIN
    // ---------------------------------
    {
        to: "/admin",
        title: "Administrator",
        icon: <GroupOutlinedIcon />,
        roles: [...Object.values(UserRoleEnum)],
        children: [
            {
                to: "users",
                title: "Users",
                element: UsersScreen,
                roles: [...Object.values(UserRoleEnum)],
                children: [
                    {
                        to: "profile",
                        title: "Profile",
                        element: ProfileScreen,
                        hidden: true,
                        authGuard: true,
                        useLayout: true,
                        roles: [...Object.values(UserRoleEnum)],
                    },
                    {
                        to: "change-password",
                        title: "Change Password",
                        element: ChangePasswordScreen,
                        hidden: true,
                        authGuard: true,
                        useLayout: true,
                        roles: [...Object.values(UserRoleEnum)],
                    },
                ],
            },
            {
                to: "stores",
                title: "Stores",
                element: StoreScreen,
                roles: [...Object.values(UserRoleEnum)],
            },
            {
                to: "activities",
                title: "Activities",
                element: ActivityLogScreen,
                roles: [...Object.values(UserRoleEnum)],
            },
            {
                to: "trash",
                title: "Trash",
                element: TrashBinScreen,
                roles: [...Object.values(UserRoleEnum)],
            },
        ],
    },

    // ---------------------------------
    // Public Routes
    // ---------------------------------
    {
        to: "/login",
        element: LoginPage,
        useLayout: false,
        authGuard: false,
        roles: [UserRoleEnum.GUEST],
    },
    {
        to: "/register",
        element: RegisterPage,
        useLayout: false,
        authGuard: false,
        roles: [UserRoleEnum.GUEST],
    },
    {
        to: "/forget-password",
        element: ForgetPasswordPage,
        useLayout: false,
        authGuard: false,
        roles: [UserRoleEnum.GUEST],
    },

    // ---------------------------------
    // Error Pages
    // ---------------------------------
    {
        to: "*",
        title: "notFound",
        element: NotFoundPage,
        hidden: true,
        useLayout: false,
        roles: [...Object.values(UserRoleEnum)],
    },
];
