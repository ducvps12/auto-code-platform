// ============ REPOSITORY ============

export type GitProvider = 'GITHUB' | 'GITLAB' | 'BITBUCKET';

export interface Repository {
  id: string;
  name: string;
  cloneUrl: string;
  provider: GitProvider;
  defaultBranch: string;
  accessToken?: string;
  userId: string;
  teamId?: string;
  createdAt: Date;
}
