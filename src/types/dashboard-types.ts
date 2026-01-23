import {type Period as TimePeriod} from "@/types/order-types.ts";
import * as yup from "yup";
import {timePeriodSchema} from "@/types/index.ts";

export type OrderByType = "quantity" | "revenue";

export const salesSummarySchema = yup.object({
    avgOrderValue: yup.number().default(0),
    totalOrders: yup.number().default(0),
    totalRevenue: yup.number().default(0),
});

export const filterSchema = yup.object({
    period: timePeriodSchema,
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

//     "rawMaterials": {
//     "outOfStock": [],
//         "lowStock": [],
//         "total": 0
//      },
//     "menuItems": {
//     "outOfStock": [],
//         "lowStock": [
//         {
//             "id": "2742949f-5724-47e8-9b6c-b08fc93e2e1a",
//             "name": "Jellof Rice",
//             "currentStock": 5,
//             "threshold": 10,
//             "status": "lowStock",
//             "storeId": "804a4478-898b-4a8e-9209-12e5d56359f0"
//         }
//     ],
//         "total": 1
//      },
//     "timestamp": "2026-01-23T12:06:37.381Z",
//     "storeQueryType": "Targeted Store",
//     "totalAlertCount": 1

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
