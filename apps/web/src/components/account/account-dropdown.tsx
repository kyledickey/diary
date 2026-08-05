import {
    Code2Icon,
    DollarSignIcon,
    HelpCircleIcon,
    LogOutIcon,
    MoonIcon,
    SettingsIcon,
    StarIcon,
    SunIcon
} from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import Link from "@/components/shared/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    Menu,
    MenuGroup,
    MenuItem,
    MenuLinkItem,
    MenuPopup,
    MenuSeparator,
    MenuTrigger
} from "@/components/ui/menu";
import { usePlan } from "@/features/auth/queries";
import { useAnalytics } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";
import SettingsDialog from "./settings-dialog";

interface AccountDropdownProps {
    variant?: "navbar" | "sidebar";
}

export default function AccountDropdown({ variant = "sidebar" }: AccountDropdownProps) {
    const session = authClient.useSession();
    const { plan } = usePlan();
    const { setTheme, theme } = useTheme();
    const track = useAnalytics();
    const [accountSettingsOpen, setAccountSettingsOpen] = useState(false);
    const user = session.data?.user;
    const displayName = user?.name || user?.email || "Account";

    async function signOut() {
        track("sign_out");
        await authClient.signOut();
        window.location.assign("/");
    }

    return (
        <>
            <Menu>
                <MenuTrigger
                    render={
                        <Button
                            variant={variant === "sidebar" ? "outline" : "ghost"}
                            className={
                                variant === "navbar"
                                    ? "size-8 rounded-full p-0"
                                    : "flex w-full items-center justify-start gap-2 text-left font-normal"
                            }
                        />
                    }
                >
                    <span className="flex min-w-0 items-center gap-2">
                        <Avatar className={variant === "navbar" ? "size-6" : "size-5"}>
                            <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
                            <AvatarImage
                                src={user?.image ?? undefined}
                                alt={`${displayName}'s avatar`}
                            />
                        </Avatar>
                        <span className={variant === "navbar" ? "sr-only" : "truncate text-sm"}>
                            {displayName}
                        </span>
                    </span>
                </MenuTrigger>
                <MenuPopup
                    align={variant === "sidebar" ? "start" : "end"}
                    side={variant === "sidebar" ? "top" : "bottom"}
                    className="w-56"
                >
                    <MenuGroup>
                        <MenuItem onClick={() => setAccountSettingsOpen(true)}>
                            <SettingsIcon aria-hidden="true" />
                            Settings
                        </MenuItem>
                        <MenuLinkItem
                            render={<Link href={plan === "plus" ? "/billing" : "/upgrade"} />}
                        >
                            <DollarSignIcon aria-hidden="true" />
                            {plan === "plus" ? "Billing" : "Upgrade"}
                        </MenuLinkItem>
                        <MenuSeparator />
                        <MenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                            <MoonIcon
                                aria-hidden="true"
                                className="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
                            />
                            <SunIcon
                                aria-hidden="true"
                                className="absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
                            />
                            Toggle theme
                        </MenuItem>
                    </MenuGroup>
                    <MenuSeparator />
                    <MenuLinkItem
                        render={<Link href="https://github.com/dickeyy/diary" target="_blank" />}
                    >
                        <Code2Icon aria-hidden="true" />
                        GitHub
                    </MenuLinkItem>
                    <MenuLinkItem
                        render={
                            <Link href="https://github.com/dickeyy/diary/issues" target="_blank" />
                        }
                    >
                        <HelpCircleIcon aria-hidden="true" />
                        Support
                    </MenuLinkItem>
                    <MenuLinkItem render={<Link href="/changelog" />}>
                        <StarIcon aria-hidden="true" />
                        Changelog
                    </MenuLinkItem>
                    <MenuSeparator />
                    <MenuItem variant="destructive" onClick={() => void signOut()}>
                        <LogOutIcon aria-hidden="true" />
                        Sign out
                    </MenuItem>
                </MenuPopup>
            </Menu>

            <SettingsDialog open={accountSettingsOpen} onOpenChange={setAccountSettingsOpen} />
        </>
    );
}
