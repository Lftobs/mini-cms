import { z } from "zod";

export const callbackSchema = z.object({
    code: z.string().min(1, "Authorization code is required"),
    state: z.string().optional(),
});

export const refreshSchema = z.object({
    refreshToken: z.string().optional(),
});

export const loginSchema = z.object({
    next: z.string().optional().refine(
        (val) => {
            if (!val) return true;
            return val.startsWith('/') && !val.startsWith('//');
        },
        { message: "Redirect must be a relative path starting with /" }
    ),
});
