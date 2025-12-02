import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  loginHandler,
  googleLoginHandler,
  googleCallbackHandler,
  githubCallbackHandler,
  refreshTokenHandler,
  logoutHandler
} from "./handlers";
import { callbackSchema, refreshSchema } from "./schemas";

export const auth = new Hono()
  .get("/login", loginHandler)
  .get("/google/login", googleLoginHandler)
  .get("/google/callback", zValidator("query", callbackSchema), googleCallbackHandler)
  .get("/github/callback", zValidator("query", callbackSchema), githubCallbackHandler)
  .post("/refresh", zValidator("json", refreshSchema), refreshTokenHandler)
  .post("/logout", logoutHandler);

export type AuthType = typeof auth;
