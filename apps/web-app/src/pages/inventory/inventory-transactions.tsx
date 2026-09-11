import { Box, Chip, Grid, Typography } from "@mui/material";
import { useGetInventoryTransactionsQuery } from "@/store/slice";
import type { GridColDef } from "@mui/x-data-grid";
import { useEffect, useMemo, useState } from "react";
import TableStyledBox from "@/shared/components/ui/data-grid-table/table-styled-box.tsx";
import DataGridTable from "@/shared/components/ui/data-grid-table";
import { camelCaseToTitleCase } from "@/shared/utils";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { filterSchema, type FilterSchemaType } from "@/shared/types";
import { getTransactionChipColor, getTransactionTypeChipColor } from "@/shared/components/ui";
import { useMemoizedArray } from "@/hooks/use-memoized-array.ts";
import { useSearch } from "@/use-search.ts";
import TableSearchActions from "@/shared/components/ui/data-grid-table/table-search-action.tsx";
import PeriodSelector from "@/shared/components/ui/period-selector.tsx";
import { parseApiErrorUtil } from "@/shared/utils/parse-api-error.util.ts";
import ApiErrorDisplay from "@/components/feedback/api-error-display.tsx";
import { useNotification } from "@/shared";
import { formatRelativeDateTime } from "@/shared/utils/get-relative-time.ts";

const InventoryTransactions = () => {
    const { error: errorMessage } = useNotification();

    const { control, watch } = useForm<FilterSchemaType>({
        mode: "onChange",
        defaultValues: {
            timePeriod: "today",
        },

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        resolver: yupResolver(filterSchema),
    });

    const period = watch("timePeriod");

    const { data, isLoading, isFetching, isError, fulfilledTimeStamp, error } = useGetInventoryTransactionsQuery({
        timePeriod: period,
    });

    const memoizedData = useMemoizedArray(data?.transactions);

    const { searchControl, searchSubmit, handleSearch, filteredData } = useSearch({
        initialData: memoizedData,
        searchKeys: ["type", "label"],
    });

    const [lastFetched, setLastFetched] = useState<Date | null>(null);

    const columns: GridColDef[] = useMemo(
        () => [
            {
                flex: 1,
                field: "itemName",
                headerName: "Item Name",
                minWidth: 180,
                align: "left",
                headerAlign: "left",
                renderCell: (params) => (
                    <TableStyledBox>
                        <Typography variant="body2">{params.value}</Typography>
                    </TableStyledBox>
                ),
            },
            {
                flex: 1,
                field: "quantity",
                headerName: "Quantity",
                minWidth: 120,
                align: "left",
                headerAlign: "left",
                renderCell: (params) => (
                    <TableStyledBox>
                        <Chip
                            label={params.value}
                            color={getTransactionChipColor(params.value)}
                            size="small"
                            sx={{ textTransform: "capitalize" }}
                        />
                    </TableStyledBox>
                ),
            },
            {
                flex: 1,
                field: "type",
                headerName: "Transaction Type",
                minWidth: 180,
                align: "left",
                headerAlign: "left",
                renderCell: (params) => (
                    <TableStyledBox>
                        <Chip
                            label={camelCaseToTitleCase(params.value)}
                            color={getTransactionTypeChipColor(params.value)}
                            size="small"
                            sx={{ textTransform: "capitalize" }}
                        />
                    </TableStyledBox>
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
                    <TableStyledBox>
                        <Typography variant="body2">{formatRelativeDateTime(params.value)}</Typography>
                    </TableStyledBox>
                ),
            },
            {
                flex: 1,
                field: "performedBy",
                headerName: "Performed By",
                minWidth: 150,
                align: "left",
                headerAlign: "left",
                renderCell: (params) => (
                    <TableStyledBox>
                        <Typography variant="body2">{params.value}</Typography>
                    </TableStyledBox>
                ),
            },
            {
                flex: 1,
                field: "storeName",
                headerName: "Store Name",
                minWidth: 150,
                align: "left",
                headerAlign: "left",
                renderCell: (params) => (
                    <TableStyledBox>
                        <Typography variant="body2">{params.value}</Typography>
                    </TableStyledBox>
                ),
            },
            {
                flex: 1,
                field: "label",
                headerName: "Label",
                minWidth: 220,
                align: "left",
                headerAlign: "left",
                renderCell: (params) => (
                    <TableStyledBox>
                        <Typography variant="body2">{params.value}</Typography>
                    </TableStyledBox>
                ),
            },
            {
                flex: 1,
                field: "notes",
                headerName: "Notes",
                minWidth: 250,
                align: "left",
                headerAlign: "left",
                renderCell: (params) => (
                    <TableStyledBox>
                        <Typography variant="body2">{params.value}</Typography>
                    </TableStyledBox>
                ),
            },
        ],
        [],
    );

    useEffect(() => {
        if (fulfilledTimeStamp) {
            setLastFetched(new Date(fulfilledTimeStamp));
        }
    }, [fulfilledTimeStamp]);

    if (isError) {
        errorMessage(`Failed to load transactions. Please try again later.`);
        const apiError = parseApiErrorUtil(error, `Failed to load transactions.`);
        return <ApiErrorDisplay statusCode={apiError.statusCode} message={apiError.message} />;
    }

    return (
        <Box sx={{ mx: "auto" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant={"h4"}>Transactions</Typography>
                <PeriodSelector control={control} name={"timePeriod"} lastFetched={lastFetched} />
            </Box>

            <TableSearchActions
                searchControl={searchControl}
                searchSubmit={searchSubmit}
                handleSearch={handleSearch}
                placeholder={"Search by type or label"}
            />

            <Grid container spacing={2}>
                <Grid size={12}>
                    <DataGridTable data={filteredData} columns={columns} loading={isLoading || isFetching} />
                </Grid>
            </Grid>
        </Box>
    );
};

export default InventoryTransactions;
