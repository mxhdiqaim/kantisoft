import {Box, Typography} from '@mui/material';
import {type SyntheticEvent, useEffect, useState} from "react";
import {
    useGetFinishedGoodsProfitMarginQuery,
    useGetInventoryValuationHealthQuery,
    useGetProductionWastageSummaryQuery
} from "@/store/slice";
import {useMemoizedArray} from "@/hooks/use-memoized-array.ts";
import GenericTabs from "@/components/ui/generic-tab.tsx";
import CustomTabPanel from "@/components/ui/tab-panel.tsx";
import WastageAnalysisTab from "@/components/records/wastage-analysis-tab.tsx";
import ProfitOverviewTab from "@/components/records/profit-overview-tab.tsx";
import InventoryHealthHeader from "@/components/records/inventory-health-header.tsx";
import {useForm} from "react-hook-form";
import type {Period} from "@/types/order-types.ts";
import {yupResolver} from "@hookform/resolvers/yup";
import {filterSchema} from "@/types/dashboard-types.ts";
import PeriodSelector from "@/components/ui/period-selector.tsx";
import {getApiError} from "@/helpers/get-api-error.ts";
import ApiErrorDisplay from "@/components/feedback/api-error-display.tsx";
import useNotifier from "@/hooks/useNotifier.ts";

import MoneyIcon from '@mui/icons-material/Money';
import AnalyticsIcon from '@mui/icons-material/Analytics';

const tabsArray = [
    {
        label: "Profit Overview",
        icon: <MoneyIcon/>,
        activeIcon: <MoneyIcon/>,
    },
    {
        label: "Wastage Analysis",
        icon: <AnalyticsIcon/>,
        activeIcon: <AnalyticsIcon/>,
    },
];

const ProfitabilityWastageScreen = () => {
    const notify = useNotifier();
    const {control, watch} = useForm<{ period: Period }>({
        mode: "onChange",
        resolver: yupResolver(filterSchema),
        defaultValues: {
            period: "today",
        },
    });
    const period = watch("period");

    const {
        data: wastageSummaryData,
        isLoading: fetchingWastageSummary,
        isError,
        error
    } = useGetProductionWastageSummaryQuery();
    const wasteData = useMemoizedArray(wastageSummaryData);

    const {data: healthData, isLoading: fetchingHealth} = useGetInventoryValuationHealthQuery(period);

    const {
        data: finishedGoodsProfitData,
        isLoading: fetchingFinishedGoodsData, fulfilledTimeStamp
    } = useGetFinishedGoodsProfitMarginQuery();
    const memoizedProfitData = useMemoizedArray(finishedGoodsProfitData);

    const [tabValue, setTabValue] = useState(0);
    const [lastFetched, setLastFetched] = useState<Date | null>(null);

    const handleTabChange = (_: SyntheticEvent, newTabValue: number) => {
        setTabValue(newTabValue);
    };

    useEffect(() => {
        if (fulfilledTimeStamp) {
            setLastFetched(new Date(fulfilledTimeStamp));
        }
    }, [fulfilledTimeStamp]);

    if (isError) {
        notify(` Failed to load page. Please try again later.`, "error");
        const apiError = getApiError(error, `Failed to load page.`);
        return <ApiErrorDisplay statusCode={apiError.type} message={apiError.message}/>;
    }

    return (
        <Box>
            <Box sx={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                <Typography variant={"h5"}>Profitability & Wastage</Typography>

                <PeriodSelector
                    control={control}
                    name={"period"}
                    lastFetched={lastFetched}
                />
            </Box>

            <InventoryHealthHeader data={healthData} loading={fetchingHealth}/>

            <GenericTabs value={tabValue} onChange={handleTabChange} tabs={tabsArray}/>
            <CustomTabPanel value={tabValue} index={0}>
                <ProfitOverviewTab data={memoizedProfitData} loading={fetchingFinishedGoodsData}/>
            </CustomTabPanel>
            <CustomTabPanel value={tabValue} index={1}>
                <WastageAnalysisTab data={wasteData} loading={fetchingWastageSummary}/>
            </CustomTabPanel>
        </Box>
    );
};

export default ProfitabilityWastageScreen;