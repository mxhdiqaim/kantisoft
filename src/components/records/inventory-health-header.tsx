import {Box, Grid, Skeleton, useTheme} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import type {InventoryValuationHealthType} from "@/types/inventory-types.ts";
import {useMemo} from "react";
import InventoryHealthSummaryCard from "@/components/records/inventory-health-summary-card.tsx";

type Props = {
    data: InventoryValuationHealthType,
    loading: boolean
}

const InventoryHealthHeader = ({data, loading}: Props) => {
    const theme = useTheme();

    if (loading) return <Skeleton variant="rectangular" height={100} sx={{borderRadius: 2, mb: 3}}/>;

    const inventoryHealthSummaryCards = useMemo(() => [
        {
            title: "Total Inventory Value",
            value: data?.totalInventoryValue,
            icon: <AccountBalanceWalletIcon color="primary"/>,
            color: theme.palette.info.main,
        },
        {
            title: "Stock Health",
            value: data?.stockedItemsPercentage,
            icon: <HealthAndSafetyIcon color={Number(data?.stockedItemsPercentage) > 80 ? "success" : "warning"}/>,
            color: theme.palette.success.main,
        },
        {
            title: "Out of Stock",
            value: data?.outOfStockItemsCount,
            icon: <Box sx={{color: 'error.main'}}>⚠️</Box>,
            color: theme.palette.warning.main,
        }
    ], [data, theme]);

    return (
        <Grid container spacing={2} sx={{mb: 3}}>
            {inventoryHealthSummaryCards.map((summaryCard, index) => (
                <Grid size={{xs: 12, sm: 6, md: 4}} key={index}>
                    <InventoryHealthSummaryCard
                        index={index}
                        title={summaryCard.title}
                        value={summaryCard.value}
                        icon={summaryCard.icon}
                        color={summaryCard.color}
                    />
                </Grid>
            ))}
        </Grid>
    );
};

export default InventoryHealthHeader;