import { Resend } from "resend";

interface AuthEmailConfig {
    apiKey: string;
    from: string;
}

export class AuthEmailService {
    private readonly resend: Resend;

    constructor(private readonly config: AuthEmailConfig) {
        this.resend = new Resend(config.apiKey);
    }

    async sendMagicLink(email: string, url: string): Promise<void> {
        const safeUrl = escapeHtml(url);
        await this.send({
            to: email,
            subject: "Your Diary sign-in link",
            text: [
                "Sign in to Diary",
                "",
                "Open this private link to sign in:",
                url,
                "",
                "This link expires in 10 minutes and can only be used once.",
                "If you did not request it, you can ignore this email."
            ].join("\n"),
            html: authEmailLayout({
                eyebrow: "DIARY",
                title: "A quiet way back in.",
                body: "Use this private link to return to your journal. It expires in 10 minutes and can only be used once.",
                action: `<a href="${safeUrl}" style="display:inline-block;border-radius:999px;background:#171717;color:#ffffff;padding:12px 22px;text-decoration:none;font-size:14px;font-weight:600">Open Diary</a>`,
                fallback: `Or copy this link into your browser:<br><a href="${safeUrl}" style="color:#525252;word-break:break-all">${safeUrl}</a>`
            })
        });
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
                "If you did not request it, you can ignore this email."
            ].join("\n"),
            html: authEmailLayout({
                eyebrow: "DIARY",
                title: "Your sign-in code.",
                body: "Enter this code in Diary. It expires in 10 minutes.",
                action: `<div style="display:inline-block;border-radius:14px;background:#f5f5f4;padding:14px 22px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:28px;font-weight:700;letter-spacing:0.24em;color:#171717">${safeOtp}</div>`
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
}

function authEmailLayout({
    eyebrow,
    title,
    body,
    action,
    fallback
}: {
    eyebrow: string;
    title: string;
    body: string;
    action: string;
    fallback?: string;
}) {
    return `<!doctype html>
<html lang="en">
<body style="margin:0;background:#fafaf9;color:#171717;font-family:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="padding:48px 16px">
    <div style="max-width:520px;margin:0 auto;border:1px solid #e7e5e4;border-radius:20px;background:#ffffff;padding:40px">
      <p style="margin:0 0 28px;color:#a8a29e;font-size:11px;font-weight:700;letter-spacing:0.22em">${eyebrow}</p>
      <h1 style="margin:0 0 14px;font-family:Georgia,serif;font-size:30px;font-weight:500;line-height:1.2">${title}</h1>
      <p style="margin:0 0 28px;color:#57534e;font-size:15px;line-height:1.7">${body}</p>
      ${action}
      ${fallback ? `<p style="margin:28px 0 0;color:#a8a29e;font-size:12px;line-height:1.6">${fallback}</p>` : ""}
      <div style="margin-top:36px;border-top:1px solid #f0efed;padding-top:20px;color:#a8a29e;font-size:12px;line-height:1.6">
        If you did not request this, you can safely ignore it.
      </div>
    </div>
  </div>
</body>
</html>`;
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
