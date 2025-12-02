import { zValidator } from "@hono/zod-validator";
import { type Context, Hono } from "hono";
import { z } from "zod";
import { createPost, deletePost, getPost, getPostBySlug } from "./functions";

const blogSchema = z.object({
	title: z.string(),
	content: z.string(),
	excerpt: z.string(),
	slug: z.string(),
});

export const posts = new Hono()
	.get("/", getPost)
	.get("/:slug", getPostBySlug)
	.post("/new", zValidator("json", blogSchema), createPost)
	.delete("/:slug", deletePost);

// export default posts;
export type postsType = typeof posts;
