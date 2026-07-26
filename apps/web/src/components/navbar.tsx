import { useAuth } from "@clerk/tanstack-react-start";
import type { VariantProps } from "class-variance-authority";
import AccountDropdown from "./account-dropdown";
import Link from "./link";
import { Button, type buttonVariants } from "./ui/button";

interface NavbarProps {
    active?: "home" | "pricing" | "sign-up" | "sign-in";
}

export default function Navbar({ active }: NavbarProps) {
    const { isSignedIn } = useAuth();

    return (
        <nav className="glass-blur bg-card/20 sticky top-4 z-50 flex w-fit items-center justify-between rounded-full border p-1 shadow-md">
            <div className="flex items-center gap-1 sm:gap-2">
                <NavbarButton href="/home" active={active === "home"}>
                    About
                </NavbarButton>
                <NavbarButton href="/pricing" active={active === "pricing"}>
                    Pricing
                </NavbarButton>

                {isSignedIn ? (
                    <>
                        <NavbarButton href="/entry">Write</NavbarButton>
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
            asChild
            className={`h-fit rounded-full px-4 py-1 text-[14px] ${
                active ? "font-serif font-bold" : ""
            }`}
        >
            <Link href={href}>{children}</Link>
        </Button>
    );
}
