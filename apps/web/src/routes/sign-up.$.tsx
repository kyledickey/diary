import { SignUp } from "@clerk/tanstack-react-start";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/sign-up/$")({
    component: SignUpPage,
    head: () => ({ meta: [{ title: "Sign up - Diary" }] })
});

function SignUpPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center">
            <SignUp routing="path" path="/sign-up" />
        </div>
    );
}
