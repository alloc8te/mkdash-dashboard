// ============================================================
// Rental IQ Types
// ============================================================

export interface RIQMilestone {
  activityId: number;
  activityName: string;
  milestoneWeight: number;        // New: Milestone Weight (0-1)
  taskCompletionPct: number;      // New: Task Completion % (0-1)
  startDate: string;
  endDate: string;
  overallStatus: string;
  owner: string;                  // New: Owner
  comments?: string;              // New: Comments (optional)
}

export interface RIQActivity {
  subTaskId: number;
  parentId: number;
  activityName: string;
  subTaskName: string;
  status: string;
  owner: string;
  subEndDate: string;
  priority: string;
  currentDate: string;
  comments: string;
}

export interface RIQMilestoneCompletion {
  activityId: number;
  activityName: string;
  taskCompletionPct: number;
  milestoneWeight: number;
  completionPct: number;
  status: string;
  cumulativeCompletionPct: number;
  owner: string;
}

export interface RIQRisk {
  srNo: number;
  risk: string;
  probability: string;
  impact: string;
  status: string;
  riskOwner: string;
  mitigationPlan: string;
  mitigationStatus: string;
  comments: string;
}

export interface RIQDevTask {
  date: string;
  open: number;
  completed: number;
  onHold?: number;  // New: On-Hold tasks (optional)
}

export interface RIQMarketAnalytics {
  srNo: number;
  agencyName: string;
  state: string;
  estimatedRentalPortfolio: number;
  estimatedTenantApps: number;
  priorityTier: string;
  focusAreas: string;
  onboardingStatus: string;
}

export interface RIQPlatformInsight {
  srNo: number;
  metric: string;
  value: number;
}

export interface RIQAffordabilityRating {
  srNo: number;
  rating: string;
  numberOfUsers: number;
}

export interface RentalIQData {
  milestones: RIQMilestone[];
  activities: RIQActivity[];
  milestoneCompletion: RIQMilestoneCompletion[];
  cumulativeCompletion: number;
  risks: RIQRisk[];
  devTasks: RIQDevTask[];
  insights: {
    marketAnalytics: RIQMarketAnalytics[];
    platformInsights: RIQPlatformInsight[];
    affordabilityRating: RIQAffordabilityRating[];
  };
}

// ============================================================
// AwardBook Types
// ============================================================

export interface ABMilestone {
  milestoneId: string;
  milestoneName: string;
  phase: string;
  startDate: string;
  endDate: string;
  status: string;
  percentComplete: number;
  rag: string;
  owner: string;
}

export interface ABActivity {
  taskId: string;
  taskName: string;
  milestoneId: string;
  workstream: string;
  owner: string;
  dueDate: string;
  status: string;
  rag: string;
  comments: string;
}

export interface ABMilestoneCompletion {
  milestoneId: string;
  milestoneName: string;
  completionPct: number;
  milestoneWeight: number;
  weightedCompletionPct: number;
  status: string;
  cumulativeCompletionPct: number;
  owner: string;
}

export interface ABRaid {
  raidId: string;
  raidType: string;
  description: string;
  impact: number;
  likelihood: number;
  rag: string;
  owner: string;
  mitigation: string;
  targetDate: string;
  status: string;
  comments: string;
}

export interface ABDecision {
  decisionId: string;
  decisionRequired: string;
  impactIfDelayed: string;
  requiredBy: string;
  owner: string;
  status: string;
  comments: string;
}

export interface ABOwner {
  name: string;
  role: string;
}

export interface ABDevTask {
  date: string;
  open: number;
  completed: number;
  closedPullRequests: number;
  notPlanned: number;
  duplicate: number;
}

export interface AwardBookData {
  milestones: ABMilestone[];
  activities: ABActivity[];
  milestoneCompletion: ABMilestoneCompletion[];
  cumulativeCompletion: number;
  raid: ABRaid[];
  decisions: ABDecision[];
  owners: ABOwner[];
  devTasks: ABDevTask[];
}
