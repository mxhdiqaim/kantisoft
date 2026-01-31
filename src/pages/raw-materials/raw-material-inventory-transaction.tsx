import {Box, Chip, FormControl, Grid, InputAdornment, MenuItem, Typography, useTheme} from "@mui/material";
import {useGetAllRawMaterialsQuery, useGetRawMaterialInventoryTransactionsQuery} from "@/store/slice";
import type {GridColDef} from "@mui/x-data-grid";
import {useEffect, useMemo, useState} from "react";
import TableStyledBox from "@/components/ui/data-grid-table/table-styled-box.tsx";
import {camelCaseToTitleCase, formatNumber} from "@/utils";
import {getTransactionTypeChipColor, StyledTextField} from "@/components/ui";
import {formatDateTimeCustom} from "@/utils/get-relative-time.ts";
import DataGridTable from "@/components/ui/data-grid-table";
import {Controller, useForm} from "react-hook-form";
import {type TimePeriod} from "@/types";
import {yupResolver} from "@hookform/resolvers/yup";
import {useMemoizedArray} from "@/hooks/use-memoized-array.ts";
import {useSearch} from "@/use-search.ts";
import TableSearchActions from "@/components/ui/data-grid-table/table-search-action.tsx";
import {fetchRawMaterialAndFilterByPeriod} from "@/types/raw-material-types.ts";
import PeriodSelector from "@/components/ui/period-selector.tsx";
import {getApiError} from "@/helpers/get-api-error.ts";
import ApiErrorDisplay from "@/components/feedback/api-error-display.tsx";
import useNotifier from "@/hooks/useNotifier.ts";

import Icon from "@/components/ui/icon.tsx";
import ArrowDownIconSvg from "@/assets/icons/arrow-down.svg";

type FormValues = {
    timePeriod: TimePeriod;
    rawMaterialId: string;
};

const RawMaterialInventoryTransaction = () => {
    const theme = useTheme();
    const notify = useNotifier();

    const {
        control,
        watch,
        formState: {errors},
    } = useForm<FormValues>({
        mode: "onChange",
        defaultValues: {
            timePeriod: "today",
            rawMaterialId: "",
        },

        resolver: yupResolver(fetchRawMaterialAndFilterByPeriod),
    });

    const period = watch("timePeriod");
    const rawMaterialId = watch("rawMaterialId");

    const {
        data,
        isLoading,
        isFetching,
        isError,
        fulfilledTimeStamp,
        error,
    } = useGetRawMaterialInventoryTransactionsQuery({timePeriod: period, rawMaterialId});
    const memoizedData = useMemoizedArray(data?.transactions);

    const {searchControl, searchSubmit, handleSearch, filteredData} = useSearch({
        initialData: memoizedData,
        searchKeys: ["reference", "source", "type", "notes"],
    });

    const {data: rawMaterialData, isLoading: isFetchingRawMaterial} = useGetAllRawMaterialsQuery();
    const memoizedRawMaterial = useMemoizedArray(rawMaterialData);

    const [lastFetched, setLastFetched] = useState<Date | null>(null);

    const columns: GridColDef[] = useMemo(() => [
        {
            flex: 1,
            field: "reference",
            headerName: "Reference",
            minWidth: 200,
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
            field: "type",
            headerName: "Type",
            minWidth: 120,
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
            field: "rawMaterialName",
            headerName: "Raw Material",
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
            type: "number",
            minWidth: 100,
            align: "left",
            headerAlign: "left",
            renderCell: (params) => (
                <TableStyledBox>
                    <Typography variant="body2">{formatNumber(params.value)} ({params.row.unitSymbol})</Typography>
                </TableStyledBox>
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
            field: "performedBy",
            headerName: "Performed By",
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
            field: "transactionDate",
            headerName: "Date",
            minWidth: 200,
            align: "left",
            headerAlign: "left",
            renderCell: (params) => (
                <TableStyledBox>
                    <Typography variant="body2">{formatDateTimeCustom(params.value)}</Typography>
                </TableStyledBox>
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
                <TableStyledBox>
                    <Typography variant="body2">{params.value}</Typography>
                </TableStyledBox>
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
    ], [theme]);

    useEffect(() => {
        if (fulfilledTimeStamp) {
            setLastFetched(new Date(fulfilledTimeStamp));
        }
    }, [fulfilledTimeStamp]);

    if (isError) {
        notify(`Failed to load Transactions. Please try again later.`, "error");
        const apiError = getApiError(error, `Failed to load Transactions.`);
        return <ApiErrorDisplay statusCode={apiError.type} message={apiError.message}/>;
    }

    return (
        <Box sx={{mx: "auto"}}>
            <Box sx={{display: "flex", justifyContent: "space-between"}}>
                <Box sx={{display: 'flex', alignItems: 'center', gap: 2}}>
                    <Typography variant={"h4"}>Raw Material Transactions</Typography>
                </Box>
                <PeriodSelector
                    control={control}
                    name={"timePeriod"}
                    lastFetched={lastFetched}
                />
            </Box>
            <Grid container spacing={2}>
                <Grid size={{xs: 12, md: 8}}>
                    <TableSearchActions
                        searchControl={searchControl}
                        searchSubmit={searchSubmit}
                        handleSearch={handleSearch}
                        placeholder={"Search by reference, type, source or notes"}
                    />
                </Grid>
                <Grid
                    size={{xs: 12, md: 4}}
                    sx={{justifyContent: "center", display: "flex", alignItems: "center"}}
                >
                    <Controller
                        name="rawMaterialId"
                        control={control}
                        render={({field}) => (
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
                                                <Icon
                                                    src={ArrowDownIconSvg}
                                                    alt={"Dropdown Arrow"}
                                                    sx={{width: 15, height: 15}}
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
                                    <MenuItem value={"all"}>
                                        All materials
                                    </MenuItem>
                                    {memoizedRawMaterial?.map((rawMaterial) => (
                                        <MenuItem key={rawMaterial.id} value={rawMaterial.id}
                                                  sx={{textTransform: "capitalize"}}>
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
                    <DataGridTable data={filteredData} columns={columns} loading={isLoading || isFetching}/>
                </Grid>
            </Grid>
        </Box>
    );
};

export default RawMaterialInventoryTransaction;
