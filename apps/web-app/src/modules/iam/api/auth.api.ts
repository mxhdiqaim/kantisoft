import { useMutation, useQuery } from "@tanstack/react-query";
import { axiosApi } from "@/shared/api";
import { type UserType } from "@/modules/iam/types";
import { useAuthStore } from "@/modules/iam/store";

export const useGetMeQuery = (enabled: boolean) => {
    return useQuery({
        queryKey: ["me"],
        queryFn: async () => {
            const response = await axiosApi.get<{ data: UserType }>("/iam/user/me");
            console.log({ authApi: response.data });
            return response.data.data;
        },
        enabled,
        refetchOnWindowFocus: false,
        // The Webhook Grace Period:
        // If the backend says the user doesn't exist yet, retry up to 5 times, waiting 1 second between attempts.
        retry: (failureCount) => {
            return failureCount < 5;
        },
        retryDelay: 1000,
    });
};

export const useSyncProfileMutation = () => {
    const setCredentials = useAuthStore((state) => state.setCredentials);
    return useMutation({
        mutationFn: async () => {
            const response = await axiosApi.get<{ data: UserType }>("/iam/user/me");
            return response.data.data;
        },
        onSuccess: (user) => {
            setCredentials(user);
        },
    });
};
