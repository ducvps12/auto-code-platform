// ============ USER & AUTH ============

export interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  apiKey: string;
  plan: Plan;
  createdAt: Date;
  updatedAt: Date;
}

export type Plan = 'FREE' | 'PRO' | 'TEAM' | 'ENTERPRISE';

export type TeamRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export interface Team {
  id: string;
  name: string;
  createdAt: Date;
}

export interface TeamMember {
  id: string;
  role: TeamRole;
  userId: string;
  teamId: string;
}
