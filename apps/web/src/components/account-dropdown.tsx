import { ChatBubbleIcon, DotsHorizontalIcon, SunIcon } from "@radix-ui/react-icons";
import {
    Code2Icon,
    DollarSignIcon,
    HelpCircleIcon,
    LogOutIcon,
    MoonIcon,
    SettingsIcon,
    StarIcon,
    Trash2Icon
} from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { usePlan } from "@/features/auth/queries";
import { useAnalytics } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";
import FeedbackDialog from "./feedback-dialog";
import Link from "./link";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "./ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "./ui/dropdown-menu";

interface AccountDropdownProps {
    variant?: "navbar" | "sidebar";
}

export default function AccountDropdown({ variant = "sidebar" }: AccountDropdownProps) {
    const session = authClient.useSession();
    const { plan } = usePlan();
    const { setTheme, theme } = useTheme();
    const track = useAnalytics();
    const [accountSettingsOpen, setAccountSettingsOpen] = useState(false);
    const [feedbackOpen, setFeedbackOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const user = session.data?.user;
    const displayName = user?.name || user?.email || "Account";

    async function signOut() {
        track("sign_out");
        await authClient.signOut();
        window.location.assign("/");
    }

    async function deleteAccount() {
        if (
            !window.confirm(
                "Delete your Diary account and every journal entry? This cannot be undone."
            )
        ) {
            return;
        }

        setDeleteError(null);
        setIsDeleting(true);
        const { error } = await authClient.deleteUser();
        if (error) {
            setDeleteError(error.message ?? "Your account could not be deleted");
            setIsDeleting(false);
            return;
        }
        window.location.assign("/");
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        className={
                            variant === "navbar"
                                ? "flex h-fit w-full items-center gap-2 rounded-full py-1 pl-1 pr-4 text-left"
                                : "flex h-fit w-full items-center justify-between gap-3 px-1 py-1 pr-2 text-left"
                        }
                    >
                        <span className="flex min-w-0 items-center gap-2">
                            <Avatar className={variant === "navbar" ? "h-5 w-5" : "h-6 w-6"}>
                                <AvatarFallback>
                                    {displayName.charAt(0).toUpperCase()}
                                </AvatarFallback>
                                <AvatarImage
                                    src={user?.image ?? undefined}
                                    alt={`${displayName}'s avatar`}
                                />
                            </Avatar>
                            <span className="truncate text-[14px]">{displayName}</span>
                        </span>
                        {variant === "sidebar" ? (
                            <DotsHorizontalIcon className="text-foreground/60" />
                        ) : null}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                    <DropdownMenuGroup>
                        <DropdownMenuItem onSelect={() => setAccountSettingsOpen(true)}>
                            <SettingsIcon className="mr-2 h-4 w-4" />
                            Account Settings
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href={plan === "plus" ? "/billing" : "/upgrade"}>
                                <DollarSignIcon className="mr-2 h-4 w-4" />
                                {plan === "plus" ? "Billing" : "Upgrade"}
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="gap-2"
                            onSelect={() => setTheme(theme === "dark" ? "light" : "dark")}
                        >
                            <MoonIcon className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                            <SunIcon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                            Toggle theme
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                        <Link href="https://github.com/dickeyy/diary" target="_blank">
                            <Code2Icon className="mr-2 h-4 w-4" />
                            GitHub
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href="https://github.com/dickeyy/diary/issues" target="_blank">
                            <HelpCircleIcon className="mr-2 h-4 w-4" />
                            Support
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setFeedbackOpen(true)}>
                        <ChatBubbleIcon className="mr-2 h-4 w-4" />
                        Feedback
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href="/changelog">
                            <StarIcon className="mr-2 h-4 w-4" />
                            Changelog
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        className="focus:bg-red-500/20"
                        onSelect={() => void signOut()}
                    >
                        <LogOutIcon className="mr-2 h-4 w-4" />
                        Sign out
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={accountSettingsOpen} onOpenChange={setAccountSettingsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Account</DialogTitle>
                        <DialogDescription>
                            Your journal is connected to {user?.email ?? "your email address"}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="rounded-lg border p-4">
                        <p className="text-sm font-medium">{displayName}</p>
                        <p className="text-muted-foreground mt-1 text-sm">{user?.email}</p>
                        <p className="text-muted-foreground mt-3 text-xs capitalize">{plan} plan</p>
                    </div>
                    {deleteError ? <p className="text-sm text-red-500">{deleteError}</p> : null}
                    <DialogFooter>
                        <Button
                            variant="destructive"
                            onClick={() => void deleteAccount()}
                            disabled={isDeleting}
                        >
                            <Trash2Icon className="mr-2 h-4 w-4" />
                            {isDeleting ? "Deleting…" : "Delete account"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <FeedbackDialog isOpen={feedbackOpen} onStateChange={setFeedbackOpen} />
        </>
    );
}
