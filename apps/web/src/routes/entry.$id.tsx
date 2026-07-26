import { createFileRoute } from "@tanstack/react-router";
import { EntryDocumentPage } from "@/pages/entry-document-page";

export const Route = createFileRoute("/entry/$id")({
    component: () => {
        const { id } = Route.useParams();
        return <EntryDocumentPage id={id} />;
    }
});
