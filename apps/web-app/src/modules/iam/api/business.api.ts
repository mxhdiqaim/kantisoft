import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosApi } from "@/shared/api";
import type { BusinessType, CreateBusinessType } from "@/modules/iam/types";

// Create Business
export const useCreateBusinessMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CreateBusinessType) => {
            const response = await axiosApi.post<{ data: BusinessType }>("/iam/business", data);
            return response.data.data;
        },
        onSuccess: () => {
            // Automatically refetch the businesses list when a new one is created!
            queryClient.invalidateQueries({ queryKey: ["businesses"] });
        },
    });
};

// Fetch single business
export const useGetBusinessByIdQuery = (id: string) => {
    return useQuery({
        queryKey: ["business", id],
        queryFn: async () => {
            const response = await axiosApi.get<{ data: BusinessType }>(`/iam/business/${id}`);
            return response.data.data;
        },
        enabled: !!id,
    });
};

// Update Business
export const useUpdateBusinessMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...patch }: Partial<CreateBusinessType> & { id: string }) => {
            const response = await axiosApi.patch<{ data: BusinessType }>(`/iam/business/${id}`, patch);
            return response.data.data;
        },
        onSuccess: (_data, variables) => {
            // Refetch the list AND the specific business that was just updated
            queryClient.invalidateQueries({ queryKey: ["businesses"] });
            queryClient.invalidateQueries({ queryKey: ["business", variables.id] });
        },
    });
};
