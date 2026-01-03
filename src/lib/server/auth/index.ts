import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  googleLoginHandler,
  googleCallbackHandler,
  refreshTokenHandler,
  logoutHandler
} from "./handlers";
import { callbackSchema, loginSchema, refreshSchema } from "./schemas";

export const auth = new Hono()
  .get("/google/login", zValidator("query", loginSchema), googleLoginHandler)
  .get("/google/callback", zValidator("query", callbackSchema), googleCallbackHandler)
  .post("/refresh", zValidator("json", refreshSchema), refreshTokenHandler)
  .post("/logout", logoutHandler);

export type AuthType = typeof auth;
