import {type ActivityLogEntry, type ActivityLogResponse, localSyncStatusEnum, type QueryParamType} from "@/types";
import type {
    InventoryAlertType,
    SalesTrendType,
    SaleSummarySchemaType,
    TopSellsItemType,
    TopSellsParamType,
} from "@/types/dashboard-types.ts";
import type {CreateMenuItemType, LocalMenuItemType, MenuItemType} from "@/types/menu-item-type.ts";
import type {
    CreateOrderType,
    OrdersByPeriodResponse,
    Period as TimePeriod,
    SingleOrderType
} from "@/types/order-types.ts";
import type {CreateStoreType, PaginatedStoreResponse, StoreType} from "@/types/store-types";
import {
    type CreateUserType,
    type RegisterUserType,
    type UpdatePasswordType,
    UserRoleEnum,
    type UserType
} from "@/types/user-types";
import {
    type BaseQueryFn,
    createApi,
    type FetchArgs,
    fetchBaseQuery,
    type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import type {RootState} from "..";
import {logOut, selectCurrentUser, setCredentials} from "./auth-slice";
import {selectActiveStore} from "@/store/slice/store-slice.ts";
import type {
    AdjustStockResponseType,
    AdjustStockType,
    CreateInventoryType,
    InventoryTransactionResponseType,
    InventoryTransactionType,
    InventoryType,
    InventoryValuationHealthType
} from "@/types/inventory-types.ts";
import {getEnvVariable} from "@/utils";
import type {UnitOfMeasurementType} from "@/types/unit-of-measurement-types.ts";
import type {
    CreateRawMaterialInventoryType,
    CreateRawMaterialType,
    DeletedRawMaterialType,
    GetRawMaterialInventoryStockType,
    MultipleRawMaterialInventoryResponseType,
    RawMaterialInventoryTransactionsResponse,
    RawMaterialType,
    SingleRawMaterialInventoryType,
    SingleRawMaterialType,
    StockInRawMaterialInventoryType,
    StockInRawMaterialType,
    UpdateRawMaterialInventoryResponseType,
    UpdateRawMaterialInventoryType,
    UpdateRawMaterialResponseType,
    UpdateRawMaterialType
} from "@/types/raw-material-types.ts";
import type {BomTypes, DefineBomSchemaType} from "@/types/bom-types.ts";
import type {
    CreateProductionType,
    CreateWastageType,
    FinishedGoodsProfitMarginType,
    ProductionSummaryType,
    ProductionType,
    ProductionWastageSummaryType
} from "@/types/production-types.ts";
import type {CategoryType, CreateCategoryType, LocalCategoryType} from "@/types/categories-types.ts";
import {localDb} from "@/db/local-db.ts";

const baseUrl = getEnvVariable("VITE_APP_API_URL");

// Create a new base query that wraps fetchBaseQuery
const baseQuery = fetchBaseQuery({
    baseUrl,
    prepareHeaders: (headers, {getState}) => {
        // Get the token from the auth state
        const token = (getState() as RootState).auth.token;
        if (token) {
            headers.set("authorization", `Bearer ${token}`);
        }
        return headers;
    },
});

// Lock to prevent multiple logout dispatches
let isLoggingOut = false;

// base query function that includes logout logic on 401
const baseQueryWithAuth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
    args,
    api,
    extraOptions,
) => {
    const state = api.getState() as RootState;
    const currentUser = selectCurrentUser(state);
    const activeStore = selectActiveStore(state);

    let modifiedArgs = args;

    // If the user is a manager and has an active store, add targetStoreId to params
    if (currentUser?.role === UserRoleEnum.MANAGER && activeStore?.id) {
        if (typeof args === "string") {
            modifiedArgs = {
                url: args,
                params: {targetStoreId: activeStore.id},
            };
        } else {
            modifiedArgs = {
                ...args,
                params: {
                    ...args.params,
                    targetStoreId: activeStore.id,
                },
            };
        }
    }

    const result = await baseQuery(modifiedArgs, api, extraOptions);

    // Check if the error is a 401 and the request was NOT to the login endpoint
    const isLoginAttempt = typeof args === "object" && "url" in args && args.url.includes("/login");

    // If a 401 Unauthorised error occurs, dispatch the logOut action
    if (result.error && result.error.status === 401 && !isLoginAttempt) {
        if (!isLoggingOut) {
            isLoggingOut = true; // Set the lock
            console.warn("Session expired, initiating logout.");

            // Dispatch the logOut action to clear credentials
            api.dispatch(logOut());

            // Reset the entire API state to clear cache and stop other queries
            api.dispatch(apiSlice.util.resetApiState());

            // Redirect to login page
            window.location.href = "/login";
        }
        // Preventing other queries from failing and causing unhandled exceptions
        // while the logout is in progress, return a promise that never resolves.
        // The page reload to "/login" will render this moot.
        return new Promise(() => {
        });
    }

    return result;
};

// Define your API slice
export const apiSlice = createApi({
    reducerPath: "api",
    baseQuery: baseQueryWithAuth,
    // Define tags for caching and automatic refetching
    tagTypes: [
        "Order",
        "MenuItem",
        "User",
        "users",
        "Summary",
        "TopSells",
        "InventoryAlerts",
        "SalesTrend",
        "Store",
        "ActivityLog",
        "Inventory",
        "InventoryReport",
        "SingleInventoryTransaction",
        "InventoryTransactions",
        "RawMaterials",
        "RawMaterial",
        "DeletedRawMaterials",
        "UnitOfMeasurements",
        "RawMaterialInventory",
        "RawMaterialInventories",
        "RawMaterialInventoryStock",
        "RawMaterialTransactions",
        "BOM",
        "RawMaterialStock",
        "ProductionLogs",
        "ProductionSummary",
        "ProductionWastageSummary",
        "FinishedGoodsProfitMargin",
        "InventoryHealthValuation",
        "Category",
        "Categories"
    ],
    endpoints: (builder) => ({
        // -------------------------
        // Health Check Endpoint
        // -------------------------
        healthCheck: builder.query<{ status: string }, void>({
            query: () => "/health",
        }),

        // -------------------------
        // Auth Endpoints
        // -------------------------
        login: builder.mutation({
            query: (credentials) => ({
                url: "/auth/login",
                method: "POST",
                body: credentials,
            }),
            async onQueryStarted(_args, {dispatch, queryFulfilled}) {
                try {
                    const {data} = await queryFulfilled;

                    // On success, dispatch setCredentials to store token and user
                    dispatch(setCredentials(data));
                } catch (error) {
                    console.error("Login failed:", error);
                }
            },
        }),

        logout: builder.mutation({
            query: () => ({
                url: "/auth/logout",
                method: "POST",
            }),
            async onQueryStarted(_args, {dispatch, queryFulfilled}) {
                try {
                    await queryFulfilled;
                    // Dispatch the logOut action to clear credentials and localStorage
                    dispatch(logOut());
                    // Clear the RTK Query cache
                    dispatch(apiSlice.util.resetApiState());

                    // Redirect to login page
                    window.location.href = "/login";

                    // reload
                    // window.location.reload();
                } catch (error) {
                    console.error("Logout failed:", error);
                    // Even if the server call fails, force a local logout
                    dispatch(logOut());
                    dispatch(apiSlice.util.resetApiState());

                    // Redirect to login page
                    window.location.href = "/login";

                    // reload
                    // window.location.reload();
                }
            },
        }),

        registerManagerAndStore: builder.mutation<
            { user: RegisterUserType; token: string },
            Omit<RegisterUserType, "confirmPassword">
        >({
            query: (body) => ({
                url: "/auth/register",
                method: "POST",
                body,
            }),
        }),

        getActivities: builder.query<ActivityLogEntry[], { limit?: number; offset?: number }>({
            query: ({limit = 20, offset = 0} = {}) => ({
                url: "/activities",
                params: {limit, offset},
            }),
            transformResponse: (response: ActivityLogResponse) => response.data,
            providesTags: [{type: "ActivityLog", id: "LIST"}],
        }),

        // -------------------------
        // Dashboard Endpoint
        // -------------------------
        getSalesSummary: builder.query<SaleSummarySchemaType, TimePeriod>({
            query: (timePeriod = "today") => ({
                url: "/dashboard/sales-summary",
                params: {timePeriod},
            }),
            providesTags: ["Summary"],
        }),

        getTopSells: builder.query<TopSellsItemType[], TopSellsParamType>({
            query: ({timePeriod = "today", limit = 5, orderBy = "quantity", startDate = "", endDate = ""}) => ({
                url: "/dashboard/top-sells",
                params: {timePeriod, limit, orderBy, startDate, endDate},
            }),
            providesTags: ["TopSells"],
        }),

        getSalesTrend: builder.query<SalesTrendType[], TimePeriod>({
            query: (timePeriod = "today") => ({
                url: "/dashboard/sales-trend",
                params: {timePeriod},
            }),
            providesTags: ["SalesTrend"],
        }),

        getFinishedGoodsProfitMargin: builder.query<FinishedGoodsProfitMarginType[], void>({
            query: () => '/dashboard/finished-goods-profit-margin',

            providesTags: ["FinishedGoodsProfitMargin"],
        }),

        getInventoryValuationHealth: builder.query<InventoryValuationHealthType, TimePeriod>({
            query: (timePeriod = "today") => ({
                url: "/dashboard/inventory-health-valuation",
                params: {timePeriod},
            }),
            providesTags: ["InventoryHealthValuation"],
        }),


        // -------------------------
        // Order Endpoints
        // -------------------------
        getOrdersByPeriod: builder.query<OrdersByPeriodResponse, TimePeriod>({
            query: (timePeriod = "today") => ({
                url: "/orders/by-period",
                params: {timePeriod},
            }),
            providesTags: (result) =>
                result && 'data' in result && Array.isArray(result.data)
                    ? [...result.data.map(({id}) => ({type: "Order" as const, id})), {type: "Order", id: "LIST"}]
                    : [{type: "Order", id: "LIST"}],
        }),

        getOrderById: builder.query<SingleOrderType, string>({
            query: (id) => `/orders/${id}`,
            providesTags: (_result, _error, id) => [{type: "Order", id}],
        }),

        createOrder: builder.mutation<SingleOrderType, Omit<CreateOrderType, "amountReceived">>({
            query: (newOrder) => ({
                url: "/orders/create",
                method: "POST",
                body: newOrder,
            }),
            invalidatesTags: [{type: "Order", id: "LIST"}, {type: "MenuItem", id: "LIST"}, {
                type: "Inventory",
                id: "LIST"
            }],
        }),

        // -------------------------
        // Menu Item Endpoints
        // -------------------------
        getMenuItems: builder.query<MenuItemType[], QueryParamType>({
            query: (params = {}) => ({
                url: "/menu-items",
                params,
            }),
            transformResponse: (response: { data: MenuItemType[] }) => response.data,

            // THE SEEDING LOGIC
            async onCacheEntryAdded(_arg, {cacheDataLoaded}) {
                try {
                    // Wait for the first response to arrive from the backend
                    const {data} = await cacheDataLoaded;

                    if (data && data.length > 0) {
                        // Bulk save to Dexie.
                        // .bulkPut is better than .add because it updates existing records
                        const localData: LocalMenuItemType[] = data.map(item => ({
                            ...item,
                            syncStatus: localSyncStatusEnum.SYNCED // Mark as already on server
                        }));

                        await localDb.menuItems.bulkPut(localData);
                        console.log("Dexie Hydrated: Menu Items stored locally.");
                    }
                } catch (error) {
                    console.error("Failed to seed Dexie:", error);
                }
            },

            providesTags: (result) =>
                result
                    ? [...result.map(({id}) => ({type: "MenuItem" as const, id})), {type: "MenuItem", id: "LIST"}]
                    : [{type: "MenuItem", id: "LIST"}],
        }),

        createMenuItem: builder.mutation<MenuItemType, CreateMenuItemType>({
            query: (newMenuItem) => ({
                url: "/menu-items/create",
                method: "POST",
                body: newMenuItem,
            }),

            async onQueryStarted(newMenuItem, {queryFulfilled, getState}) {
                const tempId = crypto.randomUUID();
                const actualTempId = `temp-${tempId}`;

                const state = getState() as RootState;
                const activeStore = state.store?.activeStore; // Get your current store name for the UI

                // Map CreateMenuItemType -> LocalMenuItemType (Optimistic)
                const optimisticItem = {
                    ...newMenuItem,
                    id: actualTempId,
                    storeId: activeStore?.id || "",
                    syncStatus: localSyncStatusEnum.PENDING,
                    // Mocking the nested objects so the UI table renders nicely
                    store: {name: activeStore?.name || "Syncing..."},
                    inventory: {
                        quantity: 0,
                        status: "", // Default for new items
                        lastCountDate: new Date().toISOString()
                    },
                };

                await localDb.menuItems.add(optimisticItem as LocalMenuItemType);

                try {
                    const {data: createdItem} = await queryFulfilled;

                    // Replace temp with real data (now includes backend-generated SKU, itemCode, etc.)
                    await localDb.menuItems.delete(actualTempId);

                    await localDb.menuItems.add({
                        ...createdItem,
                        syncStatus: localSyncStatusEnum.SYNCED
                    });
                } catch {
                    // Keep the optimistic item with tempId so user can still see/edit it
                    console.log("Offline: Item saved to Dexie with PENDING status.");
                }
            },
            invalidatesTags: [{type: "MenuItem", id: "LIST"}],
        }),

        deleteMenuItem: builder.mutation<void, string>({
            query: (id) => ({
                url: `/menu-items/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: (_result, _error, id) => [{type: "MenuItem", id}, {type: "MenuItem", id: "LIST"}],
        }),

        updateMenuItem: builder.mutation<MenuItemType, Partial<MenuItemType> & Pick<MenuItemType, "id">>({
            query: ({id, ...patch}) => ({
                url: `/menu-items/${id}`,
                method: "PATCH",
                body: patch,
            }),

            async onQueryStarted({id, ...patch}, {queryFulfilled}) {
                // Get the current item from Dexie to preserve existing data (like inventory)
                const existingItem = await localDb.menuItems.get(id);

                if (existingItem) {
                    // Apply the patch to Dexie immediately
                    await localDb.menuItems.update(id, {
                        ...patch,
                        // If online, use a temporary status so SyncProvider ignores it
                        syncStatus: navigator.onLine ? localSyncStatusEnum.SYNCING : localSyncStatusEnum.PENDING
                    });
                }

                try {
                    const {data: updatedItem} = await queryFulfilled;

                    // Sync successful: Update with fresh data from server (e.g., new SKU)
                    await localDb.menuItems.update(id, {
                        ...updatedItem,
                        syncStatus: localSyncStatusEnum.SYNCED
                    });
                } catch {
                    // Offline/Error: Leave it as PENDING.
                    // The SyncProvider needs to be updated to handle PATCH as well.
                    console.log("Update saved locally. Will sync later.");
                }
            },
            invalidatesTags: (_result, _error, {id}) => [
                {type: "MenuItem", id},
                {type: "MenuItem", id: "LIST"},
            ],
        }),

        // -------------------------
        // User Management Endpoints
        // -------------------------
        getAllUsers: builder.query<UserType[], void>({
            query: () => "/users",
            providesTags: (result) =>
                result
                    ? [...result.map(({id}) => ({type: "User" as const, id})), {type: "User", id: "LIST"}]
                    : [{type: "User", id: "LIST"}],
        }),
        createUser: builder.mutation<UserType, CreateUserType>({
            query: (newUser) => ({
                url: "/users/create",
                method: "POST",
                body: newUser,
            }),
            invalidatesTags: [{type: "User", id: "LIST"}],
        }),
        getUserById: builder.query<UserType, string>({
            query: (id) => `/users/${id}`,
            providesTags: (_result, _error, id) => [{type: "User", id}],
        }),
        deleteUser: builder.mutation<{ message: string }, string>({
            query: (id) => ({
                url: `/users/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: [{type: "User", id: "LIST"}],
        }),
        updateUser: builder.mutation<UserType, Partial<UserType> & Pick<UserType, "id">>({
            query: ({id, ...patch}) => ({
                url: `/users/${id}`,
                method: "PATCH",
                body: patch,
            }),
            invalidatesTags: (_result, _error, {id}) => [
                {type: "User", id},
                {type: "User", id: "LIST"},
            ],
        }),
        
        updatePassword: builder.mutation<{ message: string }, Omit<UpdatePasswordType, "confirmNewPassword">>({
            query: (body) => ({
                url: "/users/update-password",
                method: "PATCH",
                body,
            }),
        }),

        changeUserStore: builder.mutation<UserType, { id: string; newStoreId: string }>({
            query: ({id, newStoreId}) => ({
                url: `/users/${id}/change-store`,
                method: "PATCH",
                body: {newStoreId},
            }),
            invalidatesTags: (_result, _error, {id}) => [
                {type: "User", id},
                {type: "User", id: "LIST"},
            ],
        }),

        // -------------------------
        // Store Endpoints
        // -------------------------
        getAllStores: builder.query<StoreType[], void>({
            query: () => "/stores",
            transformResponse: (response: PaginatedStoreResponse) => response.data,
            providesTags: (result) =>
                result
                    ? [...result.map(({id}) => ({type: "Store" as const, id})), {type: "Store", id: "LIST"}]
                    : [{type: "Store", id: "LIST"}],
        }),
        getStoreById: builder.query<StoreType, string>({
            query: (id) => `/stores/${id}`,
            providesTags: (_result, _error, id) => [{type: "Store", id}],
        }),
        createStore: builder.mutation<StoreType, CreateStoreType>({
            query: (newStore) => ({
                url: "/stores/create",
                method: "POST",
                body: newStore,
            }),
            invalidatesTags: [{type: "Store", id: "LIST"}],
        }),
        updateStore: builder.mutation<StoreType, Partial<StoreType> & Pick<StoreType, "id">>({
            query: ({id, ...patch}) => ({
                url: `/stores/${id}`,
                method: "PATCH",
                body: patch,
            }),
            invalidatesTags: (_result, _error, {id}) => [
                {type: "Store", id},
                {type: "Store", id: "LIST"},
            ],
        }),
        deleteStore: builder.mutation<{ message: string }, string>({
            query: (id) => ({
                url: `/stores/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: [{type: "Store", id: "LIST"}],
        }),

        // -------------------------
        // Inventory Endpoints
        // -------------------------
        getAllInventory: builder.query<InventoryType[], void>({
            query: () => "/inventory",

            // THE SEEDING LOGIC
            async onCacheEntryAdded(_arg, {cacheDataLoaded}) {
                try {
                    const {data} = await cacheDataLoaded;

                    if (data && data.length > 0) {
                        // Prepare data for Dexie
                        // Note: We ensure storeId is included for your useOfflineGoods hook filter
                        const localData = data.map(item => ({
                            ...item,
                            syncStatus: localSyncStatusEnum.SYNCED
                        }));

                        // bulkPut updates existing records by their primary key (menuItemId)
                        await localDb.inventory.bulkPut(localData);
                        console.log("Dexie Hydrated: Inventory (Goods) stored locally.");
                    }
                } catch (error) {
                    console.error("Failed to seed Dexie Inventory:", error);
                }
            },

            providesTags: (result) =>
                result
                    ? [...result.map(({menuItemId}) => ({type: "Inventory" as const, menuItemId})), {
                        type: "Inventory",
                        menuItemId: "LIST"
                    }]
                    : [{type: "Inventory", menuItemId: "LIST"}],
        }),

        getTransactionsByMenuItem: builder.query<InventoryTransactionType[], {
            menuItemId: string;
            startDate?: string;
            endDate?: string
        }>({
            query: ({menuItemId, ...params}) => ({
                url: `/inventory/transactions/${menuItemId}`,
                params,
            }),
            providesTags: (result) =>
                result
                    ? [...result.map(({id}) => ({
                        type: "SingleInventoryTransaction" as const,
                        id
                    })), {type: "SingleInventoryTransaction", id: "LIST"}]
                    : [{type: "SingleInventoryTransaction", id: "LIST"}],
        }),

        getInventoryTransactions: builder.query<InventoryTransactionResponseType, {
            timePeriod?: string;
            startDate?: string;
            endDate?: string
        }>({
            query: (params) => ({
                url: "/inventory/transactions",
                params,
            }),
            providesTags: ["InventoryTransactions"],
        }),

        getInventoryByMenuItem: builder.query<InventoryType, string>({
            query: (menuItemId) => `/inventory/${menuItemId}`,
            providesTags: (_result, _error, menuItemId) => [{type: "Inventory", id: menuItemId}],
        }),

        createInventoryRecord: builder.mutation<InventoryType, CreateInventoryType>({
            query: (body) => ({
                url: "/inventory/create",
                method: "POST",
                body,
            }),
            invalidatesTags: [{type: "Inventory", id: "LIST"}],
        }),

        adjustStock: builder.mutation<AdjustStockResponseType, AdjustStockType>({
            query: ({menuItemId, ...body}) => ({
                url: `/inventory/adjust-stock/${menuItemId}`,
                method: "PATCH",
                body,
            }),
            invalidatesTags: (_result, _error, {menuItemId}) => [
                {type: "Inventory", id: menuItemId},
                {type: "Inventory", id: "LIST"},
            ],
        }),

        discontinueInventory: builder.mutation<InventoryType, string>({
            query: (menuItemId) => ({
                url: `/inventory/discontinue/${menuItemId}`,
                method: "PATCH",
            }),
            invalidatesTags: (_result, _error, menuItemId) => [
                {type: "Inventory", id: menuItemId},
                {type: "Inventory", id: "LIST"},
            ],
        }),

        continueInventory: builder.mutation<InventoryType, string>({
            query: (menuItemId) => ({
                url: `/inventory/continue/${menuItemId}`,
                method: "PATCH",
            }),
            invalidatesTags: (_result, _error, menuItemId) => [
                {type: "Inventory", id: menuItemId},
                {type: "Inventory", id: "LIST"},
            ],
        }),

        deleteInventoryRecord: builder.mutation<{ message: string }, string>({
            query: (menuItemId) => ({
                url: `/inventory/${menuItemId}`,
                method: "DELETE",
            }),
            invalidatesTags: [{type: "Inventory", id: "LIST"}],
        }),

        getInventoryAlerts: builder.query<InventoryAlertType, void>({
            query: () => "/inventory/alerts",
            providesTags: ["InventoryAlerts"],
        }),

        // -------------------------
        // Unit of Measurement Endpoints
        // -------------------------
        getAllUnitOfMeasurements: builder.query<UnitOfMeasurementType[], void>({
            query: () => "/unit-of-measurement",
            providesTags: (result) =>
                result
                    ? [...result.map(({id}) => ({type: "UnitOfMeasurements" as const, id})), {
                        type: "UnitOfMeasurements",
                        id: "LIST"
                    }]
                    : [{type: "UnitOfMeasurements", id: "LIST"}],
        }),

        // -------------------------
        // Raw Material Endpoints
        // -------------------------
        getAllRawMaterials: builder.query<RawMaterialType[], void>({
            query: () => "/raw-materials",
            providesTags: (result) =>
                result
                    ? [...result.map(({id}) => ({type: "RawMaterials" as const, id})), {
                        type: "RawMaterials",
                        id: "LIST"
                    }]
                    : [{type: "RawMaterials", id: "LIST"}],
        }),

        getSingleRawMaterial: builder.query<RawMaterialType, string>({
            query: (id) => `/raw-materials/${id}`,
            providesTags: (_result, _error, id) => [{type: "RawMaterial", id}],
        }),

        createRawMaterial: builder.mutation<SingleRawMaterialType, CreateRawMaterialType>({
            query: (body) => ({
                url: "/raw-materials/create",
                method: "POST",
                body,
            }),
            invalidatesTags: [{type: "RawMaterials", id: "LIST"}],
        }),

        updateRawMaterial: builder.mutation<UpdateRawMaterialResponseType, Partial<UpdateRawMaterialType> & Pick<RawMaterialType, "id">>({
            query: ({id, ...patch}) => ({
                url: `/raw-materials/${id}`,
                method: "PATCH",
                body: patch,
            }),
            invalidatesTags: (_result, _error, {id}) => [
                {type: "RawMaterial", id},
                {type: "RawMaterials", id: "LIST"},
            ],
        }),

        deleteRawMaterial: builder.mutation<{ message: string }, string>({
            query: (id) => ({
                url: `/raw-materials/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: (_result, _error, id) => [
                {type: "RawMaterial", id},
                {type: "RawMaterials", id: "LIST"},
            ],
        }),

        getAllDeletedRawMaterials: builder.query<DeletedRawMaterialType[], void>({
            query: () => "/raw-materials/deleted",
            providesTags: (result) =>
                result
                    ? [...result.map(({id}) => ({type: "DeletedRawMaterials" as const, id})), {
                        type: "DeletedRawMaterials",
                        id: "LIST"
                    }]
                    : [{type: "DeletedRawMaterials", id: "LIST"}],
        }),

        recoverRawMaterial: builder.mutation<void, string>({
            query: (id) => ({
                url: `/raw-materials/${id}/recover`,
                method: "PATCH",
            }),
            invalidatesTags: (_result, _error, id) => [
                {type: "RawMaterial", id},
                {type: "RawMaterials", id: "LIST"},
                {type: "DeletedRawMaterials", id: "LIST"},
            ],
        }),

        // -------------------------
        // Raw Material Inventory Endpoints
        // -------------------------
        getAllRawMaterialInventory: builder.query<MultipleRawMaterialInventoryResponseType[], void>({
            query: () => "/raw-materials/inventory",
            providesTags: (result) =>
                result
                    ? [...result.map(({id}) => ({type: "RawMaterialInventories" as const, id})), {
                        type: "RawMaterialInventories",
                        id: "LIST"
                    }]
                    : [{type: "RawMaterialInventories", id: "LIST"}],
        }),

        getRawMaterialInventoryStock: builder.query<GetRawMaterialInventoryStockType, string>({
            query: (id) => `/raw-materials/inventory/${id}`,
            providesTags: (_result, _error, id) => [{type: "RawMaterialInventoryStock", id}],
        }),

        createRawMaterialInventory: builder.mutation<SingleRawMaterialInventoryType, CreateRawMaterialInventoryType>({
            query: (body) => ({
                url: `/raw-materials/inventory/create`,
                method: "POST",
                body,
            }),
            invalidatesTags: (_result, _error, {rawMaterialId}) => [
                {type: "RawMaterialInventory", id: rawMaterialId},
                {type: "RawMaterialInventories", id: "LIST"},
            ],
        }),

        updateRawMaterialInventory: builder.mutation<UpdateRawMaterialInventoryResponseType, UpdateRawMaterialInventoryType & Pick<RawMaterialType, "id">>({
            query: ({id, ...patch}) => ({
                url: `/raw-materials/inventory/${id}`,
                method: "PATCH",
                body: patch,
            }),
            invalidatesTags: (_result, _error, {id}) => [
                {type: "RawMaterialInventory", id},
                {type: "RawMaterialInventories", id: "LIST"},
            ],
        }),

        stockInRawMaterialInventory: builder.mutation<StockInRawMaterialInventoryType, StockInRawMaterialType & Pick<RawMaterialType, "id">>({
            query: ({id, ...body}) => ({
                url: `/raw-materials/inventory/${id}/stock-in`,
                method: "POST",
                body,
            }),
            invalidatesTags: (_result, _error, {id}) => [
                {type: "RawMaterialInventory", id},
                {type: "RawMaterialInventories", id: "LIST"},
                {type: "RawMaterialTransactions", id: "LIST"},
            ],
        }),

        getRawMaterialInventoryTransactions: builder.query<RawMaterialInventoryTransactionsResponse, {
            rawMaterialId?: string,
            timePeriod?: string;
            startDate?: string;
            endDate?: string
        }>({
            query: (params) => ({
                url: "/raw-materials/transactions",
                params,
            }),
            providesTags: ["RawMaterialTransactions"],
        }),

        // -------------------------
        // BOM Endpoints
        // -------------------------
        getBOM: builder.query<BomTypes[], string>({
            query: (menuItemId) => `/bill-of-materials/${menuItemId}/bom`,
            providesTags: ['BOM'],
        }),

        defineBOM: builder.mutation<void, DefineBomSchemaType & { menuItemId: string }>({
            query: ({menuItemId, bomItems}) => ({
                url: `/menu-items/${menuItemId}/bom`,
                method: 'POST',
                body: bomItems,
            }),
            invalidatesTags: ['BOM'],
        }),

        // -------------------------
        // Production Endpoints
        // -------------------------
        getProductionLogs: builder.query<ProductionType[], TimePeriod>({
            query: (timePeriod = "today") => ({
                url: "/production/logs",
                params: {timePeriod},
            }),

            providesTags: ["ProductionLogs"],
        }),

        getProductionWastageSummary: builder.query<ProductionWastageSummaryType[], void>({
            query: () => "/production/wastage/summary",

            providesTags: ["ProductionWastageSummary"],
        }),

        runProduction: builder.mutation<void, CreateProductionType>({
            query: (body) => ({
                url: '/production',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Inventory', 'RawMaterialInventories', "MenuItem", "ProductionLogs"],
        }),

        recordWastage: builder.mutation<void, CreateWastageType>({
            query: (body) => ({
                url: '/production/wastage',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['RawMaterialInventories', "RawMaterialTransactions", "RawMaterials"],
        }),

        getProductionSummary: builder.query<ProductionSummaryType, TimePeriod>({
            query: (timePeriod = "today") => ({
                url: "/production/summary",
                params: {timePeriod},
            }),
            providesTags: ["ProductionSummary"],
        }),

        // -------------------------
        // Category Endpoints
        // -------------------------
        getAllCategories: builder.query<CategoryType[], void>({
            query: () => "/categories",

            // THE SEEDING LOGIC
            async onCacheEntryAdded(_arg, {cacheDataLoaded}) {
                try {
                    // Wait for the first response to arrive from the backend
                    const {data} = await cacheDataLoaded;

                    if (data && data.length > 0) {
                        // Bulk save to Dexie.
                        // .bulkPut is better than .add because it updates existing records
                        const localData: LocalCategoryType[] = data.map(item => ({
                            ...item,
                            syncStatus: localSyncStatusEnum.SYNCED // Mark as already on server
                        }));

                        await localDb.categories.bulkPut(localData);
                        console.log("Dexie Hydrated: Categories stored locally.");
                    }
                } catch (error) {
                    console.error("Failed to seed Dexie:", error);
                }
            },

            providesTags: (result) =>
                result
                    ? [...result.map(({id}) => ({type: 'Category' as const, id})), {type: 'Category', id: 'LIST'}]
                    : [{type: 'Category', id: 'LIST'}],
        }),

        createCategory: builder.mutation<void, CreateCategoryType>({
            query: (body) => ({
                url: "/categories/create",
                method: "POST",
                body,
            }),
            invalidatesTags: [{type: 'Category', id: 'LIST'}],
        }),

        updateCategory: builder.mutation<void, Partial<CategoryType> & Pick<CategoryType, "id">>({
            query: ({id, ...patch}) => ({
                url: `/categories/${id}`,
                method: "PATCH",
                body: patch,
            }),
            invalidatesTags: (_result, _error, {id}) => [{type: "Category", id}, {type: 'Category', id: 'LIST'}],
        }),

        deleteCategory: builder.mutation<{ message: string }, string>({
            query: (id) => ({
                url: `/categories/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: (_result, _error, id) => [{type: "Category", id}, {type: 'Category', id: 'LIST'}],
        })

    }),
});

// Export auto-generated hooks for use in your components
export const {
    useHealthCheckQuery,

    // Auth hooks
    useLoginMutation,
    useLogoutMutation,
    useRegisterManagerAndStoreMutation,

    // Order hooks
    useGetOrdersByPeriodQuery,
    useGetOrderByIdQuery,
    useCreateOrderMutation,

    // Menu item hooks
    useGetMenuItemsQuery,
    useCreateMenuItemMutation,
    useDeleteMenuItemMutation,
    useUpdateMenuItemMutation,

    // Dashboard Hooks
    useGetSalesSummaryQuery,
    useGetTopSellsQuery,
    useGetSalesTrendQuery,
    useGetFinishedGoodsProfitMarginQuery,
    useGetInventoryValuationHealthQuery,

    // User Management Hooks
    useGetAllUsersQuery,
    useGetUserByIdQuery,
    useDeleteUserMutation,
    useCreateUserMutation,
    useUpdateUserMutation,
    useUpdatePasswordMutation,
    useChangeUserStoreMutation,

    // Store Management Hooks
    useGetAllStoresQuery,
    useGetStoreByIdQuery,
    useCreateStoreMutation,
    useUpdateStoreMutation,
    useDeleteStoreMutation,

    // Activity Log hooks
    useGetActivitiesQuery,

    // Inventory Hooks
    useGetAllInventoryQuery,
    useGetTransactionsByMenuItemQuery,
    useGetInventoryTransactionsQuery,
    useCreateInventoryRecordMutation,
    useAdjustStockMutation,
    useDiscontinueInventoryMutation,
    useContinueInventoryMutation,
    useDeleteInventoryRecordMutation,
    useGetInventoryAlertsQuery,

    // Unit of Measurement Hooks
    useGetAllUnitOfMeasurementsQuery,

    // Raw Material Hooks
    useGetAllRawMaterialsQuery,
    useCreateRawMaterialMutation,
    useGetSingleRawMaterialQuery,
    useUpdateRawMaterialMutation,
    useDeleteRawMaterialMutation,
    useGetAllDeletedRawMaterialsQuery,
    useRecoverRawMaterialMutation,

    // Raw Material Inventory Hooks
    useGetAllRawMaterialInventoryQuery,
    useCreateRawMaterialInventoryMutation,
    useUpdateRawMaterialInventoryMutation,
    useGetRawMaterialInventoryStockQuery,
    useStockInRawMaterialInventoryMutation,
    useGetRawMaterialInventoryTransactionsQuery,

    // BOM Hooks
    useGetBOMQuery,
    useDefineBOMMutation,

    // Production Hooks
    useGetProductionLogsQuery,
    useGetProductionWastageSummaryQuery,
    useRunProductionMutation,
    useRecordWastageMutation,
    useGetProductionSummaryQuery,

    // Category Hooks
    useGetAllCategoriesQuery,
    useCreateCategoryMutation,
    useUpdateCategoryMutation,
    useDeleteCategoryMutation

} = apiSlice;
