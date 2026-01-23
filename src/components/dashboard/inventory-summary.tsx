import {useGetInventoryAlertsQuery} from "@/store/slice";
import {NoFood, ShoppingCartCheckout, SoupKitchen, WarningAmber} from "@mui/icons-material";
import {Avatar, Box, Grid, Skeleton, Typography, useTheme} from "@mui/material";
import CountUp from "react-countup";
import CustomCard from "../customs/custom-card";
import {useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";

const InventoryAlerts = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const {t} = useTranslation();
    const {data: alerts, isLoading: isFetchingAlerts} = useGetInventoryAlertsQuery();

    if (isFetchingAlerts) {
        return (
            <Grid container spacing={3}>
                {[1, 2].map((i) => (
                    <Grid size={{xs: 12, sm: 6}} key={i}>
                        <Skeleton variant="rectangular" height={160} sx={{borderRadius: theme.borderRadius.small}}/>
                    </Grid>
                ))}
            </Grid>
        );
    }

    // Extracting data from your new fused controller structure
    const rawOut = alerts?.rawMaterials?.outOfStock?.length || 0;
    const rawLow = alerts?.rawMaterials?.lowStock?.length || 0;

    const menuOut = alerts?.menuItems?.outOfStock?.length || 0;
    const menuLow = alerts?.menuItems?.lowStock?.length || 0;

    return (
        <Grid container spacing={3}>
            <Grid size={{xs: 12, sm: 6}}>
                <CustomCard
                    sx={{cursor: 'pointer', '&:hover': {boxShadow: theme.shadows[1]}}}
                    onClick={() => navigate('/stock/materials')}
                >
                    <Box sx={{display: 'flex', justifyContent: 'space-between', mb: 2}}>
                        <Typography variant="h6" color="primary">Raw Material</Typography>
                        <ShoppingCartCheckout color="action"/>
                    </Box>
                    <Grid container spacing={2}>
                        <Grid size={6}>
                            <Box sx={{display: 'flex', alignItems: 'center'}}>
                                <Avatar
                                    sx={{
                                        background: theme.palette.error.light,
                                        color: theme.palette.error.dark,
                                        mr: 1.5
                                    }}>
                                    <NoFood fontSize="small"/>
                                </Avatar>
                                <Box>
                                    <Typography variant="h5" fontWeight="bold"><CountUp end={rawOut}/></Typography>
                                    <Typography variant="caption" color="text.secondary">Out of Stock</Typography>
                                </Box>
                            </Box>
                        </Grid>
                        <Grid size={6}>
                            <Box sx={{display: 'flex', alignItems: 'center'}}>
                                <Avatar sx={{
                                    background: theme.palette.warning.light,
                                    color: theme.palette.warning.dark,
                                    mr: 1.5
                                }}>
                                    <WarningAmber fontSize="small"/>
                                </Avatar>
                                <Box>
                                    <Typography variant="h5" fontWeight="bold"><CountUp end={rawLow}/></Typography>
                                    <Typography variant="caption" color="text.secondary">Low Stock</Typography>
                                </Box>
                            </Box>
                        </Grid>
                    </Grid>
                </CustomCard>
            </Grid>

            {/* Menu Items - Production Alerts */}
            <Grid size={{xs: 12, sm: 6}}>
                <CustomCard
                    sx={{cursor: 'pointer', '&:hover': {boxShadow: theme.shadows[1]}}}
                    onClick={() => navigate('/stock/finished-goods')}
                >
                    <Box sx={{display: 'flex', justifyContent: 'space-between', mb: 2}}>
                        <Typography variant="h6" color="primary">{t("menuItems")}</Typography>
                        <SoupKitchen color="action"/>
                    </Box>
                    <Grid container spacing={2}>
                        <Grid size={6}>
                            <Box sx={{display: 'flex', alignItems: 'center'}}>
                                <Avatar
                                    sx={{
                                        background: theme.palette.error.light,
                                        color: theme.palette.error.dark,
                                        mr: 1.5
                                    }}>
                                    <NoFood fontSize="small"/>
                                </Avatar>
                                <Box>
                                    <Typography variant="h5" fontWeight="bold"><CountUp end={menuOut}/></Typography>
                                    <Typography variant="caption" color="text.secondary">Out of stock</Typography>
                                </Box>
                            </Box>
                        </Grid>
                        <Grid size={6}>
                            <Box sx={{display: 'flex', alignItems: 'center'}}>
                                <Avatar sx={{
                                    background: theme.palette.warning.light,
                                    color: theme.palette.warning.dark,
                                    mr: 1.5
                                }}>
                                    <WarningAmber fontSize="small"/>
                                </Avatar>
                                <Box>
                                    <Typography variant="h5" fontWeight="bold"><CountUp end={menuLow}/></Typography>
                                    <Typography variant="caption" color="text.secondary">Low Stock</Typography>
                                </Box>
                            </Box>
                        </Grid>
                    </Grid>
                </CustomCard>
            </Grid>
        </Grid>
    );
};

export default InventoryAlerts;