import {Box, CircularProgress, Grid, Typography, useTheme} from '@mui/material';
import {AccountBalanceWalletOutlined, KitchenOutlined, ReceiptLong, TrendingUp} from '@mui/icons-material';
import {useGetProductionLogsQuery, useGetProductionSummaryQuery} from '@/store/slice';
import {useForm} from "react-hook-form";
import {filterSchema, type TimePeriod} from "@/types";
import {yupResolver} from "@hookform/resolvers/yup";
import {relativeTime} from "@/utils/get-relative-time.ts";
import {useEffect, useMemo, useState} from "react";
import {useMemoizedArray, useMemoizedObject} from "@/hooks/use-memoized-array.ts";
import DataGridTable from "@/components/ui/data-grid-table";
import type {GridColDef} from "@mui/x-data-grid";
import {formatCurrency, formatDateCustom} from "@/utils";
import TableStyledBox from "@/components/ui/data-grid-table/table-styled-box.tsx";
import ProductionModal from "@/components/menu-items/production-modal.tsx";
import CustomButton from "@/components/ui/button.tsx";
import PeriodSelector from "@/components/ui/period-selector.tsx";
import ProductionSummaryCard from "@/components/production/production-summary-card.tsx";

const ProductionScreen = () => {
    const theme = useTheme();

    const [productionModalOpen, setProductionModalOpen] = useState(false);

    const {data, isLoading: isFetchingProductionLogs} = useGetProductionLogsQuery();
    const productionLogsData = useMemoizedArray(data);

    const {control, watch} = useForm<{ timePeriod: TimePeriod }>({
        mode: "onChange",
        resolver: yupResolver(filterSchema),
        defaultValues: {
            timePeriod: "today",
        },
    });

    const period = watch("timePeriod");

    const [lastFetched, setLastFetched] = useState<Date | null>(null);

    const {data: summary, isLoading, isError, fulfilledTimeStamp} = useGetProductionSummaryQuery(period);

    const memoizedSummary = useMemoizedObject(summary);

    console.log("Production memoizedSummary:", memoizedSummary);

    const openProductionFormModal = () => {
        setProductionModalOpen(true);
    };

    const closeProductionFormModal = () => {
        setProductionModalOpen(false);
    };

    const summaryCards = [
        {
            title: "Cost of Ingredients",
            value: memoizedSummary.totalCostOfIngredients || 0,
            icon: <ReceiptLong/>,
            color: theme.palette.error.main, // Represents money spent
        },
        {
            title: "Potential Revenue Created",
            value: memoizedSummary?.potentialRevenueCreated || 0,
            icon: <TrendingUp/>,
            color: theme.palette.success.main, // Represents value added
        },
        {
            title: "Items Produced",
            value: memoizedSummary?.itemsProducedCount || 0,
            icon: <KitchenOutlined/>,
            color: theme.palette.info.main,
        },
        {
            title: "Production Margin",
            value: memoizedSummary?.grossProductionMargin || "0%",
            icon: <AccountBalanceWalletOutlined/>,
            color: theme.palette.warning.main,
        }
    ];

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
        if (fulfilledTimeStamp) {
            setLastFetched(new Date(fulfilledTimeStamp));
        }
    }, [fulfilledTimeStamp]);

    if (isLoading || isFetchingProductionLogs) return <Box sx={{p: 5, textAlign: 'center'}}><CircularProgress/></Box>;

    if (isError) {
        return (
            <Typography color="error" align="center" sx={{mt: 4}}>
                Failed to load sales history. Please try again later.
            </Typography>
        );
    }

    return (
        <Box>
            <Box sx={{mx: "auto"}}>
                <Box sx={{display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2}}>
                    <Typography variant={"h5"}>Productions</Typography>
                    <Box sx={{display: "flex", alignItems: "center"}}>
                        <CustomButton
                            variant={"contained"}
                            title={"Make Production"}
                            onClick={openProductionFormModal}
                            sx={{mr: 1}}
                        />
                        <PeriodSelector
                            control={control}
                            name={"timePeriod"}
                        />
                    </Box>
                </Box>
                <Box sx={{display: "flex", justifyContent: "flex-end"}}>
                    <Typography
                        variant="h6"
                        component="span"
                        color="text.secondary"
                        align="right"
                        mb={1}
                        sx={{
                            fontWeight: 400,
                            textAlign: "right",
                        }}
                    >
                        {lastFetched ? `Last updated ${relativeTime(lastFetched)}` : "Fetching data..."}
                    </Typography>
                </Box>
            </Box>

            <Grid container spacing={3} mb={4}>
                {summaryCards.map((card, index) => (
                    <Grid size={{xs: 12, sm: 6, md: 3}} key={card.title}>
                        <ProductionSummaryCard
                            index={index}
                            title={card.title}
                            value={card.value}
                            icon={card.icon}
                            color={card.color}
                        />
                    </Grid>
                ))}
            </Grid>

            <Grid container spacing={2}>
                <Grid size={12}>
                    <DataGridTable data={productionLogsData} loading={isFetchingProductionLogs} columns={columns}/>
                </Grid>
            </Grid>

            <ProductionModal
                open={productionModalOpen}
                onClose={closeProductionFormModal}
            />
        </Box>
    );
};

export default ProductionScreen;