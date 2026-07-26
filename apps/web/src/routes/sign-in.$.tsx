import { SignIn } from "@clerk/tanstack-react-start";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/sign-in/$")({
    component: SignInPage,
    head: () => ({ meta: [{ title: "Sign in - Diary" }] })
});

function SignInPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center">
            <SignIn routing="path" path="/sign-in" />
        </div>
    );
}
