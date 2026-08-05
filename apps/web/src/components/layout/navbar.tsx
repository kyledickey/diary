import type { VariantProps } from "class-variance-authority";
import { authClient } from "@/lib/auth-client";
import AccountDropdown from "@/components/account/account-dropdown";
import Link from "@/components/shared/link";
import { Button, type buttonVariants } from "@/components/ui/button";

interface NavbarProps {
    active?: "home" | "pricing" | "sign-up" | "sign-in";
}

export default function Navbar({ active }: NavbarProps) {
    const session = authClient.useSession();
    const isSignedIn = Boolean(session.data?.user);

    return (
        <nav className="bg-card/80 sticky top-4 z-50 flex w-it items-center rounded-full border p-1 shadow-md backdrop-blur-md">
            <div className="flex items-center gap-1 sm:gap-2">
                <NavbarButton href="/home" active={active === "home"}>
                    About
                </NavbarButton>
                <NavbarButton href="/pricing" active={active === "pricing"}>
                    Pricing
                </NavbarButton>

                {isSignedIn ? (
                    <>
                        <NavbarButton href="/entry" variant="default">
                            Write
                        </NavbarButton>
                        <span aria-hidden="true" className="mx-0.5 h-5 w-px bg-border" />
                        <AccountDropdown variant="navbar" />
                    </>
                ) : (
                    <>
                        <NavbarButton href="/sign-in" active={active === "sign-in"}>
                            Sign in
                        </NavbarButton>
                        <NavbarButton
                            href="/sign-up"
                            active={active === "sign-up"}
                            variant="default"
                        >
                            Get Started
                        </NavbarButton>
                    </>
                )}
            </div>
        </nav>
    );
}

interface NavbarButtonProps {
    href: string;
    children: React.ReactNode;
    active?: boolean;
    variant?: VariantProps<typeof buttonVariants>["variant"];
}

function NavbarButton({ href, children, active, variant = "ghost" }: NavbarButtonProps) {
    return (
        <Button
            variant={active ? "secondary" : variant}
            render={<Link href={href} />}
            className={`h-fit rounded-full px-4 py-1 text-[14px] ${
                active ? "font-serif font-bold" : ""
            }`}
        >
            {children}
        </Button>
    );
}
