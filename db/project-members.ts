import { column, defineTable, NOW } from "astro:db";
import Projects from "./projects";
import Users from "./user";

const ProjectMembers = defineTable({
    columns: {
        id: column.text({ primaryKey: true }),
        projectId: column.text({
            references: () => Projects.columns.id,
        }),
        userId: column.text({
            references: () => Users.columns.id,
        }),
        role: column.text({
            default: "editor", // editor, admin
        }),
        createdAt: column.date({ default: NOW }),
    },
});

export default ProjectMembers;
