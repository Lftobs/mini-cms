export interface Activity {
    created_at: string | Date;
    [key: string]: any;
}

export function calculateActivityGrowth(activities: Activity[]) {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const currentMonthActivities = activities.filter((activity) => {
        const date = new Date(activity.created_at);
        return (
            date.getMonth() === currentMonth && date.getFullYear() === currentYear
        );
    }).length;

    const lastMonthActivities = activities.filter((activity) => {
        const date = new Date(activity.created_at);
        return (
            date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear
        );
    }).length;

    let activityGrowth = 0;
    if (lastMonthActivities > 0) {
        activityGrowth = Math.round(
            ((currentMonthActivities - lastMonthActivities) / lastMonthActivities) *
            100,
        );
    } else if (currentMonthActivities > 0) {
        activityGrowth = 100;
    }

    return {
        growth: activityGrowth,
        sign: activityGrowth >= 0 ? "+" : "",
    };
}
