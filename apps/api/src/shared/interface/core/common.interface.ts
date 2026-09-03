export interface ReqQueryOptions {
    page?: number;
    limit?: number;
    offset?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: "ASC" | "DESC";
}

export enum EnvironmentVariablesEnum {
    DEVELOPMENT = "development",
    PRODUCTION = "production",
    TEST = "test",
    STAGING = "staging",
}
