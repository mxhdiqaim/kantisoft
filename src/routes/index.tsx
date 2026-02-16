import {type ComponentType, type ReactNode} from "react";
import {
    ActivityLogScreen,
    CategoriesScreen,
    ChangePasswordScreen,
    DashboardScreen,
    ForgetPasswordScreen,
    GoodsScreen,
    HomeScreen,
    InventoryTransactionsScreen,
    LoginScreen,
    MenuItemScreen,
    NotFoundScreen,
    PointOfSaleScreen,
    ProductionScreen,
    ProfileScreen,
    RawMaterialInventoryScreen,
    RawMaterialInventoryTransactionScreen,
    RawMaterialsScreen,
    RegisterScreen,
    SalesHistoryScreen,
    SingleInventoryTransactionScreen,
    StoreFormScreen,
    StoreScreen,
    TrashBinScreen,
    UnitOfMeasurementsScreen,
    UsersScreen,
    ViewSalesHistoryScreen,
    ViewStoreScreen,
} from "@/pages";
import {type UserRole, UserRoleEnum} from "@/types/user-types";
import {DashboardOutlined, KitchenOutlined} from "@mui/icons-material";
import AddAlertOutlinedIcon from "@mui/icons-material/AddAlertOutlined";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import RestaurantMenuOutlinedIcon from "@mui/icons-material/RestaurantMenuOutlined";
import InventoryOutlinedIcon from '@mui/icons-material/InventoryOutlined';

export interface AppRouteType {
    to: string;
    element?: ComponentType;
    title?: string;
    icon?: ReactNode;
    useLayout?: boolean;
    authGuard?: boolean;
    hidden?: boolean; // True = Hide from the sidebar, but it accessed through navigation
    children?: AppRouteType[];
    roles?: UserRole[]; // Add role property
}

// Application routes with layout
export const appRoutes: AppRouteType[] = [
    // ---------------------------------
    // Home
    // ---------------------------------
    {
        to: "/",
        title: "home",
        element: HomeScreen,
        hidden: true,
        roles: [UserRoleEnum.MANAGER, UserRoleEnum.ADMIN, UserRoleEnum.USER, UserRoleEnum.GUEST],
    },

    // ---------------------------------
    // Dashboard
    // ---------------------------------
    {
        to: "/dashboard",
        title: "dashboard",
        element: DashboardScreen,
        icon: <DashboardOutlined/>,
        roles: [UserRoleEnum.MANAGER, UserRoleEnum.ADMIN],
    },

    // ---------------------------------
    // POS & SALES (Revenue)
    // ---------------------------------
    {
        to: "/pos-sale",
        title: "posAndSales",
        icon: <AddAlertOutlinedIcon/>,
        roles: [UserRoleEnum.MANAGER, UserRoleEnum.ADMIN, UserRoleEnum.USER, UserRoleEnum.GUEST],
        children: [
            {
                to: "pos",
                title: "orderTracking",
                element: PointOfSaleScreen,
                roles: [UserRoleEnum.ADMIN, UserRoleEnum.MANAGER, UserRoleEnum.USER, UserRoleEnum.GUEST],
            },
            {
                to: "history",
                title: "history",
                element: SalesHistoryScreen,
                roles: [UserRoleEnum.MANAGER, UserRoleEnum.ADMIN, UserRoleEnum.USER],
                children: [
                    {
                        to: ":id/view",
                        element: ViewSalesHistoryScreen,
                        hidden: true,
                        roles: [UserRoleEnum.MANAGER, UserRoleEnum.ADMIN],
                    }
                ]
            },
        ]
    },

    // ---------------------------------
    // PRODUCT CATALOG (Definitions)
    // ---------------------------------
    {
        to: "/inventory",
        title: "Inventory",
        icon: <RestaurantMenuOutlinedIcon/>,
        roles: [UserRoleEnum.MANAGER, UserRoleEnum.ADMIN, UserRoleEnum.USER, UserRoleEnum.GUEST],
        children: [
            {
                to: "goods",
                title: "Goods",
                element: GoodsScreen,
                roles: [UserRoleEnum.MANAGER, UserRoleEnum.ADMIN, UserRoleEnum.USER],
                children: [
                    {
                        to: ":id/transactions",
                        title: "menuItemTransactions",
                        element: SingleInventoryTransactionScreen,
                        hidden: true,
                        roles: [UserRoleEnum.MANAGER, UserRoleEnum.ADMIN, UserRoleEnum.USER],
                    },
                ]
            },
            {
                to: "menu-items",
                title: "menuItems",
                element: MenuItemScreen,
                roles: [UserRoleEnum.MANAGER, UserRoleEnum.ADMIN, UserRoleEnum.USER],
            },
            {
                to: "transactions",
                title: "Transactions",
                element: InventoryTransactionsScreen,
                roles: [UserRoleEnum.MANAGER, UserRoleEnum.ADMIN],
            },
            {
                to: "categories",
                title: "Categories",
                element: CategoriesScreen,
                roles: [UserRoleEnum.MANAGER, UserRoleEnum.ADMIN, UserRoleEnum.USER],
            }
        ]
    },

    // ---------------------------------
    // INVENTORY & STOCK (Tracking)
    // ---------------------------------
    {
        to: "/raw-materials",
        title: "Raw Material",
        icon: <InventoryOutlinedIcon/>,
        roles: [UserRoleEnum.ADMIN, UserRoleEnum.MANAGER, UserRoleEnum.USER],
        children: [
            {
                to: "list",
                title: "List",
                element: RawMaterialsScreen,
                roles: [UserRoleEnum.MANAGER, UserRoleEnum.ADMIN, UserRoleEnum.USER],
            },
            {
                to: "inventory",
                title: "Inventory",
                element: RawMaterialInventoryScreen,
                roles: [UserRoleEnum.MANAGER, UserRoleEnum.ADMIN, UserRoleEnum.USER],
            },
            {
                to: "transactions",
                title: "Transactions",
                element: RawMaterialInventoryTransactionScreen,
                roles: [UserRoleEnum.MANAGER, UserRoleEnum.ADMIN],
            },
            {
                to: "measurements",
                title: "Measurements",
                element: UnitOfMeasurementsScreen,
                roles: [UserRoleEnum.MANAGER, UserRoleEnum.ADMIN, UserRoleEnum.USER],
            },
        ]
    },

    // ---------------------------------
    // REPORTS & RECORDS
    // ---------------------------------
    // {
    //     to: "/records",
    //     title: "Reports & Records",
    //     icon: <HistoryEduIcon/>,
    //     roles: [UserRoleEnum.MANAGER, UserRoleEnum.ADMIN],
    //     children: [
    //         {
    //             to: "profitability-wastage",
    //             title: "Profitability & Wastage",
    //             element: ProfitabilityWastageScreen,
    //             roles: [UserRoleEnum.MANAGER, UserRoleEnum.ADMIN],
    //         }
    //     ]
    // },

    // ---------------------------------
    // KITCHEN & PRODUCTION (Operations)
    // ---------------------------------
    {
        to: "/production",
        title: "Production",
        icon: <KitchenOutlined/>,
        element: ProductionScreen,
        roles: [UserRoleEnum.ADMIN, UserRoleEnum.MANAGER],
    },

    // ---------------------------------
    // SETTINGS & ADMIN
    // ---------------------------------
    {
        to: "/admin",
        title: "Administrator",
        icon: <GroupOutlinedIcon/>,
        roles: [UserRoleEnum.MANAGER, UserRoleEnum.ADMIN],
        children: [
            {
                to: "users",
                title: "Users",
                element: UsersScreen,
                roles: [UserRoleEnum.MANAGER, UserRoleEnum.ADMIN],
                children: [
                    {
                        to: "profile",
                        title: "Profile",
                        element: ProfileScreen,
                        hidden: true,
                        authGuard: true,
                        useLayout: true,
                        roles: [UserRoleEnum.MANAGER, UserRoleEnum.ADMIN, UserRoleEnum.USER, UserRoleEnum.GUEST],
                    },
                    {
                        to: "change-password",
                        title: "Change Password",
                        element: ChangePasswordScreen,
                        hidden: true,
                        authGuard: true,
                        useLayout: true,
                        roles: [UserRoleEnum.MANAGER, UserRoleEnum.ADMIN, UserRoleEnum.USER, UserRoleEnum.GUEST],
                    },
                ]
            },
            {
                to: "stores",
                title: "Stores",
                element: StoreScreen,
                roles: [UserRoleEnum.MANAGER, UserRoleEnum.ADMIN],
                children: [
                    // {
                    //     to: "new",
                    //     title: "createStore",
                    //     element: StoreFormScreen,
                    //     hidden: true,
                    //     roles: [UserRoleEnum.MANAGER],
                    // },
                    {
                        to: ":id/view",
                        title: "viewStore",
                        element: ViewStoreScreen,
                        hidden: true,
                        roles: [UserRoleEnum.MANAGER],
                    },
                    {
                        to: ":id/edit",
                        title: "editStore",
                        element: StoreFormScreen,
                        hidden: true,
                        roles: [UserRoleEnum.MANAGER],
                    },
                ]
            },
            {
                to: "activities",
                title: "Activities",
                element: ActivityLogScreen,
                roles: [UserRoleEnum.MANAGER, UserRoleEnum.ADMIN],
            },
            {
                to: "trash",
                title: "Trash",
                element: TrashBinScreen,
                roles: [UserRoleEnum.MANAGER, UserRoleEnum.ADMIN],
            },
        ]
    },

    // ---------------------------------
    // Public Routes
    // ---------------------------------
    {
        to: "/login",
        element: LoginScreen,
        useLayout: false,
        authGuard: false,
        roles: [UserRoleEnum.GUEST],
    },

    {
        to: "/auth/register/5473",
        element: RegisterScreen,
        useLayout: false,
        authGuard: false,
        roles: [UserRoleEnum.GUEST],
    },
    {
        to: "/forget-password",
        element: ForgetPasswordScreen,
        useLayout: false,
        authGuard: false,
        roles: [UserRoleEnum.GUEST]
    },

    // ---------------------------------
    // Error Pages
    // ---------------------------------
    {
        to: "*",
        title: "notFound",
        element: NotFoundScreen,
        hidden: true,
        useLayout: false,
        roles: [UserRoleEnum.MANAGER, UserRoleEnum.ADMIN, UserRoleEnum.USER, UserRoleEnum.GUEST],
    },
];
