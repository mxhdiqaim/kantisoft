import type {ReactElement, SyntheticEvent} from "react";
import {Box, Tabs} from "@mui/material";
import CustomTab from "@/components/ui/tab.tsx";

interface TabConfig {
    label: string;
    icon: ReactElement;
    activeIcon: ReactElement;
}

interface Props {
    value: number;
    onChange: (event: SyntheticEvent, newValue: number) => void;
    tabs: TabConfig[];
}

const GenericTabs = ({value, onChange, tabs}: Props) => {
    return (
        <Box sx={{borderBottom: 1, borderColor: "divider"}}>
            <Tabs
                value={value}
                onChange={onChange}
                aria-label="Generic Tabs"
                sx={{
                    minHeight: "auto",
                    "& .MuiTab-root": {
                        paddingX: 2,
                        paddingY: 1.5,
                        minHeight: "auto",
                    },
                }}
            >
                {tabs.map((tab, index) => (
                    <CustomTab
                        key={index}
                        index={index}
                        label={tab.label}
                        iconPosition="start"
                        icon={index ? tab.activeIcon : tab.icon}
                    />
                ))}
            </Tabs>
        </Box>
    );
};

export default GenericTabs;
