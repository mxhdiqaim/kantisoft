import { clerkClient } from "@clerk/express";
import { helperUtil } from "../src/shared/utils";

const USER_ID = helperUtil.getEnvVariable("CLERK_USER_ID");

const TEMPLATE_NAME = "long-lived-token";

const generateTestToken = async (userId: string) => {
    try {
        console.log(`⏳ Fetching active sessions for ${userId}...`);

        const response = await clerkClient.sessions.getSessionList({
            userId: userId,
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
        console.log(`⏳ Generating '${TEMPLATE_NAME}' token...`);

        const { jwt } = await clerkClient.sessions.getToken(sessionId, TEMPLATE_NAME);

        console.log("\n🎉 Success! Here is your token:\n");
        console.log(jwt);
        console.log("\n👆 Copy the string above and paste it into Postman.\n");

        process.exit(0);
    } catch (error) {
        console.error("\n❌ Failed to generate token:", error);
        process.exit(1);
    }
};

generateTestToken(USER_ID);

// await window.Clerk.session.getToken()
