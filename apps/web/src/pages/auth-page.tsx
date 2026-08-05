import { useState, useTransition } from "react";
import Link from "@/components/shared/link";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardDescription,
    CardFrame,
    CardFrameFooter,
    CardHeader,
    CardPanel,
    CardTitle
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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
            <CardFrame className="w-full max-w-md">
                <Card>
                    <CardHeader className="border-b">
                        <CardTitle className="font-serif text-2xl font-bold">
                            {step === "email" ? "Welcome to your Diary" : "Check your inbox"}
                        </CardTitle>
                        <CardDescription>
                            {step === "email"
                                ? "Enter your email and we’ll send a link to sign in or create an account."
                                : step === "otp"
                                  ? `Enter the six-digit code sent to ${email}.`
                                  : `We sent a link to ${email}.`}
                        </CardDescription>
                    </CardHeader>
                    <CardPanel>
                        {step === "email" ? (
                            <Form className="flex flex-col gap-4" onSubmit={sendMagicLink}>
                                <Field name="email">
                                    <FieldLabel>Email</FieldLabel>
                                    <Input
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={(event) => setEmail(event.target.value)}
                                        required
                                        autoFocus
                                    />
                                </Field>
                                <Button className="w-full" type="submit" loading={isPending}>
                                    Email me a link
                                </Button>
                            </Form>
                        ) : step === "otp" ? (
                            <Form className="flex flex-col gap-4" onSubmit={verifyOtp}>
                                <Field name="otp">
                                    <FieldLabel>One-time code</FieldLabel>
                                    <Input
                                        name="otp"
                                        type="text"
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
                                </Field>
                                <Button
                                    className="w-full"
                                    type="submit"
                                    loading={isPending}
                                    disabled={otp.length !== 6}
                                >
                                    Sign in
                                </Button>
                            </Form>
                        ) : (
                            <div className="flex flex-col gap-3">
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

                        {error ? (
                            <p className="mt-4 text-sm text-destructive-foreground">{error}</p>
                        ) : null}

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
                    </CardPanel>
                </Card>
                <CardFrameFooter>
                    <p className="text-muted-foreground text-xs">
                        By continuing, you agree to the{" "}
                        <Link href="/terms" className="underline hover:text-primary">
                            terms
                        </Link>{" "}
                        and{" "}
                        <Link href="/privacy" className="underline hover:text-primary">
                            privacy policy
                        </Link>
                        .
                    </p>
                </CardFrameFooter>
            </CardFrame>
        </main>
    );
}
