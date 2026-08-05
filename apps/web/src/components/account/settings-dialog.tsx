import { MonitorIcon, MoonIcon, SunIcon, Trash2Icon } from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import Link from "@/components/shared/link";
import {
    AlertDialog,
    AlertDialogClose,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogPopup,
    AlertDialogTitle,
    AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogDescription,
    DialogHeader,
    DialogPanel,
    DialogPopup,
    DialogTitle
} from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { usePlan } from "@/features/auth/queries";
import { authClient } from "@/lib/auth-client";

interface SettingsDialogProps {
    open: boolean;
    onOpenChange(open: boolean): void;
}

export default function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
    const session = authClient.useSession();
    const { plan } = usePlan();
    const { setTheme, theme } = useTheme();
    const user = session.data?.user;
    const displayName = user?.name || user?.email || "Account";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogPopup>
                <DialogHeader>
                    <DialogTitle>Settings</DialogTitle>
                    <DialogDescription>Manage your preferences and account.</DialogDescription>
                </DialogHeader>
                <DialogPanel className="flex flex-col gap-4">
                    <div className="divide-y rounded-lg border">
                        <div className="flex items-center gap-3 p-4">
                            <Avatar className="size-9">
                                <AvatarFallback>
                                    {displayName.charAt(0).toUpperCase()}
                                </AvatarFallback>
                                <AvatarImage
                                    src={user?.image ?? undefined}
                                    alt={`${displayName}'s avatar`}
                                />
                            </Avatar>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">Account</p>
                                <p className="truncate text-xs text-muted-foreground">
                                    {user?.email}
                                </p>
                            </div>
                            <Badge
                                variant={plan === "plus" ? "success" : "outline"}
                                className="capitalize px-1.5 py-1 w-fit"
                            >
                                {plan}
                            </Badge>
                        </div>

                        <div className="flex items-center justify-between gap-4 p-4">
                            <div>
                                <p className="text-sm font-medium">Theme</p>
                                <p className="text-xs text-muted-foreground">
                                    Choose how Diary looks.
                                </p>
                            </div>
                            <ToggleGroup
                                aria-label="Color theme"
                                value={[theme ?? "system"]}
                                variant="outline"
                                size="sm"
                                onValueChange={(value) => {
                                    const nextTheme = value[0];
                                    if (nextTheme) {
                                        setTheme(nextTheme);
                                    }
                                }}
                            >
                                <ToggleGroupItem value="system" aria-label="Use system theme">
                                    <MonitorIcon aria-hidden="true" />
                                </ToggleGroupItem>
                                <ToggleGroupItem value="light" aria-label="Use light theme">
                                    <SunIcon aria-hidden="true" />
                                </ToggleGroupItem>
                                <ToggleGroupItem value="dark" aria-label="Use dark theme">
                                    <MoonIcon aria-hidden="true" />
                                </ToggleGroupItem>
                            </ToggleGroup>
                        </div>

                        <div className="flex items-center justify-between gap-4 p-4">
                            <div>
                                <p className="text-sm font-medium">Plan</p>
                                <p className="text-xs text-muted-foreground">
                                    Manage billing and subscription.
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                render={<Link href={plan === "plus" ? "/billing" : "/upgrade"} />}
                            >
                                {plan === "plus" ? "Manage" : "Upgrade"}
                            </Button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                        <div>
                            <p className="text-sm font-medium">Delete account</p>
                            <p className="text-xs text-muted-foreground">
                                Permanently delete your account and entries.
                            </p>
                        </div>
                        <DeleteAccountDialog />
                    </div>
                </DialogPanel>
            </DialogPopup>
        </Dialog>
    );
}

function DeleteAccountDialog() {
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    async function deleteAccount() {
        setDeleteError(null);
        setIsDeleting(true);

        const { error } = await authClient.deleteUser();
        if (error) {
            setDeleteError(error.message ?? "Your account could not be deleted.");
            setIsDeleting(false);
            return;
        }

        window.location.assign("/");
    }

    return (
        <AlertDialog onOpenChange={(open) => !open && setDeleteError(null)}>
            <AlertDialogTrigger render={<Button variant="destructive" size="sm" />}>
                <Trash2Icon aria-hidden="true" />
                Delete
            </AlertDialogTrigger>
            <AlertDialogPopup>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This permanently deletes your Diary account and every journal entry. This
                        action cannot be undone.
                    </AlertDialogDescription>
                    {deleteError ? (
                        <p role="alert" className="text-sm text-destructive-foreground">
                            {deleteError}
                        </p>
                    ) : null}
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogClose disabled={isDeleting} render={<Button variant="ghost" />}>
                        Cancel
                    </AlertDialogClose>
                    <Button
                        variant="destructive"
                        loading={isDeleting}
                        onClick={() => void deleteAccount()}
                    >
                        Delete account
                    </Button>
                </AlertDialogFooter>
            </AlertDialogPopup>
        </AlertDialog>
    );
}
