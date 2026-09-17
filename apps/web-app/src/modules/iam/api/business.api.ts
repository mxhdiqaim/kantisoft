import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosApi } from "@/shared/api";
import type { BusinessType, CreateBusinessType } from "@/modules/iam/types";

// Fetch all businesses
export const useGetBusinessesQuery = () => {
    return useQuery({
        queryKey: ["businesses"],
        queryFn: async () => {
            const response = await axiosApi.get<{ data: BusinessType[] }>("/business");

            return response.data.data;
        },
    });
};

// Fetch single business
export const useGetBusinessByIdQuery = (id: string) => {
    return useQuery({
        queryKey: ["business", id],
        queryFn: async () => {
            const response = await axiosApi.get<{ data: BusinessType }>(`/business/${id}`);
            return response.data.data;
        },
        enabled: !!id,
    });
};

// Create Business
export const useCreateBusinessMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CreateBusinessType) => {
            const response = await axiosApi.post<{ data: BusinessType }>("/business", data);
            return response.data.data;
        },
        onSuccess: () => {
            // Automatically refetch the businesses list when a new one is created!
            queryClient.invalidateQueries({ queryKey: ["businesses"] });
        },
    });
};

// Update Business
export const useUpdateBusinessMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...patch }: Partial<CreateBusinessType> & { id: string }) => {
            const response = await axiosApi.patch<{ data: BusinessType }>(`/business/${id}`, patch);
            return response.data.data;
        },
        onSuccess: (_data, variables) => {
            // Refetch the list AND the specific business that was just updated
            queryClient.invalidateQueries({ queryKey: ["businesses"] });
            queryClient.invalidateQueries({ queryKey: ["business", variables.id] });
        },
    });
};
