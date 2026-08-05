import { Outlet } from "@tanstack/react-router";
import EntriesMenu from "@/components/layout/entries-menu";
import Link from "@/components/shared/link";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useTypingFocus } from "@/hooks/use-typing-focus";
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
    const isTyping = useTypingFocus();

    return (
        <div className="relative flex min-h-screen w-full flex-col">
            {/* Keep the entries menu aligned with the nav controls at each breakpoint. */}
            <div className="fixed top-2 left-6 z-20 md:top-10 md:left-8">
                <EntriesMenu dimmed={isTyping} />
            </div>
            <Outlet />
        </div>
    );
}

function SignedOutEntry() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-12 sm:p-4">
            <p className="text-foreground/60 mb-8 text-center">Please sign in to continue</p>
            <div className="flex w-full flex-col items-center justify-center gap-2 sm:w-1/3">
                <Button className="w-full" render={<Link href="/sign-in" />}>
                    Sign in
                </Button>
                <Button variant="outline" className="w-full" render={<Link href="/" />}>
                    <span className="text-foreground/60 text-xs font-medium">Go home</span>
                </Button>
            </div>
        </div>
    );
}
