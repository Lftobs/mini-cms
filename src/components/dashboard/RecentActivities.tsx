import { useCallback, useEffect, useState } from "react";
import { actions } from "astro:actions";

interface ProjectActivity {
	id: string;
	action_type: string;
	file_path: string;
	file_name: string;
	contributor_name?: string;
	created_at: string;
}

interface RecentActivitiesProps {
	projectIds: string[];
	initialLimit?: number;
}

const RecentActivities: React.FC<RecentActivitiesProps> = ({
	projectIds,
	initialLimit = 20,
}) => {
	const [activities, setActivities] = useState<ProjectActivity[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [hasMore, setHasMore] = useState(false);
	const [page, setPage] = useState(1);
	const [error, setError] = useState<string | null>(null);

	const fetchActivities = useCallback(async () => {
		if (projectIds.length === 0) {
			setIsLoading(false);
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			// Fetch activities for each project with pagination
			const activityPromises = projectIds.map((projectId) =>
				actions.projectsActions.getProjectActivity({
					projectId,
					page: 1,
					limit: Math.ceil(initialLimit / projectIds.length),
				}),
			);

			const activityResults = await Promise.all(activityPromises);
			const allActivities = activityResults
				.map((res) => res.data || [])
				.flat()
				.sort(
					(a, b) =>
						new Date(b.created_at).getTime() -
						new Date(a.created_at).getTime(),
				)
				.slice(0, initialLimit);

			setActivities(allActivities);
			setHasMore(allActivities.length >= initialLimit);
		} catch (err) {
			console.error("Error fetching activities:", err);
			setError("Failed to load activities");
		} finally {
			setIsLoading(false);
		}
	}, [projectIds, initialLimit]);

	const loadMore = useCallback(async () => {
		if (projectIds.length === 0) return;

		const nextPage = page + 1;
		setPage(nextPage);

		try {
			const activityPromises = projectIds.map((projectId) =>
				actions.projectsActions.getProjectActivity({
					projectId,
					page: nextPage,
					limit: Math.ceil(initialLimit / projectIds.length),
				}),
			);

			const activityResults = await Promise.all(activityPromises);
			const newActivities = activityResults
				.map((res) => res.data || [])
				.flat()
				.sort(
					(a, b) =>
						new Date(b.created_at).getTime() -
						new Date(a.created_at).getTime(),
				);

			if (newActivities.length === 0) {
				setHasMore(false);
			} else {
				setActivities((prev) => {
					const combined = [...prev, ...newActivities];
					// Remove duplicates and sort
					const unique = combined.filter(
						(activity, index, self) =>
							index === self.findIndex((a) => a.id === activity.id),
					);
					return unique.sort(
						(a, b) =>
							new Date(b.created_at).getTime() -
							new Date(a.created_at).getTime(),
					);
				});
			}
		} catch (err) {
			console.error("Error loading more activities:", err);
		}
	}, [projectIds, page, initialLimit]);

	useEffect(() => {
		fetchActivities();
	}, [fetchActivities]);

	const getRelativeTime = (dateString: string): string => {
		const date = new Date(dateString);
		const now = new Date();
		const diff = Math.round((now.getTime() - date.getTime()) / 1000);

		if (diff < 60) return `${diff}s ago`;
		if (diff < 3600) return `${Math.round(diff / 60)}mins ago`;
		if (diff < 86400) return `${Math.round(diff / 3600)}hrs ago`;
		return `${Math.round(diff / 86400)}days ago`;
	};

	if (isLoading) {
		return (
			<div className="space-y-4 animate-pulse">
				{[...Array(5)].map((_, i) => (
					<div key={i} className="flex items-center space-x-3">
						<div className="w-2 h-2 bg-earth-200 rounded-full"></div>
						<div className="flex-1 space-y-2">
							<div className="h-4 bg-earth-100 rounded w-3/4"></div>
							<div className="h-3 bg-earth-100 rounded w-1/4"></div>
						</div>
					</div>
				))}
			</div>
		);
	}

	if (error) {
		return (
			<div className="text-center py-8">
				<svg
					className="w-12 h-12 text-earth-200 mx-auto mb-4"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
					/>
				</svg>
				<p className="text-earth-300 mb-2">{error}</p>
				<button
					onClick={fetchActivities}
					className="text-earth-400 hover:text-earth-500 font-medium"
				>
					Try again
				</button>
			</div>
		);
	}

	if (activities.length === 0) {
		return (
			<div className="text-center py-8">
				<svg
					className="w-12 h-12 text-earth-200 mx-auto mb-4"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
					/>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
					/>
				</svg>
				<p className="text-earth-300 mb-2">No recent activity</p>
				<p className="text-sm text-earth-200">
					Recent project activities will appear here.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{activities.map((activity) => (
				<div key={activity.id} className="flex items-center space-x-3">
					<div className="w-2 h-2 bg-earth-400 rounded-full"></div>
					<div className="flex-1">
						<div className="flex items-center flex-wrap gap-1 text-sm text-earth-300">
							<span>{activity.action_type}</span>
							<span>on</span>
							<span className="px-2 py-0.5 bg-yellow-100 font-semibold text-earth-500 rounded-full text-xs font-medium">
								{activity.file_name}
							</span>
							{activity.contributor_name && (
								<div className="flex items-center gap-1">
									<span>by</span>
									<span className="px-2 py-0.5 bg-yellow-100 font-semibold text-earth-500 rounded-full text-xs font-medium">
										{activity.contributor_name}
									</span>
								</div>
							)}
						</div>
						<p className="text-xs text-earth-200">
							{getRelativeTime(activity.created_at)}
						</p>
					</div>
				</div>
			))}

			{hasMore && (
				<div className="text-center pt-4">
					<button
						onClick={loadMore}
						className="px-4 py-2 text-sm font-medium text-earth-400 bg-earth-50 border border-earth-200 rounded-md hover:bg-earth-100 transition-colors"
					>
						Load More
					</button>
				</div>
			)}
		</div>
	);
};

export default RecentActivities;
