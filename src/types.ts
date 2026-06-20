export interface SlackMessage {
  msg_id: string;
  thread_id: string;
  user: string;
  time: string;
  message: string;
}

export interface BlockerItem {
  description: string;
  reporter: string;
  assignee: string;
  resolved: boolean;
  resolutionTime?: string;
}

export interface ActionItem {
  task: string;
  assignee: string;
  resolved: boolean;
}

export interface ThreadAnalysis {
  threadId: string;
  threadName: string;
  summary: string;
  urgency: string; // 'Critical' | 'High' | 'Medium' | 'Low'
  status: string; // 'Blocked' | 'Attention Required' | 'Clean / Resolved' | 'Ongoing'
  keyParticipants: string[];
  blockers: BlockerItem[];
  actionItems: ActionItem[];
  messageCount: number;
}

export interface DashboardData {
  summary: string;
  projectStatus: string; // 'Stable' | 'Risk of Delay' | 'Blocked' | 'Completed'
  totalBlockers: number;
  attentionRequiredCount: number;
  cleanThreadsCount: number;
  threads: ThreadAnalysis[];
}
