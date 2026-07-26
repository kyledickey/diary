import "@fontsource-variable/inter";
import "@fontsource/averia-serif-libre/300.css";
import "@fontsource/averia-serif-libre/400.css";
import "@fontsource/averia-serif-libre/700.css";
import "@fontsource-variable/jetbrains-mono";
import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import Providers from "@/components/providers";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
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
                src: "https://a.kyle.so/js/script.tagged-events.js",
                defer: true,
                "data-domain": "diary.kyle.so"
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
            <body className="bg-background min-h-screen overflow-auto font-sans antialiased">
                <Providers>
                    <ThemeProvider
                        attribute="class"
                        defaultTheme="dark"
                        enableSystem
                        disableTransitionOnChange
                    >
                        {children}
                        <Toaster richColors position="top-right" />
                    </ThemeProvider>
                </Providers>
                <Scripts />
            </body>
        </html>
    );
}
