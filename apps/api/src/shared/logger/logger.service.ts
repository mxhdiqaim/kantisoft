import fs from "fs/promises";
import path from "path";
import logger from "./index";
import { AppError } from "../errors/custom.error";

export type LogFolder = "error" | "combined";

class LogReaderService {
    private readonly logDirectory: string;

    constructor() {
        this.logDirectory = path.join(__dirname, "../../.log");
    }

    private getFolderPath(folderName: LogFolder): string {
        return path.join(this.logDirectory, folderName);
    }

    public async getFilesForFolder(folderName: LogFolder): Promise<string[]> {
        const folderPath = this.getFolderPath(folderName);

        try {
            const files = await fs.readdir(folderPath);

            // Matches pino-roll pattern: combined.2026-07-25.1.log
            const logFilePattern = new RegExp(`^${folderName}\\.\\d{4}-\\d{2}-\\d{2}\\.\\d+\\.log$`);

            return files.filter((file) => logFilePattern.test(file));
        } catch (error: any) {
            // ENOENT means the folder doesn't exist yet (e.g., no errors logged yet)
            if (error.code === "ENOENT") {
                return [];
            }
            logger.error(`Failed to read log directory: ${folderPath}`, error);
            throw new AppError("Log directory could not be accessed.", 500);
        }
    }

    public async getLogContent(folderName: LogFolder, fileName: string): Promise<string> {
        const filePath = path.join(this.getFolderPath(folderName), fileName);

        try {
            return await fs.readFile(filePath, "utf8");
        } catch (error: any) {
            if (error.code === "ENOENT") {
                throw new AppError("This log file does not exist.", 404);
            }
            logger.error(`Error reading log file: ${filePath}`, error);
            throw new AppError("Failed to read log file content.", 500);
        }
    }
}

export default new LogReaderService();
