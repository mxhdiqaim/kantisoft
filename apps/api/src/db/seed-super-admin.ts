import db from "./";
import { users } from "../schema/users-schema";
import { passwordHashService } from "../service/password-hash-service";
import { UserRoleEnum, UserStatusEnum } from "../types/enums";
import {getEnvVariable} from "../utils";

(async () => {
    try {
        console.log("🌱 Checking for Super Admin...");

        const FIRST_NAME = "System";
        const LAST_NAME = "SuperAdmin";
        const EMAIL = getEnvVariable("SUPER_ADMIN_EMAIL");
        const PASSWORD = getEnvVariable("SUPER_ADMIN_PASSWORD");

        const hashedPassword = passwordHashService.hash(PASSWORD);

        await db.insert(users)
            .values({
                firstName: FIRST_NAME,
                lastName: LAST_NAME,
                email: EMAIL,
                password: hashedPassword,
                role: UserRoleEnum.SUPER_ADMIN,
                status: UserStatusEnum.ACTIVE,
                storeId: null,
            })
            // This is the magic line that prevents "Already exists" errors
            .onConflictDoNothing({ target: users.email });

        console.log("✅ Seed process finished (Admin created or already exists).");
    } catch (error) {
        console.error("❌ Seeding failed:", error);
    } finally {
        process.exit(0);
    }
})();