import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../store/auth.store";
import { api } from "@/shared/utils/api";
import type { UserType, RegisterUserType } from "@/types/user-types";

// 1. Sign In Mutation
export const useSigninMutation = () => {
    // Zustand hooks can be used directly inside other hooks!
    const setCredentials = useAuthStore((state) => state.setCredentials);

    return useMutation({
        mutationFn: async (token: string) => {
            const response = await api.post<{ user: UserType }>(
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

// 2. Sign Up Mutation
export const useSignupMutation = () => {
    return useMutation({
        mutationFn: async (body: Omit<RegisterUserType, "confirmPassword">) => {
            const response = await api.post<{ user: UserType; token: string }>("/auth/signup", body);
            return response.data;
        },
    });
};

// 3. Sign Out Mutation
export const useSignoutMutation = () => {
    const logOut = useAuthStore((state) => state.logOut);
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            await api.post("/auth/signout");
        },
        onSettled: () => {
            // Whether the server call succeeds or fails (e.g. offline),
            // force the local logout anyway.

            // 1. Clear Zustand state (localStorage is automatically cleared!)
            logOut();

            // 2. Clear all TanStack Query cache (equivalent to resetApiState)
            queryClient.clear();

            // 3. Redirect
            window.location.href = "/signin";
        },
    });
};
