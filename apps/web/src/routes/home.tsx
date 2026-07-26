import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/pages/home-page";

export const Route = createFileRoute("/home")({
    component: HomePage,
    head: () => ({ meta: [{ title: "Diary - About" }] })
});
