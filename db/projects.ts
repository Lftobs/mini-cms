import { column, defineTable, NOW } from "astro:db";
import { Orgs } from "./orgs";

const Projects = defineTable({
	columns: {
		id: column.text({ primaryKey: true }),
		name: column.text({
			optional: true,
			unique: true,
		}),
		description: column.text({
			optional: true,
		}),
		linked_repo_name: column.text({
			default: "",
		}),
		github_repo_link: column.text({
			default: "",
		}),
		visibility: column.text({
			default: "public",
		}),
		orgs_id: column.text({
			references: () => Orgs.columns.id,
		}),
		created_at: column.date({ default: NOW }),
	},
});

export type ProjectsType = typeof Projects;
export default Projects;
