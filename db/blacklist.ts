import { column, defineTable } from "astro:db";

const Blacklist = defineTable({
	columns: {
		id: column.text({ primaryKey: true }),
		expiresAt: column.number(),
	},
});

export default Blacklist;
