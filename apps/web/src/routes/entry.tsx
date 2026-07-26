import { createFileRoute } from "@tanstack/react-router";
import { EntryLayout } from "@/pages/entry-layout";

export const Route = createFileRoute("/entry")({
    component: EntryLayout,
    head: () => ({ meta: [{ title: "Diary - Entries" }] })
});
