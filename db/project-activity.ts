import { column, defineTable, NOW } from "astro:db";
import Projects from "./projects";

const ProjectActivity = defineTable({
	columns: {
		id: column.text({ primaryKey: true }),
		project_id: column.text({
			references: () => Projects.columns.id,
		}),
		action_type: column.text(), // only 'commit' action for now
		file_path: column.text(),
		file_name: column.text(),
		contributor_name: column.text({
			optional: true,
		}),
		contributor_email: column.text({
			optional: true,
		}),
		changes_summary: column.text({
			optional: true,
		}),
		file_size: column.number({
			optional: true,
		}),
		created_at: column.date({ default: NOW }),
	},
});

export type ProjectActivityType = typeof ProjectActivity;
export default ProjectActivity;
