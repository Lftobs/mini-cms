import { z } from "zod";

export const callbackSchema = z.object({
    code: z.string().min(1, "Authorization code is required"),
    state: z.string().optional(),
});

export const refreshSchema = z.object({
    refreshToken: z.string().optional(),
});

export const loginSchema = z.object({
    redirect: z.string().url().optional(),
});
