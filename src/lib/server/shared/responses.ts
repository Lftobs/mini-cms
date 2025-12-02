import type { Context } from "hono";
import { AppError } from "./errors";

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: {
        message: string;
        code?: string;
        field?: string;
    };
    pagination?: {
        page: number;
        limit: number;
        total: number;
        hasMore: boolean;
    };
}

export const success = <T>(data: T, pagination?: any): ApiResponse<T> => ({
    success: true,
    data,
    ...(pagination && { pagination })
});

export const error = (message: string, code?: string, field?: string): ApiResponse => ({
    success: false,
    error: { message, code, field }
});

// Hono middleware for error handling
export const errorHandler = (err: Error, c: Context) => {
    console.error(`[ERROR] ${new Date().toISOString()}`, {
        message: err.message,
        stack: err.stack,
        url: c.req.url,
        method: c.req.method
    });

    if (err instanceof AppError) {
        return c.json(error(err.message, err.code, err.field), err.statusCode as any);
    }

    return c.json(error('Internal server error'), 500);
};
