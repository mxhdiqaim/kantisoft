import nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import { getEnvVariable } from "../utils";

interface SendVerificationEmailArgs {
    to: string;
    firstName: string;
    verificationLink: string;
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
        const mailOptions: nodemailer.SendMailOptions = {
            to,
            subject: "Verify your Kantisoft Account",
            text: `Hello ${firstName},\n\nPlease verify your email by clicking the following link:\n${verificationLink}\n\nIf you did not request this, please ignore this email.`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e7; border-radius: 8px;">
                    <h2 style="color: #18181b;">Welcome to Kantisoft, ${firstName}!</h2>
                    <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">
                        Thanks for signing up. To get started managing your store, please verify your email address by clicking the button below:
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${verificationLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block;">
                            Verify Email Address
                        </a>
                    </div>
                    <p style="color: #71717a; font-size: 12px; line-height: 1.5;">
                        If the button above doesn't work, copy and paste this link into your web browser: <br />
                        <a href="${verificationLink}" style="color: #2563eb;">${verificationLink}</a>
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

    // // Example extension inside the class later:
    // public async sendPasswordResetEmail({ to, firstName, resetLink }: ResetArgs) {
    //     return await this.sendMail({
    //         to,
    //         subject: "Reset your Kantisoft Password",
    //         html: `... template here ...`
    //     });
    // }
}

// Export a single singleton instance for the app to share
export const emailService = new EmailService();
