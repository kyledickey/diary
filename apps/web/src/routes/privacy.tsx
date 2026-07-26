import { createFileRoute } from "@tanstack/react-router";
import { PolicyPage } from "@/pages/policy-page";

export const Route = createFileRoute("/privacy")({
    component: () => <PolicyPage policy="privacy" />,
    head: () => ({ meta: [{ title: "Diary - privacy policy" }] })
});
