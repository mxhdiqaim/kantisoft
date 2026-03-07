import {Box, Typography} from "@mui/material";
import {useGetAllDeletedRawMaterialsQuery} from "@/store/slice";
import GenericTabs from "@/components/ui/generic-tab.tsx";
import {type SyntheticEvent, useState} from "react";
import CustomTabPanel from "@/components/ui/tab-panel.tsx";
import {useMemoizedArray} from "@/hooks/use-memoized-array.ts";

import ShapeLineOutlinedIcon from '@mui/icons-material/ShapeLineOutlined';
import RawMaterialTrashBinTab from "@/components/administrator/raw-material-trash-bin-tab.tsx";

const tabsArray = [
    {
        label: "Raw Materials",
        icon: <ShapeLineOutlinedIcon/>,
        activeIcon: <ShapeLineOutlinedIcon/>,
    },
];

const TrashBinScreen = () => {
    const [tabValue, setTabValue] = useState(0);

    const {data, isLoading} = useGetAllDeletedRawMaterialsQuery();
    const memoizedData = useMemoizedArray(data);


    const handleTabChange = (_: SyntheticEvent, newTabValue: number) => {
        setTabValue(newTabValue);
    };


    return (
        <Box sx={{mx: "auto"}}>
            <Typography variant={"h5"}>Trash Bin</Typography>
            <GenericTabs value={tabValue} onChange={handleTabChange} tabs={tabsArray}/>

            <CustomTabPanel value={tabValue} index={0}>
                <RawMaterialTrashBinTab data={memoizedData} loading={isLoading}/>
            </CustomTabPanel>
        </Box>
    );
};

export default TrashBinScreen;