import { useMutation, useQuery } from "@tanstack/react-query";
import { axiosApi } from "@/shared/api";
import { useAuthStore, type UserType } from "@/modules";

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
