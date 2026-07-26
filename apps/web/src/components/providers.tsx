import { ClerkProvider } from "@clerk/tanstack-react-start";

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up">
            {children}
        </ClerkProvider>
    );
}
