import { getRequestContext } from "../../../utils/requestContext";

export const KV_BINDING = "KV";

<<<<<<< HEAD
export function getKV(): KVNamespace | undefined {
    const env = getRequestContext()?.env;
    if (!env) return undefined;
    return env[KV_BINDING] as KVNamespace | undefined;
=======
export interface KV {
    get(key: string, type?: "text" | "json"): Promise<string | null | undefined>;
    put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
    delete(key: string): Promise<void>;
    list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{
        keys: { name: string }[];
        list_complete: boolean;
        cursor: string;
    }>;
}

export function getKV(): KV | undefined {
    const env = getRequestContext()?.env;
    if (!env) return undefined;
    return env[KV_BINDING] as KV | undefined;
>>>>>>> origin/switch
}
