import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/modules";
import { axiosApi } from "@/shared/api";
import type { UserType, RegisterUserType } from "@/modules";

// Sign In Mutation
export const useSigninMutation = () => {
    // Zustand hooks can be used directly inside other hooks
    const setCredentials = useAuthStore((state) => state.setCredentials);

    return useMutation({
        mutationFn: async (token: string) => {
            const response = await axiosApi.post<{ user: UserType }>(
                "/auth",
                {},
                {
                    headers: { Authorization: `Bearer ${token}` },
                },
            );
            return response.data;
        },
        onSuccess: (data) => {
            // Instantly update Zustand state on success
            setCredentials(data.user);
        },
    });
};

// Sign Up Mutation
export const useSignupMutation = () => {
    return useMutation({
        mutationFn: async (body: Omit<RegisterUserType, "confirmPassword">) => {
            const response = await axiosApi.post<{ user: UserType; token: string }>("/auth/signup", body);
            return response.data;
        },
    });
};

// Sign Out Mutation
export const useSignoutMutation = () => {
    const logOut = useAuthStore((state) => state.logOut);
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            await axiosApi.post("/auth/signout");
        },
        onSettled: () => {
            // Whether the server call succeeds or fails (e.g. offline), force the local logout anyway.

            logOut();

            queryClient.clear();

            window.location.href = "/signin";
        },
    });
};

export const useGetMeQuery = (enabled: boolean) => {
    return useQuery({
        queryKey: ["me"],
        queryFn: async () => {
            const response = await axiosApi.get<{ data: UserType }>("/iam/user/me");
            return response.data.data;
        },
        enabled,
    });
};
