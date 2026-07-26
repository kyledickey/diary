import { createFileRoute } from "@tanstack/react-router";
import { EntryIndexPage } from "@/pages/entry-index-page";

export const Route = createFileRoute("/entry/")({
    component: EntryIndexPage
});
