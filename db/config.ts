import { defineDb } from "astro:db";
import Blogs from "./blog";
import Invites from "./invites";
import { OrgMembers, Orgs } from "./orgs";
import ProjectActivity from "./project-activity";
import ProjectMembers from "./project-members";
import ProjectSettings from "./project-settings";
import Projects from "./projects";
import Users from "./user";

export default defineDb({
	tables: {
		Blogs,
		Users,
		Orgs,
		OrgMembers,
		Projects,
		ProjectSettings,
		ProjectActivity,
		ProjectMembers,
		Invites,
	},
});
