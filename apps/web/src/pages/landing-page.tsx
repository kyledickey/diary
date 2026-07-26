import { useAuth } from "@clerk/tanstack-react-start";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect } from "react";
import Footer from "@/components/footer";
import Link from "@/components/link";
import Navbar from "@/components/navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAnalytics } from "@/lib/analytics";

export function LandingPage() {
    const { isLoaded, isSignedIn } = useAuth();
    const navigate = useNavigate();
    const track = useAnalytics();

    useEffect(() => {
        if (isLoaded && isSignedIn) {
            track("home_page_authed_redirect");
            void navigate({ to: "/entry", replace: true });
        }
    }, [isLoaded, isSignedIn, navigate, track]);

    return (
        <div className="flex min-h-screen flex-col items-center justify-center overflow-y-hidden">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeInOut", delay: 0.75 }}
                className="sticky top-4 w-fit"
            >
                <Navbar active="home" />
            </motion.div>
            <div className="flex w-full max-w-[35rem] flex-1 flex-col items-center justify-center gap-4 px-4">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: "easeInOut", delay: 0.25 }}
                >
                    <Badge className="mb-4 h-fit gap-1 rounded-full border-2 border-dotted border-green-500 bg-green-500/10 px-4 py-0 text-[14px] text-green-500 hover:bg-green-500/30">
                        Beta
                    </Badge>
                </motion.div>
                <ExpandingTitle />
                <p className="text-foreground/60 text-center text-sm">
                    A private place to keep track of your thoughts. <br />
                    All entries are encrypted at rest and in transit.
                </p>
                <motion.div
                    className="mt-8 flex w-full flex-col items-center justify-center gap-4 sm:flex-row"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: "easeInOut", delay: 0.25 }}
                >
                    <Button className="w-full" asChild>
                        <Link href="/sign-up">Get Started</Link>
                    </Button>
                    <Button variant="outline" className="w-full" asChild>
                        <Link href="/sign-in">Sign in</Link>
                    </Button>
                </motion.div>
            </div>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeInOut", delay: 0.75 }}
                className="w-screen"
            >
                <Footer />
            </motion.div>
        </div>
    );
}

function ExpandingTitle() {
    const track = useAnalytics();
    return (
        <h1 className="flex items-baseline justify-center text-center font-serif text-5xl font-extrabold">
            <span>Diary</span>
            <motion.span
                className="text-foreground/20 overflow-hidden whitespace-nowrap text-[18px] italic"
                variants={{
                    hidden: { width: 0, opacity: 0 },
                    visible: {
                        width: "auto",
                        opacity: 1,
                        transition: { duration: 0.5, delay: 1.25 }
                    }
                }}
                initial="hidden"
                animate="visible"
            >
                <span className="mr-1">.</span>
                <Link
                    href="https://kyle.so"
                    target="_blank"
                    className="hover:text-foreground transition-all duration-150 hover:underline"
                    onClick={() => track("home_page_portfolio_link_click")}
                >
                    kyle.so
                </Link>
            </motion.span>
        </h1>
    );
}
