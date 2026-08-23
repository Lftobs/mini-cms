import { defineDb } from "astro:db";
import Invites from "./invites";
import { OrgMembers, Orgs } from "./orgs";
import ProjectActivity from "./project-activity";
import ProjectMembers from "./project-members";
import ProjectSettings from "./project-settings";
import Projects from "./projects";
import Users from "./user";
import Blacklist from "./blacklist";

export default defineDb({
	tables: {
		Users,
		Orgs,
		OrgMembers,
		Projects,
		ProjectSettings,
		ProjectActivity,
		ProjectMembers,
		Invites,
		Blacklist,
	},
});
