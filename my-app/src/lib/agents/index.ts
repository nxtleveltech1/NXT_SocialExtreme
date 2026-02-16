/**
 * NXT Social Extreme Automation Agents
 * 
 * Phase 3: World Class Automation
 * 
 * These agents run background processes to automate platform operations:
 * - Auto-Responder: Classifies messages and generates AI responses
 * - Ad Optimizer: Monitors ad performance and pauses underperformers
 * - Content Engine: Generates content ideas and drafts for approval
 */

export * from "./auto-responder";
export * from "./ad-optimizer";
export * from "./content-engine";

// Agent runner types
export interface AgentRunResult {
  agent: string;
  success: boolean;
  itemsProcessed: number;
  errors: string[];
  duration: number;
}

export interface AgentSchedule {
  agentId: string;
  cronExpression: string;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
}

// Default schedules for agents (to be used with cron/queue system in Phase 4)
export const DEFAULT_AGENT_SCHEDULES: AgentSchedule[] = [
  {
    agentId: "auto-responder",
    cronExpression: "*/5 * * * *", // Every 5 minutes
    enabled: true,
  },
  {
    agentId: "ad-optimizer",
    cronExpression: "0 */6 * * *", // Every 6 hours
    enabled: true,
  },
  {
    agentId: "content-engine",
    cronExpression: "0 9 * * 1", // Every Monday at 9 AM
    enabled: true,
  },
];
