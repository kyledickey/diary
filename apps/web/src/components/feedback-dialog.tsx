import { useUser } from "@clerk/tanstack-react-start";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormMessage
} from "@/components/ui/form";
import { useAnalytics } from "@/lib/analytics";
import { Button } from "./ui/button";
import Spinner from "./ui/spinner";
import { Textarea } from "./ui/textarea";

const formSchema = z.object({
    message: z
        .string()
        .min(10, {
            message: "Message must be at least 10 characters."
        })
        .max(1000, {
            message: "Message must be less than 1000 characters."
        })
});

export default function FeedbackDialog({
    isOpen,
    onStateChange
}: {
    isOpen: boolean;
    onStateChange(open: boolean): void;
}) {
    const { user } = useUser();
    const trackAnalytics = useAnalytics();

    const [feedbackType, setFeedbackType] = useState<"Bug" | "Idea" | "Other" | null>(null);

    // 1. Define your form.
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            message: ""
        }
    });

    function onSubmit(values: z.infer<typeof formSchema>) {
        trackAnalytics("feedback_submitted");

        const subject = encodeURIComponent(`Diary ${feedbackType ?? "Other"} feedback`);
        const body = encodeURIComponent(
            [
                values.message,
                "",
                `Type: ${feedbackType ?? "Other"}`,
                `Account: ${user?.primaryEmailAddress?.emailAddress ?? "Not provided"}`,
                `User ID: ${user?.id ?? "Not provided"}`
            ].join("\n")
        );
        window.location.assign(`mailto:hi@kyle.so?subject=${subject}&body=${body}`);
    }

    return (
        <Dialog open={isOpen} onOpenChange={onStateChange}>
            <DialogContent>
                <DialogHeader>
                    {form.formState.isSubmitSuccessful ? (
                        <>
                            <DialogTitle>Thank you for your feedback!</DialogTitle>
                            <DialogDescription>
                                Your email client should now contain a prepared message. Send it
                                when you are ready.
                            </DialogDescription>
                        </>
                    ) : (
                        <>
                            <DialogTitle>Feedback</DialogTitle>
                            <DialogDescription>
                                Share your feedback to help improve Diary.
                            </DialogDescription>
                        </>
                    )}
                </DialogHeader>

                <div className="flex w-full flex-col items-center justify-center gap-4">
                    {!form.formState.isSubmitSuccessful && (
                        <div className="flex w-full flex-col items-center justify-center gap-4">
                            <div className="flex w-full flex-row items-center justify-between gap-2">
                                <FeedbackType
                                    type="Bug"
                                    onSelect={setFeedbackType}
                                    isActive={feedbackType === "Bug"}
                                />
                                <FeedbackType
                                    type="Idea"
                                    onSelect={setFeedbackType}
                                    isActive={feedbackType === "Idea"}
                                />
                                <FeedbackType
                                    type="Other"
                                    onSelect={setFeedbackType}
                                    isActive={feedbackType === "Other"}
                                />
                            </div>
                            {feedbackType && (
                                <Form {...form}>
                                    <form onSubmit={form.handleSubmit(onSubmit)}>
                                        <FormField
                                            control={form.control}
                                            name="message"
                                            render={({ field }) => (
                                                <FormItem className="mt-4 w-full">
                                                    <FormControl>
                                                        <Textarea
                                                            placeholder={
                                                                feedbackType === "Bug"
                                                                    ? "What happened?"
                                                                    : "What's on your mind?"
                                                            }
                                                            className="h-32 max-h-40"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormDescription>
                                                        Your account information will be used to
                                                        help improve Diary. We do not share your
                                                        account information with anyone else.
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <DialogFooter className="mt-8 w-full">
                                            <Button
                                                type="submit"
                                                className="w-full"
                                                disabled={
                                                    form.formState.isSubmitting ||
                                                    form.getValues("message").length === 0
                                                }
                                            >
                                                {form.formState.isSubmitting ? (
                                                    <Spinner className="h-4 w-4" />
                                                ) : (
                                                    "Submit"
                                                )}
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                </Form>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

function FeedbackType({
    type,
    onSelect,
    isActive
}: {
    type: "Bug" | "Idea" | "Other";
    onSelect(type: "Bug" | "Idea" | "Other"): void;
    isActive: boolean;
}) {
    let icon = "";
    if (type === "Bug") icon = "🐛";
    if (type === "Idea") icon = "💡";
    if (type === "Other") icon = "💬";

    return (
        <Button
            variant={isActive ? "secondary" : "outline"}
            className="flex h-fit w-full flex-col items-center justify-center gap-2 rounded-lg border p-2"
            onClick={() => {
                onSelect(type);
            }}
        >
            <p className="text-4xl">{icon}</p>
            <p className="text-foreground/60 text-md">{type}</p>
        </Button>
    );
}
