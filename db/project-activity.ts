import { column, defineTable, NOW } from "astro:db";
import Projects from "./projects";

const ProjectActivity = defineTable({
	columns: {
		id: column.text({ primaryKey: true }),
		project_id: column.text({
			references: () => Projects.columns.id,
		}),
		action_type: column.text(), // 'file_created', 'file_edited', 'file_deleted', 'pr_created', 'pr_merged'
		file_path: column.text(),
		file_name: column.text(),
		contributor_name: column.text({
			optional: true,
		}),
		contributor_email: column.text({
			optional: true,
		}),
		contributor_ip: column.text({
			optional: true,
		}),
		changes_summary: column.text({
			optional: true,
		}), // Brief description of changes
		content_preview: column.text({
			optional: true,
		}), // First 500 chars of content
		pr_number: column.number({
			optional: true,
		}), // GitHub PR number if applicable
		pr_status: column.text({
			optional: true,
		}), // 'open', 'merged', 'closed'
		file_size: column.number({
			optional: true,
		}),
		created_at: column.date({ default: NOW }),
	},
});

export type ProjectActivityType = typeof ProjectActivity;
export default ProjectActivity;
