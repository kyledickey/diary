import Footer from "@/components/footer";
import Link from "@/components/link";
import Navbar from "@/components/navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAnalytics } from "@/lib/analytics";

export function HomePage() {
    const track = useAnalytics();
    return (
        <div className="flex min-h-screen flex-col items-center justify-center overflow-y-hidden">
            <Navbar active="home" />
            <div className="flex w-full max-w-[35rem] flex-1 flex-col items-center justify-center gap-4 px-4">
                <Badge className="mb-4 h-fit gap-1 rounded-full border-2 border-dotted border-green-500 bg-green-500/10 px-4 py-0 text-[14px] text-green-500 hover:bg-green-500/30">
                    Beta
                </Badge>
                <h1 className="text-center font-serif text-5xl font-extrabold">
                    Diary<span className="text-foreground/20 text-[18px] italic">.</span>
                    <Link
                        href="https://kyle.so"
                        target="_blank"
                        className="text-foreground/20 hover:text-foreground text-[18px] italic transition-all duration-150 hover:underline"
                        onClick={() => track("home_page_portfolio_link_click")}
                    >
                        kyle.so
                    </Link>
                </h1>
                <p className="text-foreground/60 text-center text-sm">
                    A private place to keep track of your thoughts. <br />
                    All entries are encrypted at rest and in transit.
                </p>
                <div className="mt-8 flex w-full flex-col items-center justify-center gap-4 sm:flex-row">
                    <Button className="w-full" asChild>
                        <Link href="/sign-up">Get Started</Link>
                    </Button>
                    <Button variant="outline" className="w-full" asChild>
                        <Link href="/sign-in">Sign in</Link>
                    </Button>
                </div>
            </div>
            <Footer />
        </div>
    );
}
