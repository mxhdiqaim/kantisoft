import { type FormEvent, useState } from "react";
import { Box, Typography, Grid } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/config/firebase";
import useNotifier from "@/hooks/useNotifier";
import CustomButton from "@/components/ui/button.tsx";
import { StyledTextField } from "@/components/ui"; // Assuming you export this from here

const ForgetPassword = () => {
    const navigate = useNavigate();
    const notify = useNotifier();

    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const onSubmit = async (event: FormEvent) => {
        event.preventDefault();

        if (!email) {
            notify("Please enter your email address", "warning");
            return;
        }

        setIsLoading(true);
        try {
            // Firebase handles everything: generates the token, sends the email
            await sendPasswordResetEmail(auth, email);
            notify("Password reset email sent! Check your inbox.", "success");
            setEmail("");
        } catch (error) {
            // Check for specific Firebase error codes
            const errorMsg = error.code === "auth/user-not-found"
                ? "No account found with this email."
                : "Failed to send reset email. Please try again.";

            notify(errorMsg, "error");
        } finally {
            setIsLoading(false);
        }
    };

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
                    <Box sx={{ textAlign: "center", mb: 5 }}>
                        <Typography variant="h5" sx={{ fontWeight: 500 }}>
                            Reset Password
                        </Typography>
                        <Typography variant="body2" sx={{ color: "text.secondary", mt: 1 }}>
                            Enter your email address and we&#39;ll send you a link to reset your password.
                        </Typography>
                    </Box>

                    <Box component={"form"} noValidate autoComplete="off" onSubmit={onSubmit}>
                        <StyledTextField
                            label="Email Address"
                            type="email"
                            fullWidth
                            margin="normal"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="example@gmail.com"
                            sx={{ mb: 3 }}
                        />

                        <CustomButton
                            title={isLoading ? "Sending..." : "Send Reset Link"}
                            type="submit"
                            variant="contained"
                            disabled={isLoading || !email}
                            sx={{ width: "100%", color: "#fff", p: 1.5, mb: 2, fontWeight: 600 }}
                        />

                        <Box sx={{ textAlign: "center" }}>
                            <CustomButton
                                title="Back to Login"
                                variant="text"
                                onClick={() => navigate("/login")}
                            />
                        </Box>
                    </Box>
                </Box>
            </Grid>
        </Grid>
    );
};

export default ForgetPassword;