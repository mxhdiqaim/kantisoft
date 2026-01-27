import {Box, Typography} from '@mui/material';
import {type SyntheticEvent, useState} from "react";
import {useGetFinishedGoodsProfitMarginQuery, useGetProductionWastageSummaryQuery} from "@/store/slice";
import {useMemoizedArray} from "@/hooks/use-memoized-array.ts";
import GenericTabs from "@/components/ui/generic-tab.tsx";
import CustomTabPanel from "@/components/ui/tab-panel.tsx";
import WastageAnalysisTab from "@/components/records/wastage-analysis-tab.tsx";
import ProfitOverviewTab from "@/components/records/profit-overview-tab.tsx";

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
    const {data: wastageSummaryData, isLoading: fetchingWastageSummary} = useGetProductionWastageSummaryQuery();
    const wasteData = useMemoizedArray(wastageSummaryData);

    const {
        data: finishedGoodsProfitData,
        isLoading: fetchingFinishedGoodsData
    } = useGetFinishedGoodsProfitMarginQuery();
    const memoizedProfitData = useMemoizedArray(finishedGoodsProfitData);

    const [tabValue, setTabValue] = useState(0);

    const handleTabChange = (_: SyntheticEvent, newTabValue: number) => {
        setTabValue(newTabValue);
    };

    return (
        <Box>
            <Box sx={{display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2}}>
                <Typography variant={"h5"}>Profitability & Wastage</Typography>
            </Box>
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