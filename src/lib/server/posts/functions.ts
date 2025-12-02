import { Blogs, db, desc, eq } from "astro:db";
import type { Context } from "hono";

export const getPost = async (c: Context) => {
	const posts = await db.select().from(Blogs).orderBy(desc(Blogs.date)).all();
	if (!posts) {
		return c.json({ error: "No posts found" }, 404);
	}
	return c.json({ posts }, 200);
};

export const getPostBySlug = async (c: Context) => {
	const post = await db
		.select()
		.from(Blogs)
		.where(eq(Blogs.slug, c.req.param("slug")))
		.get();
	if (!post) {
		return c.json({ error: "Post not found" }, 404);
	}
	return c.json({ post }, 200);
};

export const createPost = async (c: Context) => {
	const { slug, excerpt, title, content } = await c.req.json();
	if (!title || !content || !slug) {
		return c.json({ error: "Title, content and slug are required" }, 400);
	}
	if (typeof slug !== "string") {
		return c.json({ error: "Slug must be a string" }, 400);
	}
	const existingPost = await db
		.select()
		.from(Blogs)
		.where(eq(Blogs.slug, slug))
		.get();

	if (existingPost) {
		return c.json({ error: "Post with this slug already exists" }, 400);
	}
	// Perform the insert operation
	await db.insert(Blogs).values({
		title: title,
		excerpt: excerpt,
		content: content,
		slug: slug,
		date: new Date(),
	});

	// Fetch the newly inserted post
	const post = await db.select().from(Blogs).where(eq(Blogs.slug, slug)).get();

	return c.json({ post: post }, 201);
};

export const deletePost = async (c: Context) => {
	const post = await db
		.select()
		.from(Blogs)
		.where(eq(Blogs.slug, c.req.param("slug")))
		.get();
	if (!post) {
		return c.json({ error: "Post not found" }, 404);
	}
	await db
		.delete(Blogs)
		.where(eq(Blogs.slug, c.req.param("slug")))
		.run();
	return c.json({ post }, 200);
};
