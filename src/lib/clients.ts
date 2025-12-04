import { hc } from "hono/client";
import type { AppType } from "../lib";

const { APP_ENV } = import.meta.env;
let baseUrl = "http://localhost:4321";

if (APP_ENV === "prod") {
    if (!import.meta.env.BASE_URL) {
        throw new Error("Missing baseUrl");
    }
    baseUrl = "https://mini-cms-psi.vercel.app/";
}


if (!baseUrl) {
    throw new Error("Missing baseUrl");
}

const { api } = hc<AppType>(baseUrl);

export default api;
