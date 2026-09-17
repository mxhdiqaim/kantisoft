import { Box, Grid, Typography } from "@mui/material";
import { SignUp } from "@clerk/react";
import { CustomButton } from "@/shared/components";
import { useNavigate } from "react-router-dom";

const RegisterPage = () => {
    const navigate = useNavigate();

    return (
        <Grid container spacing={2}>
            <Grid
                size={12}
                sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    minHeight: "100vh",
                    m: { xs: 3, md: 0 },
                }}
            >
                <Box
                    sx={{
                        width: "100%",
                        maxWidth: { xs: "100%", sm: "400px" },
                    }}
                >
                    <SignUp
                        appearance={{
                            theme: "simple",
                            elements: {
                                footerAction: { display: "none" },
                            },
                        }}
                    />

                    <Box sx={{ textAlign: "center", mt: 2 }}>
                        <Typography variant="body1">
                            Already have an account?{" "}
                            <CustomButton title={"Login here"} variant="text" onClick={() => navigate("/login")} />
                        </Typography>
                    </Box>
                </Box>
            </Grid>
        </Grid>
    );
};

export default RegisterPage;
