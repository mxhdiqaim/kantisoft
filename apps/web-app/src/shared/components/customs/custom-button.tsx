import { useState } from "react";
import { CircularProgress, useTheme } from "@mui/material";
import { LogoutOutlined } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useClerk } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/modules/iam/store";
import { CustomButton } from "@/shared/components";
import type { SxProps, Theme } from "@mui/material/styles";

interface Props {
    sx?: SxProps<Theme>;
}

export const LogoutButton = ({ sx }: Props) => {
    const theme = useTheme();
    const logOut = useAuthStore((state) => state.logOut);
    const { signOut } = useClerk();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = async () => {
        try {
            setIsLoggingOut(true);
            await signOut();
            logOut();
            queryClient.clear();
            navigate("/login");
        } catch (error) {
            console.error("Signout failed:", error);
        } finally {
            setIsLoggingOut(false);
        }
    };

    return (
        <CustomButton
            title={isLoggingOut ? "Logging out..." : "Logout"}
            onClick={handleLogout}
            disabled={isLoggingOut}
            variant="contained"
            startIcon={isLoggingOut ? <CircularProgress size={20} color="inherit" /> : <LogoutOutlined />}
            sx={{
                width: "100%",
                backgroundColor: theme.palette.error.main,
                color: theme.palette.error.contrastText,
                justifyContent: "flex-start",
                py: 1.5,
                px: 2,
                boxShadow: theme.customShadows?.button || 2,
                transition: theme.transitions.create(["background-color", "transform"], {
                    duration: theme.transitions.duration.short,
                }),
                "&:hover": {
                    backgroundColor: theme.palette.error.dark,
                    transform: "scale(1.02)",
                },
                ...sx,
            }}
        />
    );
};
