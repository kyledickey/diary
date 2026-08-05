import "@fontsource-variable/geist-mono";
import "@fontsource-variable/inter";
import "@fontsource/averia-serif-libre/300.css";
import "@fontsource/averia-serif-libre/400.css";
import "@fontsource/averia-serif-libre/700.css";
import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AnchoredToastProvider, ToastProvider } from "@/components/ui/toast";
import { ErrorPage, NotFoundPage } from "@/pages/error-pages";
import appCss from "@/styles/globals.css?url";

export const Route = createRootRoute({
    head: () => ({
        meta: [
            { charSet: "utf-8" },
            {
                name: "viewport",
                content: "width=device-width, initial-scale=1"
            },
            { title: "Diary - diary.kyle.so" },
            {
                name: "description",
                content: "A private and secure place to keep track of your thoughts."
            },
            {
                property: "og:type",
                content: "website"
            },
            {
                property: "og:title",
                content: "Diary - diary.kyle.so"
            },
            {
                property: "og:description",
                content: "A private and secure place to keep track of your thoughts."
            },
            {
                property: "og:image",
                content: "https://diary.kyle.so/og-image.png"
            },
            {
                name: "twitter:card",
                content: "summary_large_image"
            },
            {
                name: "twitter:creator",
                content: "@kyledickeyy"
            },
            {
                name: "keywords",
                content:
                    "diary, privacy, security, journal, thoughts, journaling, self-reflection, mindfulness"
            },
            {
                name: "robots",
                content: "index, follow, max-snippet:-1, max-image-preview:large"
            }
        ],
        links: [
            { rel: "stylesheet", href: appCss },
            { rel: "icon", href: "/favicon.ico" },
            { rel: "apple-touch-icon", href: "/apple-icon.png" },
            { rel: "canonical", href: "https://diary.kyle.so" }
        ],
        scripts: [
            {
                src: "https://cdn.visitors.now/v.js",
                defer: true,
                "data-token": "25bc8e07-7b58-4933-bbe4-c034225831f7"
            }
        ]
    }),
    shellComponent: RootDocument,
    errorComponent: ({ error, reset }) => <ErrorPage error={error} reset={reset} />,
    notFoundComponent: NotFoundPage
});

function RootDocument({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <HeadContent />
            </head>
            <body className="relative isolate min-h-screen overflow-auto bg-background font-sans antialiased">
                <ThemeProvider
                    attribute="class"
                    defaultTheme="dark"
                    enableSystem
                    disableTransitionOnChange
                >
                    <ToastProvider position="top-right">
                        <AnchoredToastProvider>{children}</AnchoredToastProvider>
                    </ToastProvider>
                </ThemeProvider>
                <Scripts />
            </body>
        </html>
    );
}
