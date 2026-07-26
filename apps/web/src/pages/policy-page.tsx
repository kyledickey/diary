import { marked } from "marked";
import Footer from "@/components/footer";
import Navbar from "@/components/navbar";
import changelog from "@/policies/cl.md?raw";
import privacy from "@/policies/privacy.md?raw";
import terms from "@/policies/terms.md?raw";

const policies = {
    changelog,
    privacy,
    terms
};

export function PolicyPage({ policy }: { policy: keyof typeof policies }) {
    const contentHtml = marked.parse(policies[policy]) as string;

    return (
        <div className="flex min-h-screen flex-col items-center justify-center">
            <Navbar />
            <div className="text-foreground my-10 mt-12 flex w-full flex-1 flex-col items-start sm:mt-0 sm:w-3/4">
                <article className="mb-8 flex w-full flex-col p-4 sm:mt-8">
                    <section
                        className="blog-content gap-4"
                        // Policies are trusted, repository-owned Markdown.
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: The source is static repository content, never user input.
                        dangerouslySetInnerHTML={{ __html: contentHtml }}
                    />
                </article>
            </div>
            <Footer />
        </div>
    );
}
