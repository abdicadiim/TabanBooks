// Utility helper functions

// Generate unique ID
export const uid = (): string => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Type guard for error objects
export const isError = (error: unknown): error is Error => {
    return error instanceof Error;
};

// Get error message safely
export const getErrorMessage = (error: unknown): string => {
    if (isError(error)) {
        return error.message;
    }
    return String(error);
};
