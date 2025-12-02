import { column, defineTable, NOW } from "astro:db";

const Users = defineTable({
	columns: {
		id: column.text({ primaryKey: true }),
		username: column.text({
			optional: true,
			unique: true,
		}),
		githubName: column.text({
			unique: true,
			optional: true,
		}),
		googleId: column.text({
			unique: true,
			optional: true,
		}),
		email: column.text({
			unique: true,
			optional: true,
		}),
		provider: column.text(),
		isGithubEnabled: column.boolean({ default: false }),
		pfp: column.text({ optional: true }),
		createdAt: column.date({ default: NOW }),
	},
});

export type UserSchemaType = typeof Users;
export default Users;
