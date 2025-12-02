import { z } from "zod";

const blogSchema = z.object({
	title: z.string(),
	content: z.string(),
	excerpt: z.string(),
	slug: z.string(),
});
