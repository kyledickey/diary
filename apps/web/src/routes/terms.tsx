import { createFileRoute } from "@tanstack/react-router";
import { PolicyPage } from "@/pages/policy-page";

export const Route = createFileRoute("/terms")({
    component: () => <PolicyPage policy="terms" />,
    head: () => ({ meta: [{ title: "Diary - terms of service" }] })
});
