import { useAuth } from "@clerk/tanstack-react-start";
import { useEffect, useRef } from "react";
import Spinner from "@/components/ui/spinner";
import { useBillingPortalMutation } from "@/features/billing/queries";

export function BillingPage() {
    const { isLoaded, isSignedIn } = useAuth();
    const portal = useBillingPortalMutation();
    const started = useRef(false);

    useEffect(() => {
        if (!isLoaded || started.current) {
            return;
        }

        if (!isSignedIn) {
            window.location.replace("/sign-in");
            return;
        }

        started.current = true;
        void portal
            .mutateAsync()
            .then(({ url }) => window.location.assign(url))
            .catch(() => {
                started.current = false;
            });
    }, [isLoaded, isSignedIn, portal.mutateAsync]);

    return (
        <div className="flex min-h-screen flex-col items-center justify-center px-4">
            {portal.isError ? (
                <p className="mb-4 text-center text-sm text-red-500">{portal.error.message}</p>
            ) : (
                <p className="text-foreground/60 mb-4 text-center text-sm">
                    Please wait while we redirect you to Stripe.
                </p>
            )}
            <Spinner className="h-8 w-8" />
        </div>
    );
}
