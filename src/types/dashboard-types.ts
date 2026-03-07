import * as yup from "yup";
import {type Period as TimePeriod} from "@/types/order-types.ts";

export type OrderByType = "quantity" | "revenue";

export const salesSummarySchema = yup.object({
    avgOrderValue: yup.number().default(0),
    totalOrders: yup.number().default(0),
    totalRevenue: yup.number().default(0),
});

export type SaleSummarySchemaType = yup.InferType<typeof salesSummarySchema>;

export type TopSellsParamType = {
    timePeriod?: TimePeriod;
    limit?: number;
    orderBy?: OrderByType;
    startDate?: string;
    endDate?: string;
};

export type TopSellsItemType = {
    itemId: string;
    itemName: string;
    totalQuantitySold: number;
    totalRevenueGenerated: string;
};

type OutOfStockType = {
    id: string;
    name: string;
    currentStock: number;
    threshold: number;
    status: string;
    storeId: string;
}

type LowStockType = {
    id: string;
    name: string;
    currentStock: number;
    threshold: number;
    status: string;
    storeId: string;
}

export type InventoryAlertType = {
    rawMaterials: {
        outOfStock: OutOfStockType[];
        lowStock: LowStockType[];
        total: number;
    };
    menuItems: {
        outOfStock: OutOfStockType[];
        lowStock: LowStockType[];
        total: number;
    };
    timestamp: string;
    storeQueryType: string;
    totalAlertCount: number;
};

export type SalesTrendType = {
    date: string;
    dailyRevenue: number;
    dailyOrders: number;
};
