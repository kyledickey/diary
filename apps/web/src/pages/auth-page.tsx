import { useState, useTransition } from "react";
import Link from "@/components/link";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

type AuthStep = "email" | "magic-link-sent" | "otp";

export function AuthPage({ mode }: { mode: "sign-in" | "sign-up" }) {
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [step, setStep] = useState<AuthStep>("email");
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    function sendMagicLink(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        startTransition(async () => {
            const webOrigin = window.location.origin;
            const { error: authError } = await authClient.signIn.magicLink({
                email,
                callbackURL: `${webOrigin}/entry`,
                newUserCallbackURL: `${webOrigin}/entry`,
                errorCallbackURL: `${webOrigin}/${mode}`
            });
            if (authError) {
                setError(authError.message ?? "Could not send your sign-in link");
                return;
            }
            setStep("magic-link-sent");
        });
    }

    function sendOtp() {
        setError(null);
        startTransition(async () => {
            const { error: authError } = await authClient.emailOtp.sendVerificationOtp({
                email,
                type: "sign-in"
            });
            if (authError) {
                setError(authError.message ?? "Could not send your sign-in code");
                return;
            }
            setStep("otp");
        });
    }

    function verifyOtp(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        startTransition(async () => {
            const { error: authError } = await authClient.signIn.emailOtp({
                email,
                otp
            });
            if (authError) {
                setError(authError.message ?? "That code could not be verified");
                return;
            }
            window.location.assign("/entry");
        });
    }

    return (
        <main className="flex min-h-screen items-center justify-center px-4 py-16">
            <div className="w-full max-w-md">
                <CardHeader className="space-y-3 pb-5">
                    <CardTitle className="font-serif text-3xl font-medium">
                        {step === "email" ? "Wait, who are you?" : "Check your inbox."}
                    </CardTitle>
                    <CardDescription className="leading-relaxed">
                        {step === "email"
                            ? "Enter your email and we’ll send a sign-in link."
                            : step === "otp"
                              ? `Enter the six-digit code sent to ${email}.`
                              : `We sent a one-time sign-in link to ${email}.`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {step === "email" ? (
                        <form className="space-y-4" onSubmit={sendMagicLink}>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    required
                                    autoFocus
                                />
                            </div>
                            <Button className="w-full" type="submit" disabled={isPending}>
                                {isPending ? "Sending…" : "Email me a sign-in link"}
                            </Button>
                        </form>
                    ) : step === "otp" ? (
                        <form className="space-y-4" onSubmit={verifyOtp}>
                            <div className="space-y-2">
                                <Label htmlFor="otp">One-time code</Label>
                                <Input
                                    id="otp"
                                    name="otp"
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    pattern="[0-9]{6}"
                                    maxLength={6}
                                    className="text-center font-mono text-xl tracking-[0.35em]"
                                    value={otp}
                                    onChange={(event) =>
                                        setOtp(event.target.value.replace(/\D/g, ""))
                                    }
                                    required
                                    autoFocus
                                />
                            </div>
                            <Button
                                className="w-full"
                                type="submit"
                                disabled={isPending || otp.length !== 6}
                            >
                                {isPending ? "Verifying…" : "Sign in"}
                            </Button>
                        </form>
                    ) : (
                        <div className="space-y-3">
                            <Button
                                className="w-full"
                                variant="outline"
                                onClick={sendOtp}
                                disabled={isPending}
                            >
                                {isPending ? "Sending…" : "Use a one-time code instead"}
                            </Button>
                            <Button
                                className="w-full"
                                variant="ghost"
                                onClick={() => setStep("email")}
                            >
                                Use a different email
                            </Button>
                        </div>
                    )}

                    {error ? <p className="mt-4 text-sm text-red-500">{error}</p> : null}

                    {step === "otp" ? (
                        <Button
                            className="mt-2 w-full"
                            variant="ghost"
                            onClick={sendOtp}
                            disabled={isPending}
                        >
                            Send a new code
                        </Button>
                    ) : null}

                    <p className="text-muted-foreground mt-6 text-center text-xs leading-relaxed">
                        By continuing, you agree to the{" "}
                        <Link href="/terms" className="underline">
                            terms
                        </Link>{" "}
                        and{" "}
                        <Link href="/privacy" className="underline">
                            privacy policy
                        </Link>
                        .
                    </p>
                </CardContent>
            </div>
        </main>
    );
}
