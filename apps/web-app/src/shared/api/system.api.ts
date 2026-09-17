import { useQuery } from "@tanstack/react-query";
import { axiosApi } from "@/shared/api";

export const useHealthCheckQuery = (enabled: boolean = true) => {
    return useQuery({
        queryKey: ["healthCheck"],
        queryFn: async () => {
            const response = await axiosApi.get<{ status: string }>("/health");
            return response.data;
        },
        enabled,
        retry: false,
    });
};
