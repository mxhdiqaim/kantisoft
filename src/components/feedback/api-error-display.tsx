import {Box, Typography, useTheme} from "@mui/material";
import {ErrorOutline} from "@mui/icons-material";
import CustomCard from "../customs/custom-card";
import CustomButton from "@/components/ui/button.tsx";

interface Props {
    statusCode?: number | string;
    message?: string;
}

const ApiErrorDisplay = ({statusCode = "Error", message = "An unexpected error occurred."}: Props) => {
    const theme = useTheme();

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "80vh",
                p: 3,
                textAlign: "center",
            }}
        >
            <CustomCard
                sx={{
                    maxWidth: 500,
                    width: "100%",
                    p: 1,
                    boxShadow: theme.customShadows.card,
                    borderRadius: theme.borderRadius.small,
                    border: `1px solid ${theme.palette.error.light}`,
                }}
            >
                <Box>
                    <ErrorOutline
                        sx={{
                            fontSize: 80,
                            color: "error.main",
                            mb: 2,
                        }}
                    />
                    <Typography
                        variant="h1"
                        component="div"
                        sx={{
                            fontWeight: 700,
                            color: "error.dark",
                            lineHeight: 1.1,
                        }}
                    >
                        {statusCode}
                    </Typography>
                    <Typography variant="h5" sx={{mt: 1, mb: 3}}>
                        {message}
                    </Typography>
                    <Typography color="text.secondary">
                        Please try again!.
                    </Typography>
                    <CustomButton
                        title={"Refresh"}
                        variant="contained"
                        onClick={() => window.location.reload()}
                        sx={{mt: 4}}
                    />
                </Box>
            </CustomCard>
        </Box>
    );
};

export default ApiErrorDisplay;
