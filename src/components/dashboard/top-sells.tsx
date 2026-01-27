import {useGetTopSellsQuery} from "@/store/slice";
import type {Period} from "@/types/order-types";
import {formatCurrency} from "@/utils";
import {Box, LinearProgress, List, ListItem, ListItemText, Skeleton, Typography, useTheme,} from "@mui/material";
import {useTranslation} from "react-i18next";
import CustomCard from "@/components/customs/custom-card.tsx";

interface Props {
    timePeriod: Period;
}

const TopSells = ({timePeriod}: Props) => {
    const {t} = useTranslation();
    const theme = useTheme();
    const {data: topSells, isLoading} = useGetTopSellsQuery({
        timePeriod,
        limit: 5,
        orderBy: "revenue",
    });

    if (isLoading) {
        return <Skeleton variant="rectangular" height={300} sx={{borderRadius: theme.borderRadius.small}}/>;
    }

    const maxRevenue = Math.max(...(topSells?.map((item) => parseFloat(item.totalRevenueGenerated)) || [0]));

    return (
        <CustomCard
            title={`Top Selling ${t("menuItems")}`}
            subheader={`By revenue for this ${timePeriod}`}
            sx={{boxShadow: theme.customShadows.card, borderRadius: theme.borderRadius.small, height: "100%"}}
        >
            <Box sx={{px: 1, mt: -2}}>
                <List disablePadding>
                    {topSells?.map((item, index) => {
                        const revenue = parseFloat(item.totalRevenueGenerated);
                        const progressValue = maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0;

                        return (
                            <ListItem key={item.itemId} disableGutters divider={index < topSells?.length - 1}>
                                <ListItemText
                                    primary={
                                        <Typography variant="subtitle1" noWrap>
                                            {item.itemName}
                                        </Typography>
                                    }
                                    secondary={
                                        <Box sx={{display: "flex", alignItems: "center", gap: 2}}>
                                            <Typography variant="body2" color="text.secondary">
                                                {`Sold: ${item.totalQuantitySold}`}
                                            </Typography>
                                            <Typography variant="body2" color="text.primary" fontWeight="bold">
                                                {formatCurrency(revenue)}
                                            </Typography>
                                        </Box>
                                    }
                                />
                                <Box sx={{width: "40%", ml: 2}}>
                                    <LinearProgress
                                        variant="determinate"
                                        value={progressValue}
                                        sx={{
                                            height: 8,
                                            borderRadius: 5,
                                            backgroundColor: theme.palette.grey[300],
                                        }}
                                    />
                                </Box>
                            </ListItem>
                        );
                    })}
                </List>
            </Box>
        </CustomCard>
    );
};

export default TopSells;
