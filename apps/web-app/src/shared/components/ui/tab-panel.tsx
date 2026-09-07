import type {ReactNode} from "react";
import {Box} from "@mui/material";

interface Props {
    index: number;
    value: number;
    children?: ReactNode;
}

const CustomTabPanel = (props: Props) => {
    const {children, value, index, ...other} = props;

    return (
        <Box
            role="tabpanel"
            hidden={value !== index}
            id={`simple-tabpanel-${index}`}
            aria-labelledby={`simple-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{p: 2}}>{children}</Box>}
        </Box>
    );
};

export default CustomTabPanel;
