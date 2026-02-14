export type ApiResponse<T> =
    | { success: true, data: T }
    | { success: false; error: string };

export function assertNever(value: never): never {
    throw new Error(`Unhandled union member: ${JSON.stringify(value)}`);
}