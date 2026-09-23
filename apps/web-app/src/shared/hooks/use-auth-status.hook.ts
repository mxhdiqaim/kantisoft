import { useEffect, useState } from "react";
import { useAuth, useClerk } from "@clerk/react";
import { useAuthStore } from "@/modules/iam/store/auth.store";
import { useHealthCheckQuery } from "@/shared/api/system.api";
import { useGetMeQuery } from "@/modules/iam/api/auth.api";

export const useAuthStatus = () => {
    const { isLoaded: isClerkLoaded, isSignedIn } = useAuth();
    const { signOut } = useClerk();

    const user = useAuthStore((state) => state.user);
    console.log({ userAuth: user });

    const setCredentials = useAuthStore((state) => state.setCredentials);
    const logOut = useAuthStore((state) => state.logOut);

    // Track if we are in the middle of a forced sign-out to freeze the UI
    const [isForceSigningOut, setIsForceSigningOut] = useState(false);

    const hasValidUser = user && Object.keys(user).length > 0;
    const needsProfile = !!isSignedIn && !hasValidUser;

    const { data: profileData, isLoading: isProfileLoading, isError: isProfileError } = useGetMeQuery(needsProfile);
    const {
        isSuccess: isServerOk,
        isLoading: isHealthLoading,
        isError: isServerError,
    } = useHealthCheckQuery(!!isSignedIn);

    // Sync Profile Data
    useEffect(() => {
        if (profileData && needsProfile) {
            // Ensure backend returned real data
            if (Object.keys(profileData).length > 0) {
                setCredentials(profileData);
            }
        }
    }, [profileData, needsProfile, setCredentials]);

    // Handle Permanent Fetch Error -> Force Sign out
    useEffect(() => {
        if (isProfileError && !isForceSigningOut) {
            console.error("Backend failed to sync user. Forcing logout.");
            setIsForceSigningOut(true);

            // Wipe Zustand completely
            logOut();
            localStorage.removeItem("kantisoft-auth-storage");

            // Ask Clerk to wipe the session cookie
            signOut().then(() => setIsForceSigningOut(false));
        }
    }, [isProfileError, isForceSigningOut, logOut, signOut]);

    // Clear Zustand if Clerk logs out externally (e.g. cookie expires)
    useEffect(() => {
        if (isClerkLoaded && !isSignedIn && hasValidUser) {
            logOut();
        }
    }, [isClerkLoaded, isSignedIn, hasValidUser, logOut]);

    // Add isForceSigningOut to the overarching loading state so the UI stays frozen while Clerk clears cookies
    const isLoading = !isClerkLoaded || isHealthLoading || (needsProfile && isProfileLoading) || isForceSigningOut;

    console.log({ isClerkLoaded, isHealthLoading, needsProfile, isProfileError, isForceSigningOut });

    return {
        isLoading,
        isAuthenticated: !!isSignedIn && hasValidUser && isServerOk,
        isServerOk: !isServerError,
    };
};
