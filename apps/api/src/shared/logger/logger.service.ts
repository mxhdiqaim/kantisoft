import fs from "fs";
import path from "path";
import { promisify } from "util";
import logger from "./index";
import { AppError } from "../errors/custom.error";

class LoggerService {
    private readdir = promisify(fs.readdir);
    private readFile = promisify(fs.readFile);

    public logDirectory = path.join(__dirname, "../../.log");

    public async getAllForLevel(logLevel: string): Promise<string[]> {
        try {
            // With our pino-roll setup, folders are 'error' and 'combined'
            const folderName = logLevel === "error" ? "error" : "combined";
            const levelPath = path.join(this.logDirectory, folderName);

            if (!fs.existsSync(levelPath)) return [];

            const files = await this.readdir(levelPath);

            // combined.YYYY-MM-DD.1.log
            const logFilePattern = new RegExp(
                `^${folderName}\\.\\d{4}-\\d{2}-\\d{2}\\.\\d+\\.log$`,
            );

            return files.filter((file) => logFilePattern.test(file));
        } catch (error) {
            logger.error("Failed to read log directory", error as Error);
            throw new AppError("Log files not found.", 404);
        }
    }

    public async getLogContent(
        logLevel: string,
        fileName: string,
    ): Promise<string> {
        const folderName = logLevel === "error" ? "error" : "combined";
        const filePath = path.join(this.logDirectory, folderName, fileName);

        try {
            if (!fs.existsSync(filePath)) {
                throw new Error();
            }
            return await this.readFile(filePath, "utf8");
        } catch (error) {
            logger.error("Error reading log file content", error as Error);
            throw new AppError("This log file does not exist.", 404);
        }
    }
}

export default new LoggerService();
