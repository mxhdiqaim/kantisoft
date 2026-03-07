import {useGetSalesTrendQuery} from "@/store/slice";
import type {Period} from "@/types/order-types";
import {formatCurrency, formatDateCustom} from "@/utils";
import {Box, Skeleton, Typography, useTheme} from "@mui/material";
import {Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";
import CustomCard from "@/components/customs/custom-card.tsx";

interface Props {
    period: Period;
}

const SalesTrendChart = ({period}: Props) => {
    const theme = useTheme();
    const {data: salesTrend, isLoading} = useGetSalesTrendQuery(period);

    if (isLoading) {
        return <Skeleton variant="rectangular" height={400} sx={{borderRadius: theme.borderRadius.medium}}/>;
    }

    // eslint-disable-next-line
    const CustomTooltip = ({active, payload, label}: any) => {
        if (active && payload && payload.length) {
            return (
                <CustomCard sx={{boxShadow: 8}}>
                    <Typography component={"p"}>{`Date: ${formatDateCustom(label)}`}</Typography>
                    <Typography component={"p"}
                                style={{color: theme.palette.primary.main}}
                    >{`Revenue: ${formatCurrency(payload[0].value)}`}</Typography>
                </CustomCard>
            );
        }
        return null;
    };

    return (
        <CustomCard
            title="Sales Trend"
            subheader={`${period.charAt(0).toUpperCase() + period.slice(1)} revenue trend`}
            sx={{boxShadow: theme.customShadows.card, borderRadius: theme.borderRadius.small}}
        >
            <Box sx={{height: 350}}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={salesTrend} margin={{top: 5, right: 20, bottom: 5, left: 20}}>
                        <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.8}/>
                                <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <XAxis
                            dataKey="date"
                            tickFormatter={(str) => formatDateCustom(str)}
                            stroke={theme.palette.text.secondary}
                        />
                        <YAxis tickFormatter={(val) => `₦${val / 1000}k`} stroke={theme.palette.text.secondary}/>
                        <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider}/>
                        <Tooltip content={<CustomTooltip/>}/>
                        <Area
                            type="monotone"
                            dataKey="dailyRevenue"
                            stroke={theme.palette.primary.main}
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorRevenue)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </Box>
        </CustomCard>
    );
};

export default SalesTrendChart;
