import { Blogs, db } from "astro:db";

// https://astro.build/db/seed
export default async function seed() {
	const posts = [
		{
			id: 1,
			title: "Getting Started with Astro",
			excerpt: "Learn how to build fast websites with Astro...",
			content:
				"Astro is a modern static site generator that allows you to build fast websites using your favorite frameworks and libraries. In this post, we will explore the basics of Astro and how to get started with it.",
			date: new Date("2024-01-15"),
			slug: "getting-started-with-astro",
		},
		{
			id: 2,
			title: "Why Minimalism Matters",
			excerpt: "Exploring the benefits of minimalist design...",
			content:
				"Minimalism is a design philosophy that emphasizes simplicity and the elimination of unnecessary elements. In this post, we will discuss the benefits of minimalist design and how it can improve user experience.",
			date: new Date("2024-01-20"),
			slug: "why-minimalism-matters",
		},
	];
	await db.insert(Blogs).values(
		posts.map((post) => ({
			// id: post.id,
			title: post.title,
			excerpt: post.excerpt,
			content: post.content,
			slug: post.slug,
			date: post.date,
		})),
	);
}
