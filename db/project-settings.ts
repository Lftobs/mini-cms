import { column, defineTable, NOW } from "astro:db";
import Projects from "./projects";

const ProjectSettings = defineTable({
	columns: {
		id: column.text({ primaryKey: true }),
		project_id: column.text({
			references: () => Projects.columns.id,
		}),
		public_directories: column.text({
			default: "[]",
		}), // JSON array of allowed directories
		allow_file_creation: column.boolean({
			default: false,
		}),
		allow_file_editing: column.boolean({
			default: true,
		}),
		allow_file_deletion: column.boolean({
			default: false,
		}),
		max_file_size: column.number({
			default: 1048576,
		}), // 1MB default
		allowed_extensions: column.text({
			default: "[]",
		}), // JSON array of allowed file extensions
		require_approval: column.boolean({
			default: true,
		}), // Require PR approval
		auto_merge: column.boolean({
			default: false,
		}), // Auto-merge PRs
		collaborator_message: column.text({
			optional: true,
		}), // Message shown to collaborators
		created_at: column.date({ default: NOW }),
		updated_at: column.date({ default: NOW }),
	},
});

export type ProjectSettingsType = typeof ProjectSettings;
export default ProjectSettings;
