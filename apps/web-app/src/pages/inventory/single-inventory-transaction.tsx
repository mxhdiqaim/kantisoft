import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, Chip, CircularProgress, Grid, Typography } from "@mui/material";
import { useGetAllInventoryQuery, useGetTransactionsByMenuItemQuery } from "@/store/slice";
import type { GridColDef } from "@mui/x-data-grid";
import { ArrowBackIosNewOutlined } from "@mui/icons-material";
import {
    getTransactionChipColor,
    DataGridTable,
    StyledBoxTable,
    CustomButton,
    SearchActionTable,
} from "@/shared/components";
import { useMemoizedArray } from "@/hooks/use-memoized-array.ts";
import { parseApiError, relativeTime } from "@/shared/utils";
import { useNotification } from "@/shared/hooks";
import ApiErrorDisplay from "@/components/feedback/api-error-display.tsx";
import { useSearch } from "@/use-search.ts";

const SingleInventoryTransaction = () => {
    const { error: errorMessage } = useNotification();
    const { id: menuItemId } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const {
        data: transactions,
        isLoading,
        isFetching,
        isError,
        error,
    } = useGetTransactionsByMenuItemQuery({ menuItemId: menuItemId! }, { skip: !menuItemId });

    const memoizedTransactions = useMemoizedArray(transactions);

    const { searchControl, searchSubmit, handleSearch, filteredData } = useSearch({
        initialData: memoizedTransactions,
        searchKeys: ["transactionType", "notes", "transactionDate"],
    });

    const { data: inventoryData, isLoading: isLoadingInventory } = useGetAllInventoryQuery();

    const inventoryItem = useMemo(() => {
        return inventoryData?.find((item) => item.menuItemId === menuItemId);
    }, [inventoryData, menuItemId]);

    const columns: GridColDef[] = useMemo(
        () => [
            {
                flex: 1,
                field: "menuItem",
                headerName: "Menu Items",
                minWidth: 150,
                align: "left",
                headerAlign: "left",
                renderCell: (params) => (
                    <StyledBoxTable>
                        <Typography variant="body2">{params.value.name}</Typography>
                    </StyledBoxTable>
                ),
            },
            {
                flex: 1,
                field: "transactionType",
                headerName: "Type",
                minWidth: 150,
                align: "left",
                headerAlign: "left",
                renderCell: (params) => (
                    <StyledBoxTable>
                        <Chip
                            label={params.value.replace(/([A-Z])/g, " $1").trim()}
                            color={getTransactionChipColor(params.value)}
                            size="small"
                            sx={{ textTransform: "capitalize" }}
                        />
                    </StyledBoxTable>
                ),
            },
            {
                flex: 1,
                field: "quantityChange",
                headerName: "QTY Change",
                type: "number",
                minWidth: 120,
                align: "left",
                headerAlign: "left",
                renderCell: (params) => (
                    <StyledBoxTable>
                        <Typography variant="body2" color={params.value > 0 ? "success.main" : "error.main"}>
                            {params.value}
                        </Typography>
                    </StyledBoxTable>
                ),
            },
            {
                flex: 1,
                field: "resultingQuantity",
                headerName: "New QTY",
                type: "number",
                minWidth: 120,
                align: "left",
                headerAlign: "left",
                renderCell: (params) => (
                    <StyledBoxTable>
                        <Typography variant="body2" color={params.value > 0 ? "success.main" : "error.main"}>
                            {params.value}
                        </Typography>
                    </StyledBoxTable>
                ),
            },
            {
                flex: 1,
                field: "performedByUser",
                headerName: "Performed By",
                minWidth: 150,
                align: "left",
                headerAlign: "left",
                renderCell: (params) => (
                    <StyledBoxTable>
                        <Typography variant="body2">{`${params.value.firstName} ${params.value.lastName}`}</Typography>
                    </StyledBoxTable>
                ),
            },
            {
                flex: 1,
                field: "transactionDate",
                headerName: "Transaction Date",
                minWidth: 150,
                align: "left",
                headerAlign: "left",
                renderCell: (params) => (
                    <StyledBoxTable>
                        <Typography variant="body2">{relativeTime(new Date(params.value))}</Typography>
                    </StyledBoxTable>
                ),
            },
            {
                field: "notes",
                headerName: "Notes",
                flex: 2,
                minWidth: 200,
                align: "left",
                headerAlign: "left",
                renderCell: (params) => (
                    <StyledBoxTable>
                        <Typography variant="body2">{params.value || "N/A"}</Typography>
                    </StyledBoxTable>
                ),
            },
        ],
        [],
    );

    if (!menuItemId) {
        return <Typography color="error">Menu Item ID is missing.</Typography>;
    }

    if (isError) {
        errorMessage(`Failed to load transactions. Please try again later.`);
        const apiError = parseApiError(error, `Failed to load transactions.`);
        return <ApiErrorDisplay statusCode={apiError.statusCode} message={apiError.message} />;
    }

    return (
        <>
            {/*<AppBreadcrumbs/>*/}
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <CustomButton
                    title={"Go Back"}
                    variant="outlined"
                    size="small"
                    onClick={() => navigate(-1)}
                    startIcon={<ArrowBackIosNewOutlined fontSize="small" sx={{ height: 16, mr: 0.5 }} />}
                />
                <Box sx={{ textAlign: "right" }}>
                    <Typography variant="h4" component="h1">
                        Transaction History
                    </Typography>
                    {isLoadingInventory ? (
                        <CircularProgress size={25} />
                    ) : (
                        <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 3 }}>
                            {inventoryItem?.menuItem.name} (SKU: {inventoryItem?.menuItem.sku})
                        </Typography>
                    )}
                </Box>
            </Box>

            <SearchActionTable
                searchControl={searchControl}
                searchSubmit={searchSubmit}
                handleSearch={handleSearch}
                placeholder={"Search by Transaction Type or notes"}
            />

            <Grid container spacing={2}>
                <Grid size={12}>
                    <DataGridTable data={filteredData} columns={columns} loading={isLoading || isFetching} />
                </Grid>
            </Grid>
        </>
    );
};

export default SingleInventoryTransaction;
