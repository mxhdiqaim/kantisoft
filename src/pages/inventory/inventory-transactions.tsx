import {Box, Chip, Grid, Typography} from "@mui/material";
import {useGetInventoryTransactionsQuery} from "@/store/slice";
import type {GridColDef} from "@mui/x-data-grid";
import {useEffect, useMemo, useState} from "react";
import TableStyledBox from "@/components/ui/data-grid-table/table-styled-box.tsx";
import DataGridTable from "@/components/ui/data-grid-table";
import {camelCaseToTitleCase} from "@/utils";
import {useForm} from "react-hook-form";
import {yupResolver} from "@hookform/resolvers/yup";
import {filterSchema, type TimePeriod} from "@/types";
import {getTransactionChipColor, getTransactionTypeChipColor} from "@/components/ui";
import {useMemoizedArray} from "@/hooks/use-memoized-array.ts";
import {useSearch} from "@/use-search.ts";
import TableSearchActions from "@/components/ui/data-grid-table/table-search-action.tsx";
import PeriodSelector from "@/components/ui/period-selector.tsx";
import {getApiError} from "@/helpers/get-api-error.ts";
import ApiErrorDisplay from "@/components/feedback/api-error-display.tsx";
import useNotifier from "@/hooks/useNotifier.ts";

const InventoryTransactions = () => {
    const notify = useNotifier();
    const {control, watch} = useForm<{ timePeriod: TimePeriod }>({
        mode: "onChange",
        resolver: yupResolver(filterSchema),
        defaultValues: {
            timePeriod: "today",
        },
    });

    const period = watch("timePeriod");

    const {
        data,
        isLoading,
        isError,
        fulfilledTimeStamp,
        error
    } = useGetInventoryTransactionsQuery({timePeriod: period});

    const memoizedData = useMemoizedArray(data?.transactions);

    const {searchControl, searchSubmit, handleSearch, filteredData} = useSearch({
        initialData: memoizedData,
        searchKeys: ["type", "label"],
    });

    const [lastFetched, setLastFetched] = useState<Date | null>(null);

    const columns: GridColDef[] = useMemo(() => [
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
                        sx={{textTransform: "capitalize"}}
                    />
                </TableStyledBox>
            ),
        },
        {
            flex: 1,
            field: "totalChange",
            headerName: "Value Change",
            minWidth: 150,
            align: "left",
            headerAlign: "left",
            renderCell: (params) => (
                <TableStyledBox>
                    <Chip
                        label={params.value}
                        color={getTransactionChipColor(params.value)}
                        size="small"
                        sx={{textTransform: "capitalize"}}
                    />
                </TableStyledBox>
            ),
        },
        {
            flex: 1,
            field: "label",
            headerName: "Label",
            type: "number",
            minWidth: 120,
            align: "left",
            headerAlign: "left",
            renderCell: (params) => (
                <TableStyledBox>
                    <Typography variant="body2">{params.value}</Typography>
                </TableStyledBox>
            ),
        }
    ], []);

    useEffect(() => {
        if (fulfilledTimeStamp) {
            setLastFetched(new Date(fulfilledTimeStamp));
        }
    }, [fulfilledTimeStamp]);

    if (isError) {
        notify(` Failed to load transactions. Please try again later.`, "error");
        const apiError = getApiError(error, `Failed to load transactions.`);
        return <ApiErrorDisplay statusCode={apiError.type} message={apiError.message}/>;
    }

    return (
        <Box sx={{mx: "auto"}}>
            <Box sx={{display: "flex", justifyContent: "space-between"}}>
                <Typography variant={"h4"}>Inventory Transactions</Typography>
                <PeriodSelector
                    control={control}
                    name={"timePeriod"}
                    lastFetched={lastFetched}
                />
            </Box>

            <TableSearchActions
                searchControl={searchControl}
                searchSubmit={searchSubmit}
                handleSearch={handleSearch}
                placeholder={"Search by type or label"}
            />

            <Grid container spacing={2}>
                <Grid size={12}>
                    <DataGridTable data={filteredData} columns={columns} loading={isLoading}/>
                </Grid>
            </Grid>
        </Box>
    );
};

export default InventoryTransactions;