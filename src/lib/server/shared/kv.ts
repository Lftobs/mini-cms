import { getRequestContext } from "../../../utils/requestContext";

export const KV_BINDING = "KV";

export function getKV(): KVNamespace | undefined {
    const env = getRequestContext()?.env;
    if (!env) return undefined;
    return env[KV_BINDING] as KVNamespace | undefined;
}
