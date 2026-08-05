import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/pages/auth-page";

export const Route = createFileRoute("/sign-in")({
    component: () => <AuthPage mode="sign-in" />,
    head: () => ({ meta: [{ title: "Sign in - Diary" }] })
});
