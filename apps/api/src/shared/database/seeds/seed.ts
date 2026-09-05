import { CountrySeeder } from "./seeders/country.seeder";
import logger from "../../logger";

class DatabaseSeeder {
    private countrySeeder: CountrySeeder;

    constructor() {
        this.countrySeeder = new CountrySeeder();
    }

    public async run(): Promise<void> {
        logger.info("Starting database seed pipeline...");

        try {
            // Sequential execution for lookup dependencies
            await this.countrySeeder.seed();

            logger.info("Database seed pipeline completed successfully.");
            process.exit(0);
        } catch (error) {
            // Passing the error object to the meta-parameter of your logger
            logger.error("Database seed pipeline failed:", error as Error);
            process.exit(1);
        }
    }
}

new DatabaseSeeder().run();
