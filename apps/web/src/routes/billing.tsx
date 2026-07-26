import { createFileRoute } from "@tanstack/react-router";
import { BillingPage } from "@/pages/billing-page";

export const Route = createFileRoute("/billing")({
    component: BillingPage,
    head: () => ({ meta: [{ title: "Diary - Billing" }] })
});
