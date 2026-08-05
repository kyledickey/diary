import type { Plan } from "@diary/contracts";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

export const authKeys = {
    plan: ["auth", "plan"] as const
};

export function usePlan() {
    const session = authClient.useSession();
    const query = useQuery({
        queryKey: authKeys.plan,
        queryFn: async () => {
            const { data, error } = await authClient.subscription.list();
            if (error) {
                throw new Error(error.message ?? "Could not load your subscription");
            }
            const active = data?.some(
                (subscription) =>
                    subscription.plan === "plus" &&
                    (subscription.status === "active" || subscription.status === "trialing")
            );
            return (active ? "plus" : "free") satisfies Plan;
        },
        enabled: Boolean(session.data?.user),
        staleTime: 60_000
    });

    return {
        ...query,
        plan: query.data ?? ("free" satisfies Plan),
        isLoaded: !session.isPending && (!session.data?.user || !query.isPending)
    };
}
