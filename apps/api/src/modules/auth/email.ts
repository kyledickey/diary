import { Resend } from "resend";

interface AuthEmailConfig {
    apiKey: string;
    from: string;
    webUrl: string;
}

export class AuthEmailService {
    private readonly resend: Resend;

    constructor(private readonly config: AuthEmailConfig) {
        this.resend = new Resend(config.apiKey);
    }

    async sendOtp(email: string, otp: string): Promise<void> {
        const safeOtp = escapeHtml(otp);
        await this.send({
            to: email,
            subject: `${otp} is your Diary sign-in code`,
            text: [
                "Sign in to Diary",
                "",
                `Your one-time code is ${otp}.`,
                "",
                "This code expires in 10 minutes.",
                "If you did not request it, you can ignore this email.",
                "",
                this.config.webUrl
            ].join("\n"),
            html: this.layout({
                title: "Your sign-in code",
                body: "Enter this six-digit code in Diary. It expires in 10 minutes.",
                action: `<div style="border:1px solid #e5e5e5;border-radius:10px;padding:16px;text-align:center;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:26px;font-weight:600;letter-spacing:0.32em;color:#262626">${safeOtp}</div>`
            })
        });
    }

    private async send(message: {
        to: string;
        subject: string;
        text: string;
        html: string;
    }): Promise<void> {
        const { error } = await this.resend.emails.send({
            from: this.config.from,
            to: message.to,
            subject: message.subject,
            text: message.text,
            html: message.html
        });

        if (error) {
            throw new Error(`Resend could not send the authentication email: ${error.message}`);
        }
    }

    private layout({ title, body, action }: { title: string; body: string; action: string }) {
        const url = escapeHtml(this.config.webUrl);
        const label = escapeHtml(this.config.webUrl.replace(/^https?:\/\//, ""));

        return `<!doctype html>
<html lang="en">
<body style="margin:0;background:#ffffff;color:#262626;font-family:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:420px;margin:0 auto;padding:56px 24px">
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;line-height:1.3">${title}</h1>
    <p style="margin:0 0 24px;color:#737373;font-size:14px;line-height:1.6">${body}</p>
    ${action}
    <p style="margin:24px 0 0;color:#737373;font-size:13px;line-height:1.6">
      If you did not request this, you can safely ignore this email.
    </p>
    <p style="margin:24px 0 0;font-size:13px;line-height:1.6">
      <a href="${url}" style="color:#737373;text-decoration:underline">${label}</a>
    </p>
  </div>
</body>
</html>`;
    }
}

function escapeHtml(value: string) {
    return value.replace(/[&<>'"]/g, (character) => {
        const entities: Record<string, string> = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "'": "&#39;",
            '"': "&quot;"
        };
        return entities[character] ?? character;
    });
}
