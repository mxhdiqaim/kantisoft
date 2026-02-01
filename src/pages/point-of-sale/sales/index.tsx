import SalesHistoryOverviewCard from "@/components/point-of-sale/sales-history-overview-card.tsx";
import SalesHistoryTable from "@/components/point-of-sale/sales-history-table.tsx";
import {useGetOrdersByPeriodQuery} from "@/store/slice";
import {filterSchema, type TimePeriod} from "@/types";
import {formatCurrency} from "@/utils";
import {yupResolver} from "@hookform/resolvers/yup";
import {DinnerDiningOutlined, DomainVerificationOutlined, MonetizationOn, Person2Outlined} from "@mui/icons-material";
import {Box, Grid, Typography} from "@mui/material";
import {useEffect, useState} from "react";
import {useForm} from "react-hook-form";
import {UserRoleEnum, UserStatusEnum} from "@/types/user-types.ts";
import {useSelector} from "react-redux";
import {selectCurrentUser} from "@/store/slice/auth-slice.ts";
import {getApiError} from "@/helpers/get-api-error.ts";
import ApiErrorDisplay from "@/components/feedback/api-error-display.tsx";
import useNotifier from "@/hooks/useNotifier.ts";
import PeriodSelector from "@/components/ui/period-selector.tsx";

const SalesHistory = () => {
    const notify = useNotifier();
    const currentUser = useSelector(selectCurrentUser);
    const {control, watch} = useForm<{ timePeriod: TimePeriod }>({
        mode: "onChange",
        resolver: yupResolver(filterSchema),
        defaultValues: {
            timePeriod: "today",
        },
    });

    const period = watch("timePeriod");

    const {
        data: ordersData,
        isLoading,
        isFetching,
        isError,
        fulfilledTimeStamp,
        error
    } = useGetOrdersByPeriodQuery(period);

    const [lastFetched, setLastFetched] = useState<Date | null>(null);

    const adminOrManager = currentUser?.status === UserStatusEnum.ACTIVE &&
        (currentUser?.role === UserRoleEnum.ADMIN || currentUser?.role === UserRoleEnum.MANAGER);


    useEffect(() => {
        if (fulfilledTimeStamp) {
            setLastFetched(new Date(fulfilledTimeStamp));
        }
    }, [fulfilledTimeStamp]);

    if (isError) {
        notify(` Failed to load sales history. Please try again later.`, "error");
        const apiError = getApiError(error, `Failed to load sales history.`);
        return <ApiErrorDisplay statusCode={apiError.type} message={apiError.message}/>;
    }

    return (
        <Box sx={{mx: "auto"}}>
            <Box sx={{display: "flex", justifyContent: "space-between"}}>
                <Typography variant={"h4"}>Sales History</Typography>
                <PeriodSelector
                    control={control}
                    name={"timePeriod"}
                    lastFetched={lastFetched}
                />
            </Box>

            {adminOrManager && (
                <Grid container spacing={3} mb={3}>
                    <Grid size={{xs: 12, sm: 6, md: 3}}>
                        <SalesHistoryOverviewCard
                            title="Total Sales Balance"
                            color="success"
                            icon={<MonetizationOn/>}
                            value={formatCurrency(Number(ordersData?.totalRevenue ?? 0))}
                            isLoading={isLoading}
                        />
                    </Grid>
                    <Grid size={{xs: 12, sm: 6, md: 3}}>
                        <SalesHistoryOverviewCard
                            title="Most Ordered Item"
                            color="warning"
                            icon={<DinnerDiningOutlined/>}
                            value={ordersData?.mostOrderedItem?.name || "N/A"}
                            subValue={ordersData?.mostOrderedItem ? `(${ordersData.mostOrderedItem.quantity} sold)` : ""}
                            isLoading={isLoading}
                        />
                    </Grid>
                    <Grid size={{xs: 12, sm: 6, md: 3}}>
                        <SalesHistoryOverviewCard
                            title="Top Seller"
                            color="secondary"
                            icon={<Person2Outlined/>}
                            value={ordersData?.topSeller?.name || "N/A"}
                            isLoading={isLoading}
                        />
                    </Grid>
                    <Grid size={{xs: 12, sm: 6, md: 3}}>
                        <SalesHistoryOverviewCard
                            title="Total Orders"
                            color="info"
                            icon={<DomainVerificationOutlined/>}
                            value={ordersData?.totalOrders ?? 0}
                            isLoading={isLoading}
                        />
                    </Grid>
                </Grid>
            )}

            <SalesHistoryTable orders={ordersData?.orders || []} loading={isLoading || isFetching} period={period}/>
        </Box>
    );
};

export default SalesHistory;
