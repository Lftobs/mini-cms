import React, { useState, useEffect } from 'react';
import ProjectsList from './ProjectsList';
import RecentActivities from './RecentActivities';
import DashboardStats from './DashboardStats';
import { userProjectsSWR } from '@/utils/cachedFn';
import { $orgState, currentOrgIdState } from '@/store/navStore';

interface DashboardMainProps {
  userId: string;
  currentOrg: any;
  userOrgs?: any[];
  userName: string;
  installationSuccessMessage?: string;
  installationErrorMessage?: string;
  needsGitHubInstallation?: boolean;
}

const DashboardMain: React.FC<DashboardMainProps> = ({
  userId,
  currentOrg,
  userOrgs = [],
  userName,
  installationSuccessMessage,
  installationErrorMessage,
  needsGitHubInstallation
}) => {
  const [activeTab, setActiveTab] = useState<'projects' | 'activity'>('projects');
  const [projectIds, setProjectIds] = useState<string[]>([]);
  
  // Update Nanostores on mount/org change
  useEffect(() => {
    if (currentOrg?.id) {
      currentOrgIdState.set(currentOrg.id);
    }
    if (userOrgs && userOrgs.length > 0) {
      $orgState.set(userOrgs);
    }
  }, [currentOrg?.id, userOrgs]);

  // Pre-fetch projects to get IDs for RecentActivities
  useEffect(() => {
    const fetchProjectIds = async () => {
      try {
        const response = await userProjectsSWR.fetch(userId);
        const allProjects = response?.data || [];
        const orgProjects = allProjects.filter((p: any) => p.org_id === currentOrg?.id);
        setProjectIds(orgProjects.map((p: any) => p.id));
      } catch (err) {
        console.error('Failed to fetch project IDs for activity feed:', err);
      }
    };
    
    if (userId && currentOrg?.id) {
      fetchProjectIds();
    }
  }, [userId, currentOrg?.id]);

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow-sm border border-earth-100 p-6">
        <h1 className="text-2xl font-semibold text-earth-400 mb-2">
          Welcome back, {userName}!
        </h1>
        <p className="text-earth-300">
          Here's what's happening with your projects in{" "}
          <span className="inline-block bg-earth-accent-light/50 font-bold text-earth-500 px-2 py-1 rounded-full text-xs">
            {currentOrg?.name || "your organization"}
          </span>{" "}
          today.
        </p>
      </div>

      {/* Stats Cards Section */}
      <DashboardStats 
        userId={userId} 
        currentOrgId={currentOrg?.id} 
      />

      {/* Projects & Recent Activity Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-earth-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-earth-400">
            Projects & Activity
          </h2>
          <div className="flex items-center space-x-4">
            <div className="flex space-x-1 bg-earth-50 p-1 rounded-lg">
              <button
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'projects' ? 'bg-white shadow-sm text-earth-500' : 'text-earth-400 hover:text-earth-500'
                }`}
                onClick={() => setActiveTab('projects')}
              >
                Projects
              </button>
              <button
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'activity' ? 'bg-white shadow-sm text-earth-500' : 'text-earth-400 hover:text-earth-500'
                }`}
                onClick={() => setActiveTab('activity')}
              >
                Activity
              </button>
            </div>
            {activeTab === 'activity' && (
              <button
                onClick={() => window.location.reload()}
                className="p-2 text-earth-400 rounded-full hover:bg-earth-100 transition-colors"
                title="Refresh activities"
              >
                <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.664 0l3.18-3.185m-3.181 0l-3.182-3.182m0 0a8.25 8.25 0 00-11.664 0l-3.18 3.185" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {activeTab === 'projects' && (
          <div className="transition-all duration-300">
            <ProjectsList userId={userId} currentOrgId={currentOrg?.id} />
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="transition-all duration-300 space-y-4">
            <RecentActivities 
              projectIds={projectIds} 
              initialLimit={20} 
            />
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-earth-100 p-6">
        <h2 className="text-lg font-semibold text-earth-400 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href={`/dashboard/project/new${currentOrg?.id ? `?org=${currentOrg.id}` : ""}`}
            className="flex items-center p-4 border border-earth-100 rounded-lg hover:bg-earth-50 transition-colors"
          >
            <svg className="w-6 h-6 text-earth-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-medium text-earth-400">Create New Project</p>
              <p className="text-sm text-earth-200">Start a new content project</p>
            </div>
          </a>

          <a
            href="/dashboard/org/new"
            className="flex items-center p-4 border border-earth-100 rounded-lg hover:bg-earth-50 transition-colors"
          >
            <svg className="w-6 h-6 text-earth-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-medium text-earth-400">Create New Organization</p>
              <p className="text-sm text-earth-200">Manage your projects in a new org</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
};

export default DashboardMain;
