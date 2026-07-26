import Link from "@/components/link";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle
} from "@/components/ui/card";

export function ErrorPage({ error, reset }: { error: Error; reset(): void }) {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-24">
            <Card className="bg-card/80">
                <CardHeader>
                    <CardTitle className="font-serif text-2xl font-bold">
                        Something went wrong.
                    </CardTitle>
                    <CardDescription>{error.message}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                    <Button asChild className="w-full">
                        <Link href="/">Go back home</Link>
                    </Button>
                    <Button variant="secondary" className="w-full" onClick={reset}>
                        Retry
                    </Button>
                </CardContent>
                <CardFooter>
                    <p className="text-foreground/60 font-mono text-sm">Error Code: 500</p>
                </CardFooter>
            </Card>
        </main>
    );
}

export function NotFoundPage() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-24">
            <Card className="bg-card/80">
                <CardHeader>
                    <CardTitle className="font-serif text-2xl font-bold">Are you lost?</CardTitle>
                    <CardDescription>The page you are looking for does not exist.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild className="w-full">
                        <Link href="/">Go back home</Link>
                    </Button>
                </CardContent>
                <CardFooter>
                    <p className="text-foreground/60 font-mono text-sm">Error Code: 404</p>
                </CardFooter>
            </Card>
        </main>
    );
}
