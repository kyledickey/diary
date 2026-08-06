import { useEffect, useState, useTransition } from "react";
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
import { OTPField, OTPFieldInput } from "@/components/ui/otp-field";
import { authClient } from "@/lib/auth-client";

type AuthStep = "email" | "otp";
const resendCooldownSeconds = 60;
const otpLength = 6;
const otpSlotKeys = Array.from({ length: otpLength }, (_, index) => `otp-slot-${index}`);

export function AuthPage({ mode }: { mode: "sign-in" | "sign-up" }) {
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [step, setStep] = useState<AuthStep>("email");
    const [error, setError] = useState<string | null>(null);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (resendCooldown === 0) {
            return;
        }

        const timer = window.setTimeout(() => {
            setResendCooldown((current) => Math.max(0, current - 1));
        }, 1000);

        return () => window.clearTimeout(timer);
    }, [resendCooldown]);

    function sendOtp(event?: React.FormEvent<HTMLFormElement>) {
        event?.preventDefault();
        if (isPending || resendCooldown > 0) {
            return;
        }
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
            setResendCooldown(resendCooldownSeconds);
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
                            {step === "email"
                                ? mode === "sign-up"
                                    ? "Create your Diary"
                                    : "Welcome to your Diary"
                                : "Check your inbox"}
                        </CardTitle>
                        <CardDescription>
                            {step === "email"
                                ? `Enter your email and we’ll send a six-digit code to ${
                                      mode === "sign-up" ? "create your account" : "sign in"
                                  }.`
                                : `Enter the six-digit code sent to ${email}.`}
                        </CardDescription>
                    </CardHeader>
                    <CardPanel>
                        {step === "email" ? (
                            <Form className="flex flex-col gap-4" onSubmit={sendOtp}>
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
                                <Button
                                    className="w-full"
                                    type="submit"
                                    loading={isPending}
                                    disabled={resendCooldown > 0}
                                >
                                    {resendCooldown > 0
                                        ? `Try again in ${resendCooldown}s`
                                        : "Email me a code"}
                                </Button>
                            </Form>
                        ) : step === "otp" ? (
                            <Form className="flex flex-col gap-4" onSubmit={verifyOtp}>
                                <Field className="items-center" name="otp">
                                    <OTPField
                                        aria-label="One-time code"
                                        name="otp"
                                        length={otpLength}
                                        inputMode="numeric"
                                        autoComplete="one-time-code"
                                        className="w-full justify-center gap-2 min-[400px]:gap-3"
                                        value={otp}
                                        onValueChange={setOtp}
                                        required
                                    >
                                        {otpSlotKeys.map((slotKey, index) => (
                                            <OTPFieldInput
                                                key={slotKey}
                                                className="size-10 text-lg leading-10 min-[400px]:size-12 min-[400px]:text-xl min-[400px]:leading-12 sm:size-12 sm:text-xl sm:leading-12"
                                                aria-label={
                                                    index === 0
                                                        ? undefined
                                                        : `Character ${index + 1} of ${otpLength}`
                                                }
                                                autoFocus={index === 0}
                                            />
                                        ))}
                                    </OTPField>
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
                        ) : null}

                        {error ? (
                            <p className="mt-4 text-sm text-destructive-foreground">{error}</p>
                        ) : null}

                        {step === "otp" ? (
                            <Button
                                className="mt-2 w-full"
                                type="button"
                                variant="ghost"
                                onClick={() => sendOtp()}
                                disabled={isPending || resendCooldown > 0}
                            >
                                {resendCooldown > 0
                                    ? `Send a new code in ${resendCooldown}s`
                                    : "Send a new code"}
                            </Button>
                        ) : null}
                        {step === "otp" ? (
                            <Button
                                className="w-full"
                                type="button"
                                variant="ghost"
                                onClick={() => {
                                    setOtp("");
                                    setError(null);
                                    setStep("email");
                                }}
                            >
                                Use a different email
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
