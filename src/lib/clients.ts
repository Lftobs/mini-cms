import { hc } from "hono/client";
import type { AppType } from "../lib";

const { api } = hc<AppType>("http://localhost:4321");

export default api;
