import {Box, Grid, Typography, useTheme} from '@mui/material';
import {useGetProductionLogsQuery, useGetProductionSummaryQuery} from '@/store/slice';
import {useForm} from "react-hook-form";
import {filterSchema, type TimePeriod} from "@/types";
import {yupResolver} from "@hookform/resolvers/yup";
import {useEffect, useMemo, useState} from "react";
import {useMemoizedArray} from "@/hooks/use-memoized-array.ts";
import DataGridTable from "@/components/ui/data-grid-table";
import type {GridColDef} from "@mui/x-data-grid";
import {formatCurrency, formatDateCustom} from "@/utils";
import TableStyledBox from "@/components/ui/data-grid-table/table-styled-box.tsx";
import ProductionModal from "@/components/menu-items/production-modal.tsx";
import CustomButton from "@/components/ui/button.tsx";
import PeriodSelector from "@/components/ui/period-selector.tsx";
import TableSearchActions from "@/components/ui/data-grid-table/table-search-action.tsx";
import {useSearch} from "@/use-search.ts";
import WastageFormModal from "@/components/menu-items/wastage-form-modal.tsx";
import ProductionSummaryCard from "@/components/production/production-summary-card.tsx";

import {AccountBalanceWalletOutlined, KitchenOutlined, ReceiptLong, TrendingUp} from '@mui/icons-material';

const ProductionScreen = () => {
    const theme = useTheme();

    const [productionModalOpen, setProductionModalOpen] = useState(false);
    const [wastageModalOpen, setWastageModalOpen] = useState(false);

    const {control, watch} = useForm<{ timePeriod: TimePeriod }>({
        mode: "onChange",
        defaultValues: {
            timePeriod: "today",
        },
        
        resolver: yupResolver(filterSchema),
    });

    const period = watch("timePeriod");

    const [lastFetched, setLastFetched] = useState<Date | null>(null);

    const {
        data,
        isLoading: isFetchingProductionLogs,
        isFetching,
        isError,
        fulfilledTimeStamp
    } = useGetProductionLogsQuery(period);
    const memoizedProductionLogs = useMemoizedArray(data);

    const {searchControl, searchSubmit, handleSearch, filteredData} = useSearch({
        initialData: memoizedProductionLogs,
        searchKeys: ["itemName", "batchReference", "performedBy"],
    });

    const {
        data: summary,
        isLoading,
        isError: summaryError,
        fulfilledTimeStamp: summaryFulfilledTimeStamp
    } = useGetProductionSummaryQuery(period);

    const openProductionFormModal = () => {
        setProductionModalOpen(true);
    };

    const closeProductionFormModal = () => {
        setProductionModalOpen(false);
    };

    const closeWastageFormModal = () => {
        setWastageModalOpen(false);
    };

    const summaryCards = useMemo(() => [
        {
            title: "Cost of Ingredients",
            value: summary?.totalCostOfIngredients || 0,
            icon: <ReceiptLong/>,
            color: theme.palette.error.main, // Represents money spent
        },
        {
            title: "Potential Revenue Created",
            value: summary?.potentialRevenueCreated || 0,
            icon: <TrendingUp/>,
            color: theme.palette.success.main, // Represents value added
        },
        {
            title: "Items Produced",
            value: summary?.itemsProducedCount || 0,
            icon: <KitchenOutlined/>,
            color: theme.palette.info.main,
        },
        {
            title: "Production Margin",
            value: summary?.grossProductionMargin || "0%",
            icon: <AccountBalanceWalletOutlined/>,
            color: theme.palette.warning.main,
        }
    ], [summary, theme.palette]);

    const columns: GridColDef[] = useMemo(() => [
        {
            flex: 1,
            field: 'batchReference',
            headerName: 'Batch ID',
            minWidth: 180,
            align: "left",
            renderCell: (params) => (
                <TableStyledBox>
                    <Typography variant="body2">{params.value}</Typography>
                </TableStyledBox>
            ),
        },
        {
            flex: 1,
            field: 'itemName',
            headerName: 'Menu Item',
            minWidth: 150,
            align: "left",
            renderCell: (params) => (
                <TableStyledBox>
                    <Typography variant="body2">{params.value}</Typography>
                </TableStyledBox>
            ),
        },
        {
            flex: 1,
            field: 'quantityProduced',
            headerName: 'Qty Produced',
            minWidth: 150,
            align: "left",
            renderCell: (params) => (
                <TableStyledBox>
                    <Typography variant="body2">{params.value}</Typography>
                </TableStyledBox>
            ),
        },
        {
            flex: 1,
            field: 'totalCost',
            headerName: 'Ingredient Cost',
            minWidth: 150,
            align: "left",
            renderCell: (params) => (
                <TableStyledBox>
                    <Typography variant="body2">{formatCurrency(params.value)}</Typography>
                </TableStyledBox>
            )
        },
        {
            flex: 1,
            field: 'revenueValue',
            headerName: 'Potential Value',
            minWidth: 150,
            align: "left",
            renderCell: (params) => (
                <TableStyledBox>
                    <Typography variant="body2">{formatCurrency(params.value)}</Typography>
                </TableStyledBox>
            )
        },
        {
            flex: 1,
            field: 'performedBy',
            headerName: 'Chef',
            minWidth: 150,
            align: "left",
            renderCell: (params) => (
                <TableStyledBox>
                    <Typography variant="body2">{params.value}</Typography>
                </TableStyledBox>
            ),
        },
        {
            flex: 1,
            field: 'createdAt',
            headerName: 'Date',
            minWidth: 150,
            align: "left",
            renderCell: (params) => (
                <TableStyledBox>
                    <Typography variant="body2">{formatDateCustom(params.value)}</Typography>
                </TableStyledBox>
            ),
        },
    ], []);

    useEffect(() => {
        const lastTimestamp = summaryFulfilledTimeStamp || fulfilledTimeStamp;
        if (lastTimestamp) {
            setLastFetched(new Date(lastTimestamp));
        }
    }, [fulfilledTimeStamp, summaryFulfilledTimeStamp]);

    if (isError || summaryError) {
        return (
            <Typography color="error" align="center" sx={{mt: 4}}>
                Request failed. Please try again later.
            </Typography>
        );
    }

    return (
        <Box sx={{mx: "auto"}}>
            <Box sx={{mx: "auto"}}>
                <Box sx={{display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2}}>
                    <Typography variant={"h5"}>Overview</Typography>

                    <Box sx={{display: "flex", gap: 2}}>
                        <CustomButton
                            variant={"contained"}
                            title={"Make Production"}
                            onClick={openProductionFormModal}
                        />
                        <CustomButton
                            variant={"outlined"}
                            title={"Record Wastage"}
                            onClick={() => setWastageModalOpen(true)}
                        />
                    </Box>
                </Box>
            </Box>

            <TableSearchActions
                searchControl={searchControl}
                searchSubmit={searchSubmit}
                handleSearch={handleSearch}
                placeholder={"Search by Batch ID, item name or chef..."}
                sx={{mb: 4}}
            >
                <PeriodSelector
                    control={control}
                    name={"timePeriod"}
                    lastFetched={lastFetched}
                />
            </TableSearchActions>

            <Grid container spacing={3} mb={4}>
                {summaryCards.map((card, index) => (
                    <Grid size={{xs: 12, sm: 6, md: 3}} key={card.title}>
                        <ProductionSummaryCard
                            index={index}
                            title={card.title}
                            value={card.value}
                            icon={card.icon}
                            color={card.color}
                            loading={isLoading}
                        />
                    </Grid>
                ))}
            </Grid>

            <Grid container spacing={2}>
                <Grid size={12}>
                    <DataGridTable data={filteredData} columns={columns}
                                   loading={isFetchingProductionLogs || isFetching}/>
                </Grid>
            </Grid>

            <ProductionModal
                open={productionModalOpen}
                onClose={closeProductionFormModal}
            />

            <WastageFormModal
                open={wastageModalOpen}
                onClose={closeWastageFormModal}
            />
        </Box>
    );
};

export default ProductionScreen;