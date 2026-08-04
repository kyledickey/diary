import { Outlet } from "@tanstack/react-router";
import Link from "@/components/link";
import Sidebar from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import Spinner from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";

export function EntryLayout() {
    const session = authClient.useSession();

    if (session.isPending) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Spinner className="h-7 w-7" />
            </div>
        );
    }

    return session.data?.user ? <EntryShell /> : <SignedOutEntry />;
}

function EntryShell() {
    return (
        <>
            <div className="hidden md:grid md:grid-cols-[auto,1fr]">
                <div className="sticky top-0 z-50 flex h-screen w-full max-w-72 items-center justify-center">
                    <Sidebar />
                </div>
                <div className="flex min-h-screen w-full items-center justify-center">
                    <Outlet />
                </div>
            </div>
            <div className="flex min-h-screen w-full items-center justify-center px-4 pb-8 md:hidden">
                <Sidebar />
                <Outlet />
            </div>
        </>
    );
}

function SignedOutEntry() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-12 sm:p-4">
            <p className="text-foreground/60 mb-8 text-center">Please sign in to continue</p>
            <div className="flex w-full flex-col items-center justify-center gap-2 sm:w-1/3">
                <Button className="w-full" asChild>
                    <Link href="/sign-in">Sign in</Link>
                </Button>
                <Button variant="outline" className="w-full" asChild>
                    <Link href="/">
                        <span className="text-foreground/60 text-xs font-medium">Go home</span>
                    </Link>
                </Button>
            </div>
        </div>
    );
}
