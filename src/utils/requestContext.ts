export interface RequestContext {
    headers: {
        cookie?: string;
        [key: string]: string | undefined;
    };
}


let storage: any = null;
let initPromise: Promise<void> | null = null;

async function ensureStorage() {
    if (storage || !import.meta.env.SSR) return;
    if (initPromise) {
        await initPromise;
        return;
    }

    initPromise = import("node:async_hooks")
        .then((mod) => {
            storage = new mod.AsyncLocalStorage<RequestContext>();
        })
        .catch((err) => {
            console.error("[RequestContext] Failed to initialize AsyncLocalStorage:", err);
            throw err;
        });

    await initPromise;
}
export async function runWithContext<T>(context: RequestContext, fn: () => Promise<T>): Promise<T> {
    if (import.meta.env.SSR) {
        await ensureStorage();
        if (!storage) {
            throw new Error("[RequestContext] Failed to initialize AsyncLocalStorage");
        }
        return storage.run(context, fn);
    }
    console.log("[RequestContext] - run fn");
    return fn();
}



export function getRequestContext(): RequestContext | undefined {
    if (import.meta.env.SSR && storage) {
        return storage.getStore();
    }
    return undefined;
}
