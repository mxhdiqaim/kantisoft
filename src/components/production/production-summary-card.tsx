import {Avatar, Box, Grow, Typography} from "@mui/material";
import {useTheme} from "@mui/material/styles";
import type {ReactElement} from "react";
import CountUp from "react-countup";
import {ngnFormatter} from "@/utils";
import {CustomCardRef} from "../customs/custom-card";

interface Props {
    title: string;
    value: number | string;
    icon: ReactElement;
    color?: string;
    index: number;
    loading?: boolean;
}

const ProductionSummaryCard = (props: Props) => {
    console.log({props});
    const {title, value, icon, color, index, loading} = props;
    const theme = useTheme();
    const cardColor = color || theme.palette.primary.main;

    const renderValue = () => {
        if (typeof value === 'number') {
            return (
                <CountUp
                    key={value} // Add key to re-trigger animation on value change
                    start={0}
                    end={value}
                    duration={2}
                    separator=","
                    decimals={Number.isInteger(value) ? 0 : 2}
                />
            );
        }
        if (typeof value === 'string' && value.includes('%')) {
            return <>{value}</>;
        }
        // Assuming this is for currency which might be a string from the API
        const numericValue = Number(String(value).replace(/,/g, ''));
        if (isNaN(numericValue)) {
            return <>{value}</>
        }
        return <>{ngnFormatter.format(numericValue)}</>;
    };

    return (
        <Grow in={true} style={{transformOrigin: "0 0 0"}} timeout={500 + index * 150}>
            <CustomCardRef
                sx={{
                    boxShadow: theme.customShadows.card,
                    borderRadius: theme.borderRadius.small,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                }}
            >
                <Box>
                    <Box sx={{display: "flex", alignItems: "center", mb: 2}}>
                        <Avatar
                            sx={{
                                bgcolor: cardColor,
                                color: theme.palette.getContrastText(cardColor),
                                mr: 2,
                            }}
                        >
                            {icon}
                        </Avatar>
                        <Typography variant="h6" color="text.secondary">
                            {title}
                        </Typography>
                    </Box>
                    <Typography variant="h4" component="div" sx={{fontWeight: "bold"}}>
                        {loading ? "..." : renderValue()}
                    </Typography>
                </Box>
            </CustomCardRef>
        </Grow>
    );
};

export default ProductionSummaryCard;
