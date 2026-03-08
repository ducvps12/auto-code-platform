// ============ APPROVAL ============

export type ApprovalDecision = 'APPROVED' | 'REJECTED' | 'REQUEST_CHANGES';

export interface Approval {
  id: string;
  jobId: string;
  userId: string;
  decision?: ApprovalDecision;
  comment?: string;
  createdAt: Date;
  decidedAt?: Date;
}

export interface ApprovalDecideRequest {
  decision: ApprovalDecision;
  comment?: string;
}
