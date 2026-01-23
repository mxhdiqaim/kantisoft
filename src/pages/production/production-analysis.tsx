import {Box, Card, CircularProgress, Grid, Typography, useTheme} from '@mui/material';
import {AccountBalanceWalletOutlined, KitchenOutlined, ReceiptLong, TrendingUp} from '@mui/icons-material';
import {useGetProductionSummaryQuery} from '@/store/slice';
import SummaryCard from "@/components/dashboard/summary-card"; // Reuse your existing component
import {useForm} from "react-hook-form";
import OverviewHeader from "@/components/ui/custom-header.tsx";
import {filterSchema, type TimePeriod} from "@/types";
import {yupResolver} from "@hookform/resolvers/yup";
import {relativeTime} from "@/utils/get-relative-time.ts";
import {useEffect, useState} from "react";

const ProductionAnalysisScreen = () => {
    const theme = useTheme();

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

    useEffect(() => {
        if (fulfilledTimeStamp) {
            setLastFetched(new Date(fulfilledTimeStamp));
        }
    }, [fulfilledTimeStamp]);


    const cards = [
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
    ];

    if (isLoading) return <Box sx={{p: 5, textAlign: 'center'}}><CircularProgress/></Box>;

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
                <OverviewHeader
                    title={"Productions"}
                    // timePeriod={period}
                    control={control}
                    // getTimeTitle={getTitle}
                    name={"timePeriod"}
                    // timeTitle={""}
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
            </Box>

            <Grid container spacing={3} mb={4}>
                {cards.map((card, index) => (
                    <Grid size={{xs: 12, sm: 6, md: 3}} key={card.title}>
                        {/* Note: If SummaryCard only takes numbers, pass string-based margins separately */}
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

            {/* Analysis Section */}
            <Grid container spacing={3}>
                <Grid size={{xs: 12, md: 6}}>
                    <Card sx={{p: 3, borderRadius: theme.borderRadius.medium}}>
                        <Typography variant="h6" gutterBottom>Production Efficiency</Typography>
                        <Typography variant="body2" sx={{mb: 2}}>
                            This period, your kitchen converted raw materials into finished goods with a
                            <strong> {summary?.grossProductionMargin} </strong> margin.
                        </Typography>
                        <Box sx={{p: 2, bgcolor: theme.palette.grey[50], borderRadius: 1}}>
                            <Typography variant="caption" display="block">Insight:</Typography>
                            <Typography variant="body2" color="text.secondary">
                                If your Production Margin is significantly lower than your Sales Margin, check for high
                                raw material waste or inaccurate ingredient portions in the BOM.
                            </Typography>
                        </Box>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default ProductionAnalysisScreen;