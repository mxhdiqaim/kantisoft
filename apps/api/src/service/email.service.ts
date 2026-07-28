import nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import { getEnvVariable } from "../shared/utils";

// Simple, fast utility to escape special HTML characters
const escapeHtml = (text: string): string => {
    return text.replace(/[&<>"']/g, (match) => {
        switch (match) {
            case "&":
                return "&amp;";
            case "<":
                return "&lt;";
            case ">":
                return "&gt;";
            case '"':
                return "&quot;";
            case "'":
                return "&#039;";
            default:
                return match;
        }
    });
};

interface SendVerificationEmailArgs {
    to: string;
    firstName: string;
    verificationLink: string;
}

export interface SendPasswordResetEmailArgs {
    to: string;
    firstName: string;
    resetLink: string;
}
export class EmailService {
    // Encapsulate the transporter so it cannot be tampered with outside this class
    private readonly transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo>;
    private readonly fromSender: string;

    constructor() {
        // Initialize environment variables securely inside the constructor
        const host = getEnvVariable("SMTP_HOST");
        const port = getEnvVariable("SMTP_PORT");
        const user = getEnvVariable("SMTP_USER");
        const pass = getEnvVariable("SMTP_PASSWORD");
        const secure = getEnvVariable("SMTP_SECURE") === "true";

        this.fromSender = `"Kantisoft Team" <noreply@kantisoft.com>`;

        const smtpConfig: SMTPTransport.Options = {
            host,
            port: parseInt(port || "2525", 10),
            auth: {
                user,
                pass,
            },
            secure,
        };

        // Fallback safety barrier
        if (!user || !pass) {
            throw new Error(
                "EmailService Error: Missing critical SMTP credentials configuration.",
            );
        }

        this.transporter = nodemailer.createTransport(smtpConfig);
    }

    private async sendMail(
        options: nodemailer.SendMailOptions,
    ): Promise<SMTPTransport.SentMessageInfo> {
        try {
            return await this.transporter.sendMail({
                from: this.fromSender,
                ...options,
            });
        } catch (error) {
            console.error("Internal EmailService execution failure:", error);
            throw error;
        }
    }

    public async sendVerificationEmail({
        to,
        firstName,
        verificationLink,
    }: SendVerificationEmailArgs): Promise<SMTPTransport.SentMessageInfo> {
        // Sanitize inputs for HTML usage
        const safeFirstName = escapeHtml(firstName);
        const safeLink = escapeHtml(verificationLink);

        const mailOptions: nodemailer.SendMailOptions = {
            to,
            subject: "Verify your Kantisoft Account",
            // Plain text requires raw characters, NOT escaped HTML entities
            text: `Hello ${firstName},\n\nPlease verify your email by clicking the following link:\n${verificationLink}\n\nIf you did not request this, please ignore this email.`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e7; border-radius: 8px;">
                    <h2 style="color: #18181b;">Welcome to Kantisoft, ${safeFirstName}!</h2>
                    <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">
                        Thanks for signing up. To get started managing your store, please verify your email address by clicking the button below:
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${safeLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block;">
                            Verify Email Address
                        </a>
                    </div>
                    <p style="color: #71717a; font-size: 12px; line-height: 1.5;">
                        If the button above doesn't work, copy and paste this link into your web browser: <br />
                        <a href="${safeLink}" style="color: #2563eb;">${safeLink}</a>
                    </p>
                    <hr style="border: 0; border-top: 1px solid #e4e4e7; margin: 20px 0;" />
                    <p style="color: #a1a1aa; font-size: 12px; text-align: center;">
                        &copy; ${new Date().getFullYear()} Kantisoft. All rights reserved.
                    </p>
                </div>
            `,
        };

        return await this.sendMail(mailOptions);
    }

    public async sendPasswordResetEmail({
        to,
        firstName,
        resetLink,
    }: SendPasswordResetEmailArgs): Promise<SMTPTransport.SentMessageInfo> {
        const mailOptions: nodemailer.SendMailOptions = {
            to,
            subject: "Reset your Kantisoft Password",
            text: `Hello ${firstName},\n\nWe received a request to reset your password. Click the link below to set a new one:\n${resetLink}\n\nIf you did not request this, please ignore this email.`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e7; border-radius: 8px;">
                    <h2 style="color: #18181b;">Password Reset Request</h2>
                    <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">
                        Hello ${firstName},<br><br>
                        We received a request to reset the password for your Kantisoft account. Click the button below to choose a new password.
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block;">
                            Reset Password
                        </a>
                    </div>
                    <p style="color: #71717a; font-size: 12px; line-height: 1.5;">
                        If you did not make this request, you can safely ignore this email. Your password will not change until you access the link above and create a new one.<br><br>
                        Link not working? Paste this into your browser: <br />
                        <a href="${resetLink}" style="color: #2563eb;">${resetLink}</a>
                    </p>
                    <hr style="border: 0; border-top: 1px solid #e4e4e7; margin: 20px 0;" />
                    <p style="color: #a1a1aa; font-size: 12px; text-align: center;">
                        &copy; ${new Date().getFullYear()} Kantisoft. All rights reserved.
                    </p>
                </div>
            `,
        };

        return await this.sendMail(mailOptions);
    }
}

// Export a single singleton instance for the app to share
export const emailService = new EmailService();
