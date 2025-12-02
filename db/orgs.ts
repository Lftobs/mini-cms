import { column, defineTable, NOW } from "astro:db";
import Users from "./user";

export const Orgs = defineTable({
	columns: {
		id: column.text({ primaryKey: true }),
		name: column.text({
			optional: true,
			unique: true,
		}),
		description: column.text({
			optional: true,
		}),
		owner: column.text({
			references: () => Users.columns.id,
		}),
		orgs_pfp: column.text({ optional: true }),
		installationId: column.text({
			optional: true,
		}),
		created_at: column.date({ default: NOW }),
	},
});

export const OrgMembers = defineTable({
	columns: {
		id: column.text({ primaryKey: true, default: '00000000-0000-0000-0000-000000000000' }),
		org_id: column.text({
			references: () => Orgs.columns.id,
		}),
		user_id: column.text({
			references: () => Users.columns.id,
		}),
		role: column.text({ default: "member" }),
		joined_at: column.date({ default: NOW }),
	},
});

export type OrgsType = typeof Orgs;
export type OrgMembersType = typeof OrgMembers;
