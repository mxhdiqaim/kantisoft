export const getEnvVariable = (key: string): string => {
    const value = import.meta.env[key];

    if (!value) {
        throw new Error(`Environment variable is missing: ${key}`);
    }

    return value;
};
