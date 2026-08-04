import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/pages/auth-page";

export const Route = createFileRoute("/sign-up")({
    component: () => <AuthPage mode="sign-up" />,
    head: () => ({ meta: [{ title: "Get started - Diary" }] })
});
