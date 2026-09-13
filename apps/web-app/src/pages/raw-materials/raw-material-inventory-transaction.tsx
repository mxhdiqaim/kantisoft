import { Box, Chip, FormControl, Grid, InputAdornment, MenuItem, Typography, useTheme } from "@mui/material";
import { useGetAllRawMaterialsQuery, useGetRawMaterialInventoryTransactionsQuery } from "@/store/slice";
import type { GridColDef } from "@mui/x-data-grid";
import { useEffect, useMemo, useState } from "react";
import {
    StyledBoxTable,
    DataGridTable,
    SearchActionTable,
    getTransactionTypeChipColor,
    StyledTextField,
    IconUtil,
} from "@/shared/components";
import { camelCaseToTitleCase, formatNumber, formatDateTimeCustom, parseApiError } from "@/shared/utils";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useMemoizedArray } from "@/hooks/use-memoized-array.ts";
import { useSearch } from "@/use-search.ts";
import {
    fetchRawMaterialAndFilterByPeriod,
    type FetchRawMaterialAndFilterByPeriodType,
} from "@/types/raw-material-types.ts";
import PeriodSelector from "@/shared/components/ui/period-selector.tsx";
import ApiErrorDisplay from "@/components/feedback/api-error-display.tsx";
import { useNotification } from "@/shared/hooks";

import ArrowDownIconSvg from "@/assets/icons/arrow-down.svg";

const RawMaterialInventoryTransaction = () => {
    const theme = useTheme();
    const { error: errorMessage } = useNotification();

    const {
        control,
        watch,
        formState: { errors },
    } = useForm<FetchRawMaterialAndFilterByPeriodType>({
        mode: "onChange",
        defaultValues: {
            timePeriod: "today",
            rawMaterialId: "",
        },

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        resolver: yupResolver(fetchRawMaterialAndFilterByPeriod),
    });

    const period = watch("timePeriod");
    const rawMaterialId = watch("rawMaterialId");

    const { data, isLoading, isFetching, isError, fulfilledTimeStamp, error } =
        useGetRawMaterialInventoryTransactionsQuery({ timePeriod: period, rawMaterialId });
    const memoizedData = useMemoizedArray(data?.transactions);

    const { searchControl, searchSubmit, handleSearch, filteredData } = useSearch({
        initialData: memoizedData,
        searchKeys: ["reference", "source", "type", "notes"],
    });

    const { data: rawMaterialData, isLoading: isFetchingRawMaterial } = useGetAllRawMaterialsQuery();
    const memoizedRawMaterial = useMemoizedArray(rawMaterialData);

    const [lastFetched, setLastFetched] = useState<Date | null>(null);

    const columns: GridColDef[] = useMemo(
        () => [
            {
                flex: 1,
                field: "reference",
                headerName: "Reference",
                minWidth: 200,
                align: "left",
                headerAlign: "left",
                renderCell: (params) => (
                    <StyledBoxTable>
                        <Typography variant="body2">{params.value}</Typography>
                    </StyledBoxTable>
                ),
            },
            {
                flex: 1,
                field: "type",
                headerName: "Type",
                minWidth: 120,
                align: "left",
                headerAlign: "left",
                renderCell: (params) => (
                    <StyledBoxTable>
                        <Chip
                            label={camelCaseToTitleCase(params.value)}
                            color={getTransactionTypeChipColor(params.value)}
                            size="small"
                            sx={{ textTransform: "capitalize" }}
                        />
                    </StyledBoxTable>
                ),
            },
            {
                flex: 1,
                field: "rawMaterialName",
                headerName: "Raw Material",
                minWidth: 180,
                align: "left",
                headerAlign: "left",
                renderCell: (params) => (
                    <StyledBoxTable>
                        <Typography variant="body2">{params.value}</Typography>
                    </StyledBoxTable>
                ),
            },
            {
                flex: 1,
                field: "quantity",
                headerName: "Quantity",
                type: "number",
                minWidth: 100,
                align: "left",
                headerAlign: "left",
                renderCell: (params) => (
                    <StyledBoxTable>
                        <Typography variant="body2">
                            {formatNumber(params.value)} ({params.row.unitSymbol})
                        </Typography>
                    </StyledBoxTable>
                ),
            },
            {
                flex: 1,
                field: "source",
                headerName: "Source",
                minWidth: 180,
                align: "left",
                headerAlign: "left",
                renderCell: (params) => (
                    <StyledBoxTable>
                        <Chip
                            label={camelCaseToTitleCase(params.value)}
                            color={getTransactionTypeChipColor(params.value)}
                            size="small"
                            sx={{ textTransform: "capitalize" }}
                        />
                    </StyledBoxTable>
                ),
            },
            {
                flex: 1,
                field: "performedBy",
                headerName: "Performed By",
                minWidth: 180,
                align: "left",
                headerAlign: "left",
                renderCell: (params) => (
                    <StyledBoxTable>
                        <Typography variant="body2">{params.value}</Typography>
                    </StyledBoxTable>
                ),
            },
            {
                flex: 1,
                field: "transactionDate",
                headerName: "Date",
                minWidth: 200,
                align: "left",
                headerAlign: "left",
                renderCell: (params) => (
                    <StyledBoxTable>
                        <Typography variant="body2">{formatDateTimeCustom(params.value)}</Typography>
                    </StyledBoxTable>
                ),
            },
            {
                flex: 1,
                field: "notes",
                headerName: "Notes",
                minWidth: 220,
                align: "left",
                headerAlign: "left",
                renderCell: (params) => (
                    <StyledBoxTable>
                        <Typography variant="body2">{params.value}</Typography>
                    </StyledBoxTable>
                ),
            },
            // {
            //     field: "actions",
            //     headerName: "",
            //     width: 60,
            //     align: "center",
            //     headerAlign: "center",
            //     sortable: false,
            //     renderCell: (params) => (
            //         <CustomButton
            //             variant={"text"}
            //             sx={{
            //                 borderRadius: "10px",
            //                 color: theme.palette.text.primary,
            //             }}
            //             onClick={(e) => handleMenuClick(e, params.row)}
            //             startIcon={
            //                 <Tooltip title="More Actions" placement={"top"}>
            //                     <MoreVertIcon/>
            //                 </Tooltip>
            //             }
            //         >
            //             <TableStyledMenuItem
            //                 // onClick={handleOpenAdjustStockModal}
            //             >
            //                 Adjust Stock
            //             </TableStyledMenuItem>
            //         </CustomButton>
            //     ),
            // },
        ],
        [theme],
    );

    useEffect(() => {
        if (fulfilledTimeStamp) {
            setLastFetched(new Date(fulfilledTimeStamp));
        }
    }, [fulfilledTimeStamp]);

    if (isError) {
        errorMessage(`Failed to load Transactions. Please try again later.`);
        const apiError = parseApiError(error, `Failed to load Transactions.`);
        return <ApiErrorDisplay statusCode={apiError.statusCode} message={apiError.message} />;
    }

    return (
        <Box sx={{ mx: "auto" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Typography variant={"h4"}>Transactions</Typography>
                </Box>
                <PeriodSelector control={control} name={"timePeriod"} lastFetched={lastFetched} />
            </Box>
            <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 8 }}>
                    <SearchActionTable
                        searchControl={searchControl}
                        searchSubmit={searchSubmit}
                        handleSearch={handleSearch}
                        placeholder={"Search by reference, type, source or notes"}
                    />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }} sx={{ justifyContent: "center", display: "flex", alignItems: "center" }}>
                    <Controller
                        name="rawMaterialId"
                        control={control}
                        render={({ field }) => (
                            <FormControl fullWidth>
                                <StyledTextField
                                    {...field}
                                    select
                                    label="Raw Material"
                                    placeholder="Select Raw Material"
                                    disabled={isFetchingRawMaterial}
                                    SelectProps={{
                                        IconComponent: () => null,
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconUtil
                                                    src={ArrowDownIconSvg}
                                                    alt={"Dropdown Arrow"}
                                                    sx={{ width: 15, height: 15 }}
                                                />
                                            </InputAdornment>
                                        ),
                                    }}
                                    error={Boolean(errors.rawMaterialId)}
                                    helperText={errors.rawMaterialId?.message}
                                >
                                    <MenuItem value={""} disabled>
                                        Select Raw Material
                                    </MenuItem>
                                    <MenuItem value={"all"}>All materials</MenuItem>
                                    {memoizedRawMaterial?.map((rawMaterial) => (
                                        <MenuItem
                                            key={rawMaterial.id}
                                            value={rawMaterial.id}
                                            sx={{ textTransform: "capitalize" }}
                                        >
                                            {rawMaterial.name}
                                        </MenuItem>
                                    ))}
                                </StyledTextField>
                            </FormControl>
                        )}
                    />
                </Grid>
            </Grid>

            <Grid container spacing={2}>
                <Grid size={12}>
                    <DataGridTable data={filteredData} columns={columns} loading={isLoading || isFetching} />
                </Grid>
            </Grid>
        </Box>
    );
};

export default RawMaterialInventoryTransaction;
