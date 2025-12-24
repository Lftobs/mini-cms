export interface RequestContext {
    headers: {
        cookie?: string;
        [key: string]: string | undefined;
    };
}

let storage: any = null;

if (import.meta.env.SSR) {
    import("node:async_hooks")
        .then((mod) => {
            storage = new mod.AsyncLocalStorage<RequestContext>();
        })
        .catch((err) => {
            console.error("[RequestContext] Failed to initialize AsyncLocalStorage:", err);
        });
}

export async function runWithContext<T>(context: RequestContext, fn: () => Promise<T>): Promise<T> {
    if (import.meta.env.SSR) {
        if (!storage) {
            try {
                const mod = await import("node:async_hooks");
                storage = new mod.AsyncLocalStorage<RequestContext>();
            } catch (e) {
                return fn();
            }
        }
        return storage.run(context, fn);
    }

    return fn();
}

export function getRequestContext(): RequestContext | undefined {
    if (import.meta.env.SSR && storage) {
        return storage.getStore();
    }
    return undefined;
}
