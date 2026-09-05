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

    getPaginationData(limit: number, page: number, totalCount: number) {
        const currentPage = page;
        const totalPages = totalCount == 0 ? 1 : Math.ceil(totalCount / limit);
        const previousPage = page - 1 === 0 ? null : page - 1;
        const nextPage = page + 1 > totalPages ? null : page + 1;

        return { currentPage, totalPages, previousPage, nextPage };
    }
}

export default new HelperUtil();
