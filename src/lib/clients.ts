import { hc } from "hono/client";
import type { AppType } from "../lib";

const { APP_ENV } = import.meta.env;
let baseUrl = "http://localhost:4321";

if (APP_ENV === "prod") {
    if (!import.meta.env.SITE) {
        throw new Error("Missing baseUrl");
    }
    baseUrl = import.meta.env.SITE;
}

if (!baseUrl) {
    throw new Error("Missing baseUrl");
}

const { api } = hc<AppType>(baseUrl);

export default api;
