import { useHealthCheckQuery } from "@/store/slice";
import { selectCurrentUser } from "@/store/slice/auth-slice";
import { useAppSelector } from "@/store";

export const useAuthStatus = () => {
    const currentUser = useAppSelector(selectCurrentUser);

    // We only perform the health check if we have a user in Redux
    // and Firebase is initialized.
    const { isLoading, isSuccess, isError } = useHealthCheckQuery(undefined, {
        skip: !currentUser, // Skip if no user data in Redux
    });

    return {
        isLoading,
        isAuthenticated: !!currentUser && isSuccess,
        isServerOk: !isError,
    };
};
