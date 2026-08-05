import { createFileRoute } from "@tanstack/react-router";
import { BillingPage } from "@/pages/billing-page";

export const Route = createFileRoute("/upgrade")({
    component: () => <BillingPage action="upgrade" />,
    head: () => ({ meta: [{ title: "Diary - Upgrade" }] })
});
