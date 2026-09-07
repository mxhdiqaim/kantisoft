import axios from "axios";
import { useAuthStore } from "@/modules/iam/store/auth.store";
import { getEnvVariable } from "./index";

// Declare window.Clerk so TypeScript doesn't throw errors
declare global {
    interface Window {
        // eslint-disable-next-line
        Clerk: any;
    }
}

const baseURL = getEnvVariable("VITE_APP_API_URL") || "http://localhost:7344/api/v1";

export const api = axios.create({
    baseURL,
    headers: {
        "Content-Type": "application/json",
    },
});

// Lock to prevent multiple sign out redirects if parallel requests fail simultaneously
let isSigningOut = false;

// ----------------------------------------------------------------------
// Request Interceptor: Inject Clerk Token
// ----------------------------------------------------------------------
api.interceptors.request.use(
    async (config) => {
        try {
            // Wait for Clerk to initialize and check for an active session
            if (window.Clerk && window.Clerk.session) {
                // getToken() automatically checks expiry and fetches a fresh token if needed!
                const token = await window.Clerk.session.getToken();

                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
            }
        } catch (error) {
            console.error("Failed to fetch Clerk token:", error);
        }

        return config;
    },
    (error) => Promise.reject(error),
);

// ----------------------------------------------------------------------
// Response Interceptor: Handle Global 401s
// ----------------------------------------------------------------------
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            const isAuthRoute = error.config?.url?.includes("/auth");

            // Don't trigger a global logout if the 401 came from a failed login attempt
            if (!isAuthRoute && !isSigningOut) {
                isSigningOut = true;
                console.warn("Session expired or unauthorized. Logging out...");

                // Zustand Magic: Call the logout action directly outside of React!
                useAuthStore.getState().logOut();

                // Redirect to sign in
                window.location.href = "/signin";
            }
        }

        return Promise.reject(error);
    },
);
