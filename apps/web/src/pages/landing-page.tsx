import { useNavigate } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import Clouds from "@/components/clouds";
import Footer from "@/components/footer";
import Link from "@/components/link";
import Navbar from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { useAnalytics } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";

const EASE = [0.16, 1, 0.3, 1] as const;

export function LandingPage() {
    const session = authClient.useSession();
    const isLoaded = !session.isPending;
    const isSignedIn = Boolean(session.data?.user);
    const navigate = useNavigate();
    const track = useAnalytics();

    useEffect(() => {
        if (isLoaded && isSignedIn) {
            track("home_page_authed_redirect");
            void navigate({ to: "/entry", replace: true });
        }
    }, [isLoaded, isSignedIn, navigate, track]);

    return <LandingContent />;
}

export function LandingContent() {
    return (
        <div className="relative flex min-h-screen flex-col items-center">
            <Clouds />

            <motion.div
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
                className="sticky top-4 z-50 w-fit"
            >
                <Navbar active="home" />
            </motion.div>

            <main className="relative z-10 flex w-full max-w-3xl flex-1 flex-col px-6">
                <Hero />
                <Passage />
                <Notes />
                <Price />
                <Invitation />
            </main>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, ease: EASE, delay: 0.7 }}
                className="relative z-10 w-full"
            >
                <Footer />
            </motion.div>
        </div>
    );
}

function Hero() {
    const track = useAnalytics();

    return (
        <motion.section
            variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } }
            }}
            initial="hidden"
            animate="visible"
            className="flex min-h-[88vh] flex-col items-center justify-center gap-6 py-28 text-center"
        >
            <Rise className="mb-6">
                <p className="text-foreground/70 font-serif text-lg font-bold tracking-tight">
                    Diary
                    <motion.span
                        className="text-foreground/25 overflow-hidden whitespace-nowrap pr-0.5 text-sm font-normal italic"
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: "auto", opacity: 1 }}
                        transition={{ duration: 0.7, ease: EASE, delay: 1.1 }}
                    >
                        <span className="mx-0.5">.</span>
                        <Link
                            href="https://kyle.so"
                            target="_blank"
                            className="hover:text-foreground transition-colors duration-150 hover:underline"
                            onClick={() => track("home_page_portfolio_link_click")}
                        >
                            kyle.so
                        </Link>
                    </motion.span>
                </p>
            </Rise>

            <h1 className="font-serif text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
                <RiseLine>Some things are better</RiseLine>
                <RiseLine>written down.</RiseLine>
            </h1>

            <Rise>
                <p className="text-foreground/55 mx-auto mt-2 max-w-md text-balance leading-relaxed">
                    A private place to keep track of your thoughts. Nothing to set up, nothing to
                    learn.
                </p>
            </Rise>

            <Rise className="mt-8 w-full max-w-sm">
                <div className="flex w-full flex-col items-center justify-center gap-3 sm:flex-row">
                    <Button className="w-full" asChild>
                        <Link href="/sign-up" onClick={() => track("home_page_get_started_click")}>
                            Get Started
                        </Link>
                    </Button>
                    <Button variant="outline" className="w-full" asChild>
                        <Link href="/sign-in" onClick={() => track("home_page_sign_in_click")}>
                            Sign in
                        </Link>
                    </Button>
                </div>
            </Rise>

            <Rise>
                <p className="text-foreground/35 text-xs">Free forever &middot; No credit card</p>
            </Rise>
        </motion.section>
    );
}

// The opening statement, read one word at a time. Dim clauses carry the sentence; lit ones carry
// the product.
const PASSAGE: { text: string; lit?: boolean }[] = [
    { text: "Diary" },
    { text: "opens to a blank page", lit: true },
    { text: "," },
    { text: "keeps every word as you write it", lit: true },
    { text: "," },
    { text: "locks it away from everyone but you", lit: true },
    { text: ", and asks nothing else of you." }
];

function Passage() {
    const reduceMotion = useReducedMotion();
    const words = PASSAGE.flatMap((segment) =>
        segment.text.split(" ").map((word) => ({ word, lit: segment.lit }))
    );

    return (
        <section className="py-28 sm:py-36">
            <motion.p
                variants={{
                    hidden: {},
                    visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.045 } }
                }}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-25% 0px -25% 0px" }}
                className="text-balance text-center font-serif text-2xl leading-relaxed sm:text-3xl sm:leading-relaxed"
            >
                {words.map(({ word, lit }, index) => (
                    <motion.span
                        // biome-ignore lint/suspicious/noArrayIndexKey: Words repeat and never reorder.
                        key={`${word}-${index}`}
                        variants={{
                            hidden: { opacity: 0 },
                            visible: { opacity: 1, transition: { duration: 0.6, ease: EASE } }
                        }}
                        className={lit ? "text-foreground" : "text-foreground/30"}
                    >
                        {word === "," || word.startsWith(",") ? word : ` ${word}`}
                    </motion.span>
                ))}
            </motion.p>
        </section>
    );
}

const NOTES = [
    {
        count: "one",
        title: "A page, already open.",
        body: "No folders to make, no template to choose. You sign in and the cursor is waiting for you."
    },
    {
        count: "two",
        title: "It remembers, so you don't have to.",
        body: "Every word is saved as you type it. Walk away mid-sentence and it will be right where you left it."
    },
    {
        count: "three",
        title: "Nobody reads it but you.",
        body: "Entries are locked the moment they're saved and unlocked only for you. They are never sold, shared, or read."
    },
    {
        count: "four",
        title: "Hide it in a heartbeat.",
        body: "Someone walks past your screen and one click softens the whole page. One more brings it back."
    },
    {
        count: "five",
        title: "Make it feel like yours.",
        body: "Choose the typeface and the size that you like reading. Every entry can look a little different."
    }
];

function Notes() {
    return (
        <section className="flex flex-col gap-24 py-16 sm:gap-32 sm:py-24">
            {NOTES.map((note, index) => (
                <Note key={note.count} note={note} align={index % 2 === 0 ? "left" : "right"} />
            ))}
        </section>
    );
}

function Note({ note, align }: { note: (typeof NOTES)[number]; align: "left" | "right" }) {
    const reduceMotion = useReducedMotion();
    const isLeft = align === "left";

    return (
        <motion.div
            variants={{
                hidden: {},
                visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.1 } }
            }}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-15% 0px -15% 0px" }}
            className={`flex flex-col gap-3 ${
                isLeft ? "items-start text-left" : "items-end text-right sm:pl-16"
            } ${isLeft ? "sm:pr-16" : ""}`}
        >
            <Rise>
                <span className="text-foreground/25 font-serif text-sm italic">{note.count}</span>
            </Rise>
            <Rise>
                <h2 className="max-w-md text-balance font-serif text-2xl font-bold leading-snug sm:text-[2rem] sm:leading-tight">
                    {note.title}
                </h2>
            </Rise>
            <Rise>
                <p className="text-foreground/50 max-w-sm text-balance leading-relaxed">
                    {note.body}
                </p>
            </Rise>
        </motion.div>
    );
}

function Price() {
    const track = useAnalytics();

    return (
        <section className="flex flex-col items-center gap-4 py-28 text-center sm:py-36">
            <Reveal>
                <h2 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
                    Free, and it stays that way.
                </h2>
            </Reveal>
            <Reveal delay={0.08}>
                <p className="text-foreground/50 max-w-md text-balance leading-relaxed">
                    An entry a day costs nothing, forever. If one page a day isn't enough, Plus
                    lifts the limit and lets you name your entries for $4.99 a month.
                </p>
            </Reveal>
            <Reveal delay={0.16}>
                <Link
                    href="/pricing"
                    className="text-foreground/45 hover:text-foreground mt-2 inline-block text-sm transition-colors duration-150 hover:underline"
                    onClick={() => track("home_page_pricing_click")}
                >
                    See what's in Plus &rarr;
                </Link>
            </Reveal>
        </section>
    );
}

function Invitation() {
    const track = useAnalytics();
    const today = useToday();

    return (
        <section className="flex flex-col items-center gap-5 pb-32 pt-12 text-center sm:pb-40">
            <Reveal>
                <p className="text-foreground/30 font-serif text-sm italic">{today}</p>
            </Reveal>
            <Reveal delay={0.08}>
                <h2 className="font-serif text-4xl font-extrabold tracking-tight sm:text-5xl">
                    Start with today.
                </h2>
            </Reveal>
            <Reveal delay={0.16}>
                <p className="text-foreground/50 max-w-xs text-balance leading-relaxed">
                    Your first page is already open. Write a line and see how it feels.
                </p>
            </Reveal>
            <Reveal delay={0.24}>
                <Button className="mt-4 px-10" asChild>
                    <Link href="/sign-up" onClick={() => track("home_page_get_started_click")}>
                        Get Started
                    </Link>
                </Button>
            </Reveal>
        </section>
    );
}

// Entries are titled with the day they were written, so the closing page is dated the same way.
// Formatted after mount to keep the server and client markup identical.
function useToday() {
    const [today, setToday] = useState("Today");

    useEffect(() => {
        setToday(
            new Date().toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric"
            })
        );
    }, []);

    return today;
}

function Reveal({
    children,
    delay = 0,
    className
}: {
    children: React.ReactNode;
    delay?: number;
    className?: string;
}) {
    const reduceMotion = useReducedMotion();

    return (
        <motion.div
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, ease: EASE, delay }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

// A headline line: same entrance as Rise, but inline-safe so it can live inside an h1.
function RiseLine({ children }: { children: React.ReactNode }) {
    const reduceMotion = useReducedMotion();

    return (
        <motion.span
            variants={{
                hidden: reduceMotion ? { opacity: 1 } : { opacity: 0, y: 18 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } }
            }}
            className="block"
        >
            {children}
        </motion.span>
    );
}

function Rise({ children, className }: { children: React.ReactNode; className?: string }) {
    const reduceMotion = useReducedMotion();

    return (
        <motion.div
            variants={{
                hidden: reduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } }
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
}
