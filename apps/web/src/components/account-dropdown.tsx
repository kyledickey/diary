import { UserProfile, useClerk, useUser } from "@clerk/tanstack-react-start";
import { ChatBubbleIcon, DotsHorizontalIcon, SunIcon } from "@radix-ui/react-icons";
import {
    ArrowUpCircleIcon,
    Code2Icon,
    DollarSignIcon,
    HelpCircleIcon,
    LogOutIcon,
    MoonIcon,
    SettingsIcon,
    StarIcon
} from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { useAnalytics } from "@/lib/analytics";
import FeedbackDialog from "./feedback-dialog";
import Link from "./link";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Dialog, DialogContent } from "./ui/dialog";
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
    const { user } = useUser();
    const { signOut } = useClerk();
    const { setTheme, theme } = useTheme();
    const track = useAnalytics();
    const [accountSettingsOpen, setAccountSettingsOpen] = useState(false);
    const [feedbackOpen, setFeedbackOpen] = useState(false);

    const displayName = user?.username ?? user?.primaryEmailAddress?.emailAddress ?? "Account";

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
                                <AvatarFallback>{displayName.charAt(0)}</AvatarFallback>
                                <AvatarImage src={user?.imageUrl} alt={`${displayName}'s avatar`} />
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
                            <Link href="/billing">
                                <DollarSignIcon className="mr-2 h-4 w-4" />
                                Billing
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
                    {user?.publicMetadata.plan === "free" ? (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                asChild
                                className="bg-yellow-500 text-black focus:bg-yellow-500/80 focus:text-black"
                            >
                                <Link href="/billing">
                                    <ArrowUpCircleIcon className="mr-2 h-4 w-4" />
                                    Upgrade
                                </Link>
                            </DropdownMenuItem>
                        </>
                    ) : null}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        className="focus:bg-red-500/20"
                        onSelect={() => {
                            track("sign_out");
                            void signOut();
                        }}
                    >
                        <LogOutIcon className="mr-2 h-4 w-4" />
                        Sign out
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={accountSettingsOpen} onOpenChange={setAccountSettingsOpen}>
                <DialogContent className="flex w-fit max-w-full items-center justify-center p-8">
                    <UserProfile routing="hash" />
                </DialogContent>
            </Dialog>
            <FeedbackDialog isOpen={feedbackOpen} onStateChange={setFeedbackOpen} />
        </>
    );
}
