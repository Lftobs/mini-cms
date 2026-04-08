import React, { useEffect, useState } from 'react';
import { userProjectsSWR } from '@/utils/cachedFn';

interface Project {
  id: string;
  name: string;
  description: string;
  github_repo_link: string;
  org_id: string;
}

interface ProjectsListProps {
  userId: string;
  currentOrgId: string;
}

const ProjectsList: React.FC<ProjectsListProps> = ({ userId, currentOrgId }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchProjects = async () => {
      setIsLoading(true);
      try {
        const response = await userProjectsSWR.fetch(userId);
        if (isMounted) {
          const allProjects = response?.data || [];
          const orgProjects = allProjects.filter((p: Project) => p.org_id === currentOrgId);
          setProjects(orgProjects);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error fetching projects:', err);
          setError('Failed to load projects');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchProjects();

    return () => {
      isMounted = false;
    };
  }, [userId, currentOrgId]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-earth-50 rounded-lg p-3 border border-earth-100 animate-pulse h-24">
            <div className="h-4 bg-earth-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-earth-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-earth-300">
        <p>{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-2 text-earth-400 hover:underline text-sm"
        >
          Try again
        </button>
      </div>
    );
  }

  if (projects.length === 0) {
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
            strokeWidth="2"
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
        <p className="text-earth-300 mb-2">No projects yet</p>
        <p className="text-sm text-earth-200">
          Create your first project to get started
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map((project) => (
        <div key={project.id} className="bg-earth-50 rounded-lg p-3 border border-earth-100 hover:border-earth-200 transition-colors">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-medium text-earth-400 mb-1">
                {project.name || "Unnamed Project"}
              </h3>
              <p className="text-sm text-earth-300 line-clamp-2">
                {project.description || "No description"}
              </p>
            </div>
            <div className="flex space-x-2 ml-2">
              {project.github_repo_link && (
                <a
                  href={project.github_repo_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-2 py-1 text-xs font-medium text-earth-400 bg-white border border-earth-200 rounded-md hover:bg-earth-50 transition-colors"
                >
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  View Repo
                </a>
              )}
              <a
                href={`/dashboard/project/edit/${project.id}`}
                className="inline-flex items-center px-2 py-1 text-xs font-medium text-white bg-earth-400 border border-earth-400 rounded-md hover:bg-earth-300 transition-colors"
              >
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </a>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProjectsList;
