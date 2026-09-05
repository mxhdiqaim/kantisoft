import "dotenv/config";

class HelperUtil {
    public getEnvVariable(key: string): string {
        const value = process.env[key];

        if (!value) {
            throw new Error(`Environment variable is missing: ${key}`);
        }

        return value;
    }
}

export default new HelperUtil();
