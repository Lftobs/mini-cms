import React, { useEffect, useState } from 'react';
import { userProjectsSWR } from '@/utils/cachedFn';
import { calculateActivityGrowth } from '@/lib/server/shared/utils';
import { actions } from 'astro:actions';

interface DashboardStatsProps {
  userId: string;
  currentOrgId: string;
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ userId, currentOrgId }) => {
  const [projectCount, setProjectCount] = useState<number | null>(null);
  const [activityGrowth, setActivityGrowth] = useState<{ growth: number; sign: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchStats = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/dashboard/stats?orgId=${currentOrgId}`);
        if (!response.ok) throw new Error('Failed to fetch stats');
        
        const result = await response.json();
        const data = result.data;
        
        if (isMounted) {
          setProjectCount(data.projectCount);
          setActivityGrowth(data.activityGrowth);
        }
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchStats();

    return () => {
      isMounted = false;
    };
  }, [userId, currentOrgId]);

  const StatCard = ({ title, value, icon, growth }: any) => (
    <div className="bg-white rounded-lg shadow-sm border border-earth-100 p-6">
      <div className="flex items-center">
        <div className="p-2 bg-earth-50 rounded-lg">
          {icon}
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-earth-200">{title}</p>
          <div className="flex items-baseline space-x-2">
            <p className="text-2xl font-semibold text-earth-400">
              {isLoading ? (
                <span className="inline-block w-12 h-6 bg-earth-50 animate-pulse rounded"></span>
              ) : (
                value
              )}
            </p>
            {growth && !isLoading && (
              <span className={`text-xs font-medium ${growth.growth >= 0 ? 'text-green-600' : 'text-earth-accent'}`}>
                {growth.sign}{growth.growth}%
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <StatCard
        title="Total Projects"
        value={projectCount ?? 0}
        icon={
          <svg className="w-6 h-6 text-earth-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        }
      />
      <StatCard
        title="Published Content"
        value="-"
        icon={
          <svg className="w-6 h-6 text-earth-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }
      />
      <StatCard
        title="This Month"
        value={activityGrowth ? `${activityGrowth.sign}${activityGrowth.growth}%` : "0%"}
        growth={null}
        icon={
          <svg className="w-6 h-6 text-earth-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        }
      />
    </div>
  );
};

export default DashboardStats;
