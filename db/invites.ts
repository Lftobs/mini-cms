import { column, defineTable, NOW } from "astro:db";
import Projects from "./projects";

const Invites = defineTable({
    columns: {
        id: column.text({ primaryKey: true }),
        projectId: column.text({
            references: () => Projects.columns.id,
        }),
        email: column.text(),
        role: column.text({
            default: "editor",
        }),
        token: column.text({
            unique: true,
        }),
        expiresAt: column.date(),
        status: column.text({
            default: "pending", // pending, accepted, expired
        }),
        createdAt: column.date({ default: NOW }),
    },
});

export default Invites;
