import InventorySummary from "@/components/dashboard/inventory-summary";
import DashboardLoading from "@/components/dashboard/loading";
import SalesTrendChart from "@/components/dashboard/sales-trend-chart";
import SummaryCard from "@/components/dashboard/summary-card";
import TopSells from "@/components/dashboard/top-sells";
import {useGetSalesSummaryQuery} from "@/store/slice";
import {filterSchema} from "@/types/dashboard-types";
import type {Period} from "@/types/order-types.ts";
import {relativeTime} from "@/utils/get-relative-time.ts";
import {yupResolver} from "@hookform/resolvers/yup";
import {AttachMoney, PointOfSale, ShoppingCart} from "@mui/icons-material";
import {Box, Grid, Typography, useTheme} from "@mui/material";
import {useEffect, useMemo, useState} from "react";
import {useForm} from "react-hook-form";
import OverviewHeader from "@/components/ui/custom-header.tsx";

const Index = () => {
    const theme = useTheme();
    const {control, watch} = useForm<{ period: Period }>({
        mode: "onChange",
        resolver: yupResolver(filterSchema),
        defaultValues: {
            period: "today",
        },
    });
    const period = watch("period");
    const {data: salesSummary, isLoading, isError, fulfilledTimeStamp} = useGetSalesSummaryQuery(period);

    const summaryCards = useMemo(() => {
        if (!salesSummary) return [];

        const {totalRevenue, totalOrders, avgOrderValue} = salesSummary;

        return [
            {
                title: `Revenue`,
                value: totalRevenue,
                icon: <AttachMoney/>,
                color: theme.palette.success.main,
            },
            {
                title: `Orders`,
                value: totalOrders,
                icon: <ShoppingCart/>,
                color: theme.palette.info.main,
            },
            {
                title: `Avg. Order Value`,
                value: avgOrderValue,
                icon: <PointOfSale/>,
                color: theme.palette.warning.main,
            },
        ];
    }, [salesSummary, theme]);

    const [lastFetched, setLastFetched] = useState<Date | null>(null);

    useEffect(() => {
        if (fulfilledTimeStamp) {
            setLastFetched(new Date(fulfilledTimeStamp));
        }
    }, [fulfilledTimeStamp]);

    if (isLoading) return <DashboardLoading/>;

    if (isError) {
        return (
            <Typography color="error" align="center" sx={{mt: 4}}>
                Failed to load sales history. Please try again later.
            </Typography>
        );
    }

    return (
        <Box sx={{mx: "auto"}}>
            <OverviewHeader
                title={"Dashboard"}
                control={control}
                name={"period"}
            />
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
            <Grid container spacing={3} mb={3}>
                {summaryCards.map((card, index) => (
                    <Grid size={{xs: 12, sm: 6, md: 4}} key={card.title}>
                        <SummaryCard
                            index={index}
                            title={card.title}
                            value={card.value}
                            icon={card.icon}
                            color={card.color}
                        />
                    </Grid>
                ))}
            </Grid>

            <Grid container spacing={3}>
                <Grid size={{xs: 12, lg: 8}}>
                    <SalesTrendChart period={period}/>
                </Grid>
                <Grid size={{xs: 12, lg: 4}}>
                    <TopSells timePeriod={period}/>
                </Grid>
                <Grid size={{xs: 12}}>
                    <InventorySummary/>
                </Grid>
            </Grid>
        </Box>
    );
};

export default Index;
