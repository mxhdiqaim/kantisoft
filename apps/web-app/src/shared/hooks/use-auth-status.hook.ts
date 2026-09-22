import { useEffect } from "react";
import { useAuth, useClerk } from "@clerk/react";
import { useAuthStore } from "@/modules/iam/store/auth.store";
import { useHealthCheckQuery } from "@/shared/api/system.api";
import { useGetMeQuery } from "@/modules/iam/api/auth.api";

export const useAuthStatus = () => {
    const { isLoaded: isClerkLoaded, isSignedIn } = useAuth();
    const { signOut } = useClerk();

    const user = useAuthStore((state) => state.user);
    const setCredentials = useAuthStore((state) => state.setCredentials);
    const logOut = useAuthStore((state) => state.logOut);

    const hasValidUser = user && Object.keys(user).length > 0;
    const needsProfile = !!isSignedIn && !hasValidUser;

    const { data: profileData, isLoading: isProfileLoading, isError: isProfileError } = useGetMeQuery(needsProfile);
    const {
        isSuccess: isServerOk,
        isLoading: isHealthLoading,
        isError: isServerError,
    } = useHealthCheckQuery(!!isSignedIn);

    useEffect(() => {
        if (profileData && needsProfile) {
            setCredentials(profileData);
        }
    }, [profileData, needsProfile, setCredentials]);

    useEffect(() => {
        if (isProfileError) {
            console.error("Backend failed to sync user. Killing Clerk session to prevent loop.");
            logOut();
            signOut();
        }
    }, [isProfileError, logOut, signOut]);

    const isLoading = !isClerkLoaded || isHealthLoading || (needsProfile && isProfileLoading);

    return {
        isLoading,
        isAuthenticated: !!isSignedIn && hasValidUser && isServerOk,
        isServerOk: !isServerError,
    };
};
