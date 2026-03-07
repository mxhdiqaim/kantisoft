import {a11yProps} from "@/utils";
import {Tab, type TabProps} from "@mui/material";

interface Props extends TabProps {
    label: string;
    index: number;
    iconPosition?: "start" | "end" | "top" | "bottom";
}

const CustomTab = ({label, iconPosition = "start", index, ...rest}: Props) => {
    return <Tab label={label} iconPosition={iconPosition} {...a11yProps(index)} {...rest} />;
};

export default CustomTab;
