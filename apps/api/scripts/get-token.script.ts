import { createClerkClient } from "@clerk/express";
import { helperUtil } from "../src/shared/utils";

class TokenGenerator {
    private clerkClient;
    private userId: string;
    private readonly templateName = "long-lived-token";

    constructor() {
        const secretKey = helperUtil.getEnvVariable("CLERK_SECRET_KEY");
        this.userId = helperUtil.getEnvVariable("CLERK_USER_ID");

        this.clerkClient = createClerkClient({ secretKey });
    }

    public async generate(): Promise<void> {
        try {
            console.log(`Fetching active sessions for Clerk User: ${this.userId}...`);

            const response = await this.clerkClient.sessions.getSessionList({
                userId: this.userId,
                status: "active",
            });

            const sessions = response.data;

            if (!sessions || sessions.length === 0) {
                console.error("\n❌ Error: User does not have an active session.");
                console.error(
                    "💡 Fix: Go to your Clerk Hosted Sign-in page in your browser, log in with this user, and then run this script again.",
                );
                process.exit(1);
            }

            const sessionId = sessions[0].id;
            console.log(`✅ Found active session: ${sessionId}`);
            console.log(`⏳ Generating '${this.templateName}' token...`);

            const { jwt } = await this.clerkClient.sessions.getToken(sessionId, this.templateName);

            console.log("\n🎉 Success! Here is your token:\n");
            console.log(`Bearer ${jwt}`);
            console.log("\n👆 Copy the string above and paste it into Postman's Authorization Header.\n");

            process.exit(0);
        } catch (error) {
            console.error("\n❌ Failed to generate token:", error);
            process.exit(1);
        }
    }
}

new TokenGenerator().generate();
