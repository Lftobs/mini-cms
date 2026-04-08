import type { Context } from "hono";
import { db, eq, and, Projects, ProjectMembers, ProjectActivity, Orgs, desc, inArray } from "astro:db";
import { calculateActivityGrowth } from "../shared/utils";

export const getDashboardStatsHandler = async (c: Context) => {
	const userId = c.get("userId");
	const orgId = c.req.query("orgId");

	if (!orgId) {
		return c.json({ error: "Organization ID is required" }, 400);
	}

	try {
        // 1. Get projects for this org that the user can see
        const projects = await db
            .select({ id: Projects.id })
            .from(Projects)
            .where(eq(Projects.orgs_id, orgId))
            .all();

        const projectIds = projects.map(p => p.id);

        if (projectIds.length === 0) {
            return c.json({
                data: {
                    projectCount: 0,
                    publishedCount: 0,
                    activityGrowth: { growth: 0, sign: "+" }
                }
            });
        }

        // 2. Get activities for these projects
        const activities = await db
            .select()
            .from(ProjectActivity)
            .where(inArray(ProjectActivity.project_id, projectIds))
            .all();

        const growthData = calculateActivityGrowth(activities);

        c.header("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
        return c.json({
            data: {
                projectCount: projectIds.length,
                publishedCount: activities.length,
                activityGrowth: growthData
            }
        });
	} catch (error) {
		console.error("[DashboardStats] Error:", error);
		return c.json({ error: "Failed to fetch dashboard stats" }, 500);
	}
};

export const getDashboardProjectsHandler = async (c: Context) => {
	const userId = c.get("userId");
	const orgId = c.req.query("orgId");
	const page = parseInt(c.req.query("page") || "1");
	const limit = Math.min(parseInt(c.req.query("limit") || "20"), 100); // Max 100 per page

	if (!orgId) {
		return c.json({ error: "Organization ID is required" }, 400);
	}

	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	try {
		const offset = (page - 1) * limit;

		// Get owned projects (via org ownership)
		const ownedProjects = await db
			.select({
				id: Projects.id,
				name: Projects.name,
				description: Projects.description,
				visibility: Projects.visibility,
				linked_repo_name: Projects.linked_repo_name,
				github_repo_link: Projects.github_repo_link,
				created_at: Projects.created_at,
				org_name: Orgs.name,
				org_id: Orgs.id,
			})
			.from(Projects)
			.innerJoin(Orgs, eq(Projects.orgs_id, Orgs.id))
			.where(
				and(
					eq(Projects.orgs_id, orgId),
					eq(Orgs.owner, userId)
				)
			)
			.limit(limit)
			.offset(offset)
			.all();

		// Get member projects
		const memberProjects = await db
			.select({
				id: Projects.id,
				name: Projects.name,
				description: Projects.description,
				visibility: Projects.visibility,
				linked_repo_name: Projects.linked_repo_name,
				github_repo_link: Projects.github_repo_link,
				created_at: Projects.created_at,
				org_name: Orgs.name,
				org_id: Orgs.id,
				role: ProjectMembers.role,
			})
			.from(Projects)
			.innerJoin(Orgs, eq(Projects.orgs_id, Orgs.id))
			.innerJoin(ProjectMembers, eq(Projects.id, ProjectMembers.projectId))
			.where(
				and(
					eq(Projects.orgs_id, orgId),
					eq(ProjectMembers.userId, userId)
				)
			)
			.limit(limit)
			.offset(offset)
			.all();

		const ownedWithRole = ownedProjects.map((p) => ({ ...p, role: "owner" }));
		const allProjects = [...ownedWithRole, ...memberProjects];

		// Get total count for pagination
		const totalCount = await db
			.select({ id: Projects.id })
			.from(Projects)
			.where(eq(Projects.orgs_id, orgId))
			.all();

		c.header("Cache-Control", "private, max-age=10, stale-while-revalidate=60");
		return c.json({
			data: {
				projects: allProjects,
				pagination: {
					page,
					limit,
					total: totalCount.length,
					hasMore: (page * limit) < totalCount.length
				}
			}
		});
	} catch (error) {
		console.error("[DashboardProjects] Error:", error);
		return c.json({ error: "Failed to fetch projects" }, 500);
	}
};

export const getDashboardActivitiesHandler = async (c: Context) => {
	const userId = c.get("userId");
	const orgId = c.req.query("orgId");
	const page = parseInt(c.req.query("page") || "1");
	const limit = Math.min(parseInt(c.req.query("limit") || "20"), 50); // Max 50 per page

	if (!orgId) {
		return c.json({ error: "Organization ID is required" }, 400);
	}

	try {
		const offset = (page - 1) * limit;

		// Get projects for this org
		const projects = await db
			.select({ id: Projects.id })
			.from(Projects)
			.where(eq(Projects.orgs_id, orgId))
			.all();

		const projectIds = projects.map(p => p.id);

		if (projectIds.length === 0) {
			return c.json({
				data: {
					activities: [],
					pagination: { page, limit, total: 0, hasMore: false }
				}
			});
		}

		// Get paginated activities for these projects
		const activities = await db
			.select()
			.from(ProjectActivity)
			.where(inArray(ProjectActivity.project_id, projectIds))
			.orderBy(desc(ProjectActivity.created_at))
			.limit(limit)
			.offset(offset)
			.all();

		// Get total count
		const totalActivities = await db
			.select({ id: ProjectActivity.id })
			.from(ProjectActivity)
			.where(inArray(ProjectActivity.project_id, projectIds))
			.all();

		c.header("Cache-Control", "private, max-age=5, stale-while-revalidate=30");
		return c.json({
			data: {
				activities,
				pagination: {
					page,
					limit,
					total: totalActivities.length,
					hasMore: (page * limit) < totalActivities.length
				}
			}
		});
	} catch (error) {
		console.error("[DashboardActivities] Error:", error);
		return c.json({ error: "Failed to fetch activities" }, 500);
	}
};
