import { hc } from "hono/client";
import type { AppType } from "../lib";
import { getRequestContext } from "../utils/requestContext";

const { PUBLIC_APP_ENV } = import.meta.env;
let baseUrl = PUBLIC_APP_ENV === "prod" ? import.meta.env.SITE : "http://localhost:4321";

if (!baseUrl) {
    throw new Error("Missing baseUrl");
}

const customFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const context = getRequestContext();
    const headers = new Headers(init?.headers);

    if (context?.headers.cookie) {
        headers.set("cookie", context.headers.cookie);
    }

    return fetch(input, { ...init, headers });
};

const { api } = hc<AppType>(baseUrl, {
    fetch: customFetch,
    init: {
        credentials: 'include',
    },
});

export default api;
