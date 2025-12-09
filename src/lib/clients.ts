import { hc } from "hono/client";
import type { AppType } from "../lib";

const { PUBLIC_APP_ENV } = import.meta.env;
let baseUrl = PUBLIC_APP_ENV === "prod" ? import.meta.env.SITE : "http://localhost:4321";


if (!baseUrl) {
    throw new Error("Missing baseUrl");
}

const { api } = hc<AppType>(baseUrl);

export default api;
