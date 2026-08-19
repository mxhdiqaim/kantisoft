import { db } from "../../index";
import { countrySchema } from "../../schema";
import { countriesSeedData } from "../data/countries.data";
import logger from "../../../logger";

export class CountrySeeder {
    public async seed(): Promise<void> {
        logger.info("Seeding countries...");

        try {
            await db
                .insert(countrySchema)
                .values(countriesSeedData)
                .onConflictDoNothing({ target: countrySchema.countryCode });

            logger.info("Countries seeded successfully.");
        } catch (error) {
            // Passing the error object to the meta-parameter of your logger
            logger.error("Failed to seed countries:", error as Error);
            throw error;
        }
    }
}
