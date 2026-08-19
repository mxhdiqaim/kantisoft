import "dotenv/config";

class HelperUtil {
    public getEnvVariable(key: string): string {
        const value = process.env[key];

        if (!value) {
            throw new Error(`Environment variable is missing: ${key}`);
        }

        return value;
    }

    public getSlug(text: string): string {
        return text
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, "")
            .replace(/[\s_-]+/g, "-")
            .replace(/^-+|-+$/g, "");
    }
}

export default new HelperUtil();
