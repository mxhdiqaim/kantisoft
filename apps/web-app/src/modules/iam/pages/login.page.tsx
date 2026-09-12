import { Grid } from "@mui/material";
import { SignIn } from "@clerk/react";

const LoginPage = () => {
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
                <SignIn appearance={{ theme: "simple" }} />
            </Grid>
        </Grid>
    );
};

export default LoginPage;
