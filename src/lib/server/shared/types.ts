export interface PaginationParams {
    page?: number;
    limit?: number;
}

export interface PaginationResult<T> {
    items: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        hasMore: boolean;
    };
}

export interface User {
    id: string;
    email: string | null;
    username: string;
    githubName: string | null;
    googleId: string | null;
    provider: string;
    pfp: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateUserData {
    email?: string;
    username: string;
    githubName?: string;
    googleId?: string;
    provider: string;
    isGithubEnabled: boolean;
    pfp: string;
}
