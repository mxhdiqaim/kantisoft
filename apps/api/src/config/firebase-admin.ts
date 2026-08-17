import admin from "firebase-admin";
import { helperUtil } from "../shared/utils";

const projectId = helperUtil.getEnvVariable("FIREBASE_PROJECT_ID");
const clientEmail = helperUtil.getEnvVariable("FIREBASE_CLIENT_EMAIL");
const privateKey = helperUtil.getEnvVariable("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n");

export const initializeFirebase = () => {
    if (admin.apps.length === 0) {
        try {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId,
                    clientEmail,
                    privateKey,
                }),
            });
            console.log("🔥 Firebase Admin SDK initialized successfully.");
        } catch (error) {
            console.error("❌ Failed to initialize Firebase Admin SDK:", error);
            throw error;
        }
    }
    return admin;
};

export const getFirebaseAdmin = () => admin;
