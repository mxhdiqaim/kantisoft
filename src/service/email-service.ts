import { getEnvVariable } from "../utils";

// Tip: Resend is very developer-friendly for Nigerian startups
const RESEND_API_KEY = getEnvVariable("RESEND_API_KEY");

export const EmailService = {
    sendManagerWelcome: async (
        email: string,
        firstName: string,
        tempPassword: string,
        storeName: string,
    ) => {
        try {
            const response = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${RESEND_API_KEY}`,
                },
                body: JSON.stringify({
                    from: "KantiSoft Onboarding <onboarding@kantisoft.com>",
                    to: [email],
                    subject: `Welcome to ${storeName} - Your Login Details`,
                    html: `
                        <h1>Welcome to the Platform, ${firstName}!</h1>
                        <p>You have been registered as the Manager for <strong>${storeName}</strong>.</p>
                        <p><strong>Your Temporary Password:</strong> ${tempPassword}</p>
                        <p>Please log in at <a href="https://app.kantisoft.com">app.kantisoft.com</a> and change your password immediately.</p>
                        <br />
                        <p>Best regards,<br />The KantiSoft Team</p>
                    `,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                console.error("Email failed to send:", error);
            }
        } catch (err) {
            console.error("Email service error:", err);
        }
    },
};
