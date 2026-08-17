import { Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import admin from "firebase-admin";
import { db } from "../database";
import { users } from "../../schema/users-schema";
import { CustomRequest } from "../../types/express";
import { UserStatusEnum } from "../../types/enums";
import { handleError2 } from "../../service/error-handling";

export const authenticateToken = async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;

        // Check for standard Bearer Token structure
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return handleError2(res, "Unauthorized: Missing or malformed token format. Use 'Bearer <TOKEN>'.", 401);
        }

        const token = authHeader.split(" ")[1];

        // Verify the cryptographic token using Firebase Admin SDK
        const decodedToken = await admin.auth().verifyIdToken(token);
        const { uid, email } = decodedToken;

        // Fetch user data from DB matching the firebaseUid
        let userData = await db.query.users.findFirst({
            where: eq(users.firebaseUid, uid),
        });

        // 🌟 MIGRATION BRIDGE:
        // If they are a legacy user logging in via Firebase for the first time,
        // they won't have a firebaseUid yet. Match them by email and link their account.
        if (!userData && email) {
            userData = await db.query.users.findFirst({
                where: eq(users.email, email),
            });

            if (userData) {
                await db.update(users).set({ firebaseUid: uid }).where(eq(users.id, userData.id));
            }
        }

        // Guard clauses for unregistered or restricted profiles
        if (!userData) {
            return handleError2(res, "Account not registered!", 403);
        }

        if (userData.status !== UserStatusEnum.ACTIVE) {
            return handleError2(res, "Authentication Failed!", 403);
        }

        // Structure the context to perfectly mirror your old req.user type
        req.user = {
            data: userData,
        };

        // Optional: Keep your global helper lists if your older code utilises them
        req.storeIds = userData.storeId ? [userData.storeId] : [];

        return next();
        // eslint-disable-next-line
    } catch (error: any) {
        console.error("❌ Token Verification Error:", error.message);

        if (error.code === "auth/id-token-expired") {
            return handleError2(res, "Unauthorized: Token expired.", 401);
        }

        return handleError2(res, "Unauthorized: Invalid token signature.", 401);
    }
};
