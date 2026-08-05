import { useEffect, useRef, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";

export function BillingPage({ action }: { action: "manage" | "upgrade" }) {
    const session = authClient.useSession();
    const started = useRef(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (session.isPending || started.current) {
            return;
        }

        if (!session.data?.user) {
            window.location.replace("/sign-in");
            return;
        }

        started.current = true;
        const origin = window.location.origin;
        const request =
            action === "upgrade"
                ? authClient.subscription.upgrade({
                      plan: "plus",
                      successUrl: `${origin}/entry`,
                      cancelUrl: `${origin}/pricing`,
                      returnUrl: `${origin}/billing`
                  })
                : authClient.subscription.billingPortal({
                      returnUrl: `${origin}/entry`
                  });

        void request.then(({ data, error: authError }) => {
            if (authError) {
                setError(authError.message ?? "Stripe could not be opened");
                started.current = false;
                return;
            }
            if (data?.url) {
                window.location.assign(data.url);
            }
        });
    }, [action, session.data?.user, session.isPending]);

    return (
        <div className="flex min-h-screen flex-col items-center justify-center px-4">
            {error ? (
                <p className="mb-4 text-center text-sm text-red-500">{error}</p>
            ) : (
                <p className="text-foreground/60 mb-4 text-center text-sm">
                    Please wait while we redirect you to Stripe.
                </p>
            )}
            <Spinner className="h-8 w-8" />
        </div>
    );
}
