import { useEffect } from "react";
import { useAuth } from "@clerk/react";
import { useAuthStore } from "@/modules/iam/store/auth.store";
import { useHealthCheckQuery } from "@/shared/api/system.api";
import { useGetMeQuery } from "@/modules/iam/api/auth.api";

export const useAuthStatus = () => {
    const { isLoaded: isClerkLoaded, isSignedIn } = useAuth();

    // Zustand holds the Kantisoft user profile for the UI to use
    const user = useAuthStore((state) => state.user);
    const setCredentials = useAuthStore((state) => state.setCredentials);

    // Only fetch the profile if Clerk is signed in, but Zustand is empty
    const { data: profileData, isLoading: isProfileLoading } = useGetMeQuery(!!isSignedIn && !user);

    // Check if the backend server is actually online
    const {
        isSuccess: isServerOk,
        isLoading: isHealthLoading,
        isError: isServerError,
    } = useHealthCheckQuery(!!isSignedIn);

    // When TanStack successfully fetches the profile, save it to Zustand
    useEffect(() => {
        if (profileData && !user) {
            setCredentials(profileData);
        }
    }, [profileData, user, setCredentials]);

    // Calculate the overarching loading state for the GuardedRoute
    const isLoading = !isClerkLoaded || isHealthLoading || (isSignedIn && !user && isProfileLoading);

    return {
        isLoading,
        isAuthenticated: !!isSignedIn && !!user && isServerOk,
        isServerOk: !isServerError,
    };
};
