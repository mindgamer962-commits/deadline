export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  score: number;
  completedCount: number;
  savedCount: number;
  createdAt: string;
}

export interface Deadline {
  id: string;
  userId: string;
  title: string;
  date: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  progress: number;
  estimatedEffort: number; // 1-10
  riskPercentage?: number;
  successProbability?: number;
  urgencyScore?: number;
  recoveryPotential?: number;
  isCritical?: boolean;
  createdAt: string;
}

export interface Task {
  id: string;
  deadlineId: string;
  userId: string;
  title: string;
  category: string;
  estimatedTime: string;
  difficulty: "Low" | "Medium" | "High";
  priority: "Low" | "Medium" | "High";
  status: "TODO" | "IN_PROGRESS" | "DONE";
  completionPercentage?: number;
  notes?: string;
}

export interface RescuePlan {
  id: string;
  deadlineId: string;
  userId: string;
  category: "Exam" | "Assignment" | "Interview" | "Hackathon" | "Project" | "Meeting" | "Bill Payment" | "Personal Goal";
  
  failureRisk: number;
  successProbability: number;
  recoveryPotential: number;
  
  beforeSuccessRate: number;
  afterSuccessRate: number;
  focusSessions: number;

  currentDate?: string;
  deadlineDate?: string;
  daysRemaining?: number;
  hoursRemaining?: number;
  
  categoryContent: {
    studySchedule?: Array<{ day: string; topics: string[]; duration: string }>;
    topicPrioritization?: Array<{ topic: string; weight: string; strategy: string }>;
    revisionStrategy?: string[];
    
    mockInterviewPlan?: string[];
    questionPreparation?: Array<{ question: string; focus: string }>;
    skillRoadmap?: string[];
    
    mvpRoadmap?: Array<{ feature: string; complexity: string; priority: string }>;
    featurePrioritization?: string[];
    demoPreparation?: string[];
    submissionChecklist?: string[];
    
    taskDecomposition?: Array<{ subtask: string; eta: string; complexity: string }>;
    milestones?: Array<{ milestone: string; dueDate: string }>;
    deliveryPlan?: string[];
    
    agendaCreation?: string[];
    talkingPoints?: string[];
    actionItemTracker?: string[];
    
    budgetOptimization?: string[];
    cashflowSchedule?: string[];
    autoPaySetup?: string[];
    
    actionSteps?: string[];
    milestoneTracking?: string[];
    habitIntegration?: string[];
    
    researchOutline?: string[];
    draftDrafting?: string[];
    editingRound?: string[];
    referenceChecking?: string[];
  };
  
  criticalTasks: string[];
  optionalTasks: string[];
  recommendedActions: string[];
  timeAllocation: Array<{ activity: string; hours: number; percentage: number }>;
  
  priorityActions: string[];
  recoveryRoadmap: Array<{ stage: string; action: string; duration: string }>;
  hourByHourPlan: Array<{ hour: string; task: string; intensity: string }>;
  createdAt?: string;
}

export interface ProcrastinationLog {
  id: string;
  userId: string;
  text: string;
  detectedPatterns: string;
  procrastinationScore: number;
  delayProbability: number;
  coachAdvice: string;
  createdAt: string;
}

export interface FutureSelfSimulation {
  timelineA: Array<{ step: string; description: string; consequence: string }>;
  timelineB: Array<{ step: string; description: string; consequence: string }>;
}
