import { column, defineTable, NOW } from "astro:db";

const Blogs = defineTable({
	columns: {
		id: column.text({ primaryKey: true }),
		author: column.text({
			default: "Anonymous",
		}),
		title: column.text({ unique: true }),
		excerpt: column.text({ optional: true }),
		content: column.text({ optional: true }),
		slug: column.text({ unique: true }),
		date: column.date({ default: NOW }),
	},
});

export type BlogType = typeof Blogs;
export default Blogs;
