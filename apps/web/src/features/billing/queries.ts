import { useAuth } from "@clerk/tanstack-react-start";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export function useBillingPortalMutation() {
    const { getToken } = useAuth();

    return useMutation({
        mutationFn: () => apiClient.createBillingPortal(getToken)
    });
}
