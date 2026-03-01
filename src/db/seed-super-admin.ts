import db from "./";
import { users } from "../schema/users-schema";
import { passwordHashService } from "../service/password-hash-service";
import { UserRoleEnum, UserStatusEnum } from "../types/enums";

(async () => {
    console.log("🌱 Seeding Super Admin...");

    const hashedPassword = passwordHashService.hash("Rhyzobium36.");

    await db.insert(users).values({
        firstName: "System",
        lastName: "SuperAdmin",
        email: "admin@kantisoft.com",
        password: hashedPassword,
        role: UserRoleEnum.SUPER_ADMIN, // Matches your camelCase pgEnum
        status: UserStatusEnum.ACTIVE,
        storeId: null, // Super admins have no store
    });

    console.log("✅ Super Admin created. You can now log in.");
    process.exit(0);
})();
