import { createFileRoute } from "@tanstack/react-router";
import { PolicyPage } from "@/pages/policy-page";

export const Route = createFileRoute("/changelog")({
    component: () => <PolicyPage policy="changelog" />,
    head: () => ({ meta: [{ title: "Diary - Changelog" }] })
});
