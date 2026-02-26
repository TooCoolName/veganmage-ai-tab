export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return 'Unknown error';
}

export const fireAndForget = (promise: Promise<unknown>, taskName = 'Task') => {
    promise.catch((err) => {
        console.error(`Unhandled error in ${taskName}:`, err);
    });
};
