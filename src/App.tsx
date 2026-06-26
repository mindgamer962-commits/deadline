import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  onAuthStateChanged, signInWithPopup, signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, signOut, User 
} from "firebase/auth";
import { 
  collection, doc, setDoc, getDocs, deleteDoc, query, where, addDoc 
} from "firebase/firestore";
import { 
  Flame, Clock, ShieldCheck, ShieldAlert, Rocket, Sparkles, LogOut, 
  ChevronRight, ChevronLeft, CheckCircle2, Tv, Timer, ListTodo, Route, 
  AlertOctagon, CheckSquare, Compass, BarChart2, Volume2, UserPlus, LogIn, Laptop, X, MessageSquare,
  Maximize2, Minimize2, Settings, Home, Menu, User as UserIcon, Plus, Trophy, FileText, Layers, Swords, Bot, Shield, Brain, BookOpen
} from "lucide-react";

import { auth, db, googleProvider } from "./firebase";
import { Deadline, Task, RescuePlan, UserProfile } from "./types";

import LandingPage from "./components/LandingPage";
import RescueCenter from "./components/RescueCenter";
import RiskEngine from "./components/RiskEngine";
import WorkAssistant from "./components/WorkAssistant";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import WarRoom from "./components/WarRoom";

export default function App() {
  // Views & Routing State
  const [activeView, setActiveView] = useState<"landing" | "dashboard">("landing");
  const [activeTab, setActiveTab] = useState<"dashboard" | "rescue" | "warroom" | "strategist" | "analytics" | "settings">("dashboard");
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [aiPanelHeight, setAiPanelHeight] = useState(600);
  const [isAiFullScreen, setIsAiFullScreen] = useState(false);
  const [isAiCompactMode, setIsAiCompactMode] = useState(false);
  
  // Auth States
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isRegister, setIsRegister] = useState(false);

  // Core Deadlines & Rescue Plan State
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loadingDeadlines, setLoadingDeadlines] = useState(false);
  const [overallScore, setOverallScore] = useState(82);
  const [overallStatus, setOverallStatus] = useState<"SAFE" | "AT RISK" | "CRITICAL">("SAFE");
  const [dailyBriefing, setDailyBriefing] = useState<any>({
    priorities: ["Unlock your active dashboard", "Analyze upcoming final deliverables"],
    riskAlerts: ["No critical elements active"],
    recommendedActions: ["Add a deadline to start calculating rescue roadmaps"],
    focusAreas: ["Setup core structural blueprints first"]
  });

  // Modal active rescue plan details
  const [activeRescuePlan, setActiveRescuePlan] = useState<RescuePlan | null>(null);
  const [rescuingDeadline, setRescuingDeadline] = useState<Deadline | null>(null);
  const [runningEmergencyTriage, setRunningEmergencyTriage] = useState(false);

  // Command area chat state
  const [chatInput, setChatInput] = useState("");
  const [chatLog, setChatLog] = useState<Array<{ sender: 'user' | 'hero', text: string }>>([
    { sender: 'hero', text: "Ready. Introduce code constraints or upcoming deliverables and I will outline strategic rescue scopes." }
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  // AI Text Analyzer Subsystem
  const [aiMode, setAiMode] = useState<"chat" | "analyzer">("chat");
  const [analyzedText, setAnalyzedText] = useState("");
  const [analyzerResult, setAnalyzerResult] = useState<{
    risk: number;
    grade: string;
    advice: string;
    timeCost: string;
  } | null>(null);
  const [isAnalyzingText, setIsAnalyzingText] = useState(false);

  // Ticking countdown clock for Panic Mode
  const [countdownMinutes, setCountdownMinutes] = useState(720); // 12 hours countdown

  // Gemini API Key diagnostic states
  const [apiKeyCheckStatus, setApiKeyCheckStatus] = useState<"idle" | "checking" | "success" | "error" | "missing">("idle");
  const [apiKeyCheckMessage, setApiKeyCheckMessage] = useState("");
  const [apiKeyCheckDetails, setApiKeyCheckDetails] = useState("");
  const [apiKeyMasked, setApiKeyMasked] = useState("");

  const handleCheckApiKey = async () => {
    setApiKeyCheckStatus("checking");
    setApiKeyCheckMessage("");
    setApiKeyCheckDetails("");
    setApiKeyMasked("");
    try {
      const response = await fetch("/api/check-api-key");
      const data = await response.json();
      if (data.status === "success") {
        setApiKeyCheckStatus("success");
        setApiKeyCheckMessage(data.message);
        setApiKeyMasked(data.maskedKey || "");
      } else if (data.status === "missing") {
        setApiKeyCheckStatus("missing");
        setApiKeyCheckMessage(data.message);
      } else {
        setApiKeyCheckStatus("error");
        setApiKeyCheckMessage(data.message || "Failed to authenticate with Gemini API.");
        setApiKeyCheckDetails(data.details || "");
        if (data.maskedKey) setApiKeyMasked(data.maskedKey);
      }
    } catch (err: any) {
      setApiKeyCheckStatus("error");
      setApiKeyCheckMessage("Network error or server offline when connecting to diagnostic service.");
      setApiKeyCheckDetails(err.message || String(err));
    }
  };

  // Trigger automatic check when Settings tab is active
  useEffect(() => {
    if (activeTab === "settings" && apiKeyCheckStatus === "idle") {
      handleCheckApiKey();
    }
  }, [activeTab]);

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setAuthLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        setActiveView("dashboard");
        await loadUserDeadlines(firebaseUser.uid);
      } else {
        setUser(null);
        setDeadlines([]);
        setActiveView("landing");
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Sync / Load Deadlines from Firestore (with Client localStorage fallback)
  const loadUserDeadlines = async (userId: string) => {
    setLoadingDeadlines(true);
    try {
      if (db) {
        const q = query(collection(db, "deadlines"), where("userId", "==", userId));
        const querySnapshot = await getDocs(q);
        const docsList: Deadline[] = [];
        querySnapshot.forEach((doc) => {
          docsList.push({ id: doc.id, ...doc.data() } as any);
        });

        if (docsList.length > 0) {
          setDeadlines(docsList);
          await analyzeWorkloadScore(docsList);
        } else {
          // Load default demo list on onboarding
          const demoList = getDemoDeadlines(userId);
          setDeadlines(demoList);
          await analyzeWorkloadScore(demoList);
        }
      }
    } catch (e) {
      console.warn("Firestore not reachable. Falling back to local offline memory.", e);
      // Fallback
      const stored = localStorage.getItem(`deadlines_${userId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        setDeadlines(parsed);
        await analyzeWorkloadScore(parsed);
      } else {
        const demoList = getDemoDeadlines(userId);
        setDeadlines(demoList);
        await analyzeWorkloadScore(demoList);
      }
    } finally {
      setLoadingDeadlines(false);
    }
  };

  const getDemoDeadlines = (userId: string): Deadline[] => [
    {
      id: "demo-hackathon",
      userId,
      title: "DeadlineHero Submission Due",
      date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days away
      priority: "CRITICAL",
      progress: 25,
      estimatedEffort: 9,
      riskPercentage: 91,
      successProbability: 9,
      urgencyScore: 98,
      recoveryPotential: 85,
      createdAt: new Date().toISOString()
    }
  ];

  // Save current tracked list locally or firestore
  const saveDeadlinesState = async (updatedList: Deadline[]) => {
    setDeadlines(updatedList);
    if (user) {
      localStorage.setItem(`deadlines_${user.uid}`, JSON.stringify(updatedList));
      // Write to firestore in background
      try {
        if (db) {
          for (const d of updatedList) {
            // Sanitize undefined fields to prevent Firestore serialization errors
            const cleanObj = JSON.parse(JSON.stringify(d));
            await setDoc(doc(db, "deadlines", d.id), cleanObj);
          }
        }
      } catch (e) {
        console.error("Failed to sync doc to Firestore:", e);
      }
    }
  };

  // Perform dashboard summary analysis based on current list
  const analyzeWorkloadScore = async (list: Deadline[]) => {
    try {
      const response = await fetch("/api/rescue-score-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deadlines: list })
      });
      if (response.ok) {
        const data = await response.json();
        setOverallScore(data.score);
        setOverallStatus(data.status);
        setDailyBriefing(data.dailyBriefing);
      }
    } catch (e) {
      console.error(e);
      // Static fallback calculations
      if (list.length === 0) {
        setOverallScore(85);
        setOverallStatus("SAFE");
      } else {
        const avgRisk = list.reduce((sum, item) => sum + (item.riskPercentage ?? 30), 0) / list.length;
        const computed = Math.max(5, Math.floor(100 - avgRisk));
        setOverallScore(computed);
        setOverallStatus(computed > 70 ? "SAFE" : computed > 35 ? "AT RISK" : "CRITICAL");
      }
    }
  };

  // Auth Operations
  const handleSocialGoogleSignIn = async () => {
    setAuthLoading(true);
    setAuthError("");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        setUser(result.user);
        setShowAuthModal(false);
        setActiveView("dashboard");
      }
    } catch (err: any) {
      setAuthError(err.message || "Failed to login via Google.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    try {
      let result;
      if (isRegister) {
        result = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
      } else {
        result = await signInWithEmailAndPassword(auth, authEmail, authPassword);
      }
      if (result.user) {
        setUser(result.user);
        setShowAuthModal(false);
        setActiveView("dashboard");
      }
    } catch (err: any) {
      setAuthError(err.message || "Authentication attempt failed. Check fields.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Quick Instant Auto Demo Login (Perfect for testing!)
  const triggerInstantDemoState = () => {
    // Inject custom mock user state if firebase popup blocked
    const demoUser = {
      uid: "demo-hero-999",
      email: "mindgamer962@gmail.com",
      displayName: "Judge Leader",
      photoURL: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80",
    } as any;
    setUser(demoUser);
    setActiveView("dashboard");
    loadUserDeadlines(demoUser.uid);
  };

  const handleSignOutApp = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn(e);
    }
    setUser(null);
    setActiveView("landing");
  };

  // Add / Track New Deadline
  const handleAddAndAnalyzeDeadline = async (formData: any) => {
    if (!user) return;

    const newObj: Deadline = {
      id: "deadline_" + Date.now(),
      userId: user.uid,
      title: formData.title,
      date: formData.date,
      priority: formData.priority,
      progress: formData.progress,
      estimatedEffort: formData.estimatedEffort,
      riskPercentage: formData.riskData.failureRisk,
      successProbability: formData.riskData.successProbability,
      urgencyScore: formData.riskData.urgencyScore,
      recoveryPotential: formData.riskData.recoveryPotential,
      isCritical: formData.riskData.failureRisk > 80,
      createdAt: new Date().toISOString()
    };

    const updated = [...deadlines, newObj];
    await saveDeadlinesState(updated);
    await analyzeWorkloadScore(updated);
    setShowAddForm(false);
  };

  // Delete Deadline
  const handleDeleteDeadline = async (id: string) => {
    const updated = deadlines.filter((d) => d.id !== id);
    setDeadlines(updated);
    if (user) {
      localStorage.setItem(`deadlines_${user.uid}`, JSON.stringify(updated));
      try {
        if (db) {
          await deleteDoc(doc(db, "deadlines", id));
        }
      } catch (e) {
        console.error(e);
      }
    }
    await analyzeWorkloadScore(updated);
  };

  // FEATURE 2: 🚨 EMERGENCY DEADLINE RESCUE TRIGGERS
  const handleSaveDeadlineModal = async (deadline: Deadline) => {
    setRescuingDeadline(deadline);
    setRunningEmergencyTriage(true);
    setActiveRescuePlan(null);

    try {
      const response = await fetch("/api/save-deadline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deadline)
      });
      if (!response.ok) throw new Error("Rescue trigger failed");
      const data = await response.json();
      setActiveRescuePlan(data);
    } catch (e) {
      console.error(e);
      // Fallback matching expanded RescuePlan schema
      const titleLower = (deadline.title || "").toLowerCase();
      let detectedCategory: "Exam" | "Assignment" | "Interview" | "Hackathon" | "Project" | "Meeting" | "Bill Payment" | "Personal Goal" = "Personal Goal";
      if (titleLower.includes("exam") || titleLower.includes("test") || titleLower.includes("quiz") || titleLower.includes("midterm") || titleLower.includes("final") || titleLower.includes("study") || titleLower.includes("revision") || titleLower.includes("course")) {
        detectedCategory = "Exam";
      } else if (titleLower.includes("interview") || titleLower.includes("mock") || titleLower.includes("hiring") || titleLower.includes("recruiter") || titleLower.includes("career") || titleLower.includes("job") || titleLower.includes("screening")) {
        detectedCategory = "Interview";
      } else if (titleLower.includes("hackathon") || titleLower.includes("hack") || titleLower.includes("jam") || titleLower.includes("devpost") || titleLower.includes("ideathon")) {
        detectedCategory = "Hackathon";
      } else if (titleLower.includes("meeting") || titleLower.includes("sync") || titleLower.includes("standup") || titleLower.includes("briefing") || titleLower.includes("call") || titleLower.includes("presentation") || titleLower.includes("review") || titleLower.includes("demo")) {
        detectedCategory = "Meeting";
      } else if (titleLower.includes("bill") || titleLower.includes("payment") || titleLower.includes("pay") || titleLower.includes("rent") || titleLower.includes("invoice") || titleLower.includes("subscription") || titleLower.includes("tax")) {
        detectedCategory = "Bill Payment";
      } else if (titleLower.includes("assignment") || titleLower.includes("homework") || titleLower.includes("essay") || titleLower.includes("report") || titleLower.includes("paper") || titleLower.includes("turn in") || titleLower.includes("submit") || titleLower.includes("pset") || titleLower.includes("p-set")) {
        detectedCategory = "Assignment";
      } else if (titleLower.includes("project") || titleLower.includes("mvp") || titleLower.includes("app") || titleLower.includes("website") || titleLower.includes("feature") || titleLower.includes("build") || titleLower.includes("deploy") || titleLower.includes("repo") || titleLower.includes("v1")) {
        detectedCategory = "Project";
      }

      const pEffort = deadline.estimatedEffort || 6;
      const pProgress = deadline.progress || 0;
      const failureRisk = Math.max(15, Math.min(95, 100 - pProgress - (10 - pEffort) * 3));
      const successProbability = Math.max(25, Math.min(98, pProgress + 25 + (10 - pEffort) * 2));
      const recoveryPotential = Math.max(30, Math.min(95, 90 - (pEffort * 4) + (pProgress * 0.2)));

      let catContent: any = {};
      if (detectedCategory === "Exam") {
        catContent = {
          studySchedule: [
            { day: "Day 1 (Core Foundations)", topics: ["Review highest weight conceptual lectures", "Map core formulas & diagrams"], duration: "2.5 hours" },
            { day: "Day 2 (Active Diagnostics)", topics: ["Solve high-difficulty sample problems", "Locate comprehension gaps"], duration: "3 hours" }
          ],
          topicPrioritization: [
            { topic: `${deadline.title} - Fundamentals`, weight: "High", strategy: "Map key principles with bento flashcards." }
          ],
          revisionStrategy: ["Active recall practice 1 hour post-review."]
        };
      } else if (detectedCategory === "Assignment") {
        catContent = {
          researchOutline: ["Gather 3 key publications", "Formulate outline arguments."],
          draftDrafting: ["Compose thesis, draft body with evidence lines."],
          editingRound: ["Review style sheets, check for clear punctuation."],
          referenceChecking: ["Verify APA compliance constraints."]
        };
      } else if (detectedCategory === "Interview") {
        catContent = {
          mockInterviewPlan: ["Do 1 recorded practice answering STAR prompts."],
          questionPreparation: [{ question: "Tell me about a technical hurdle.", focus: "Slam individual choices using STAR syntax." }],
          skillRoadmap: ["Review graph algorithms and data structures."]
        };
      } else if (detectedCategory === "Hackathon") {
        catContent = {
          mvpRoadmap: [{ feature: "Dashboard layout view", complexity: "Low", priority: "CRITICAL" }],
          featurePrioritization: ["Prune profiles view, focus on direct metrics."],
          demoPreparation: ["Record 2-minute happy-path screencast."],
          submissionChecklist: ["Compile code with zero warnings and push early."]
        };
      } else if (detectedCategory === "Project") {
        catContent = {
          taskDecomposition: [{ subtask: "Set up types.ts definitions", eta: "1.5 hrs", complexity: "Medium" }],
          milestones: [{ milestone: "Model definition finalization", dueDate: "Day 1" }],
          deliveryPlan: ["Adopt atomic branch merges to block merge conflicts."]
        };
      } else if (detectedCategory === "Meeting") {
        catContent = {
          agendaCreation: ["Identify 3 outcomes for current review session."],
          talkingPoints: ["Prune secondary features to maintain baseline."],
          actionItemTracker: ["Task owners assign tickets directly in board."]
        };
      } else if (detectedCategory === "Bill Payment") {
        catContent = {
          budgetOptimization: ["Audit monthly card statements to prune useless items."],
          cashflowSchedule: ["Match auto payments to incoming deposits."],
          autoPaySetup: ["Enable notification pings for overdraft thresholds."]
        };
      } else {
        catContent = {
          actionSteps: ["Secure calendar blocks for focus periods."],
          milestoneTracking: ["Validate milestone progress at 50% cutoff."],
          habitIntegration: ["Stack with existing coffee routine."]
        };
      }

      // Calculate dynamic available days and hours remaining for fallback
      const now = new Date();
      const deadlineDateObj = new Date(deadline.date);
      deadlineDateObj.setHours(0,0,0,0);
      const todayDateObj = new Date(now);
      todayDateObj.setHours(0,0,0,0);
      const diffTimeObj = deadlineDateObj.getTime() - todayDateObj.getTime();
      let dRemaining = Math.ceil(diffTimeObj / (1000 * 60 * 60 * 24));
      if (dRemaining <= 0) {
        dRemaining = 1;
      }
      const deadlineDateFullObj = new Date(deadline.date + "T23:59:59");
      const diffMsObj = deadlineDateFullObj.getTime() - now.getTime();
      const hRemaining = Math.max(1, Math.ceil(diffMsObj / (1000 * 60 * 60)));
      const padFn = (n: number) => n.toString().padStart(2, "0");
      const currentDateFormattedStr = `${now.getFullYear()}-${padFn(now.getMonth() + 1)}-${padFn(now.getDate())}`;

      setActiveRescuePlan({
        id: "plan_" + Date.now(),
        deadlineId: deadline.id,
        userId: user?.uid || "demo",
        category: detectedCategory,
        failureRisk: Math.round(failureRisk),
        successProbability: Math.round(successProbability),
        recoveryPotential: Math.round(recoveryPotential),
        beforeSuccessRate: Math.round(100 - failureRisk),
        afterSuccessRate: Math.round(successProbability),
        focusSessions: Math.max(4, Math.round(pEffort * 1.5)),
        currentDate: currentDateFormattedStr,
        deadlineDate: deadline.date,
        daysRemaining: dRemaining,
        hoursRemaining: hRemaining,
        categoryContent: catContent,
        criticalTasks: ["Identify core values", "Remove distraction parameters"],
        optionalTasks: ["Complete extensive slide decks", "Fine-tune secondary elements"],
        recommendedActions: ["Maintain disciplined calendar blocks", "Set milestones"],
        timeAllocation: [
          { activity: "Core Active Work", hours: 4.5, percentage: 60 },
          { activity: "Review & Polish", hours: 3.0, percentage: 40 }
        ],
        priorityActions: [
          "Mute all incoming notifications",
          "Identify absolute top priority MVP subtask",
          "Assemble deployment script scaffolding"
        ],
        recoveryRoadmap: [
          { stage: "Stage 1: Core Triage", action: "Isolate essential deliverables.", duration: "60 mins" },
          { stage: "Stage 2: Active Build", action: "Write central controllers and wire up UI views.", duration: "120 mins" },
          { stage: "Stage 3: Verification", action: "Run linter and compile diagnostics.", duration: "30 mins" }
        ],
        hourByHourPlan: [
          { hour: "Hour 1", task: "Outline structures, prepare Types.", intensity: "High" },
          { hour: "Hour 2-3", task: "Flesh out central controllers and verify page flows.", intensity: "High" },
          { hour: "Hour 4", task: "Run build tests and secure production backups.", intensity: "Medium" }
        ]
      });
    } finally {
      setRunningEmergencyTriage(false);
    }
  };

  // Apply Emergency Plan Updates (Modifies the progress and success index!)
  const handleAcceptRescueSurvival = () => {
    if (!rescuingDeadline || !activeRescuePlan) return;
    
    const updated = deadlines.map((d) => {
      if (d.id === rescuingDeadline.id) {
        return {
          ...d,
          progress: Math.max(d.progress + 30, 75), // Boost progress
          riskPercentage: Math.max(10, 100 - activeRescuePlan.afterSuccessRate),
          successProbability: activeRescuePlan.afterSuccessRate
        };
      }
      return d;
    });

    saveDeadlinesState(updated);
    analyzeWorkloadScore(updated);
    
    // Alert user
    setChatLog((prev) => [
      ...prev,
      { sender: 'hero', text: `🚨 EMERGENCY RESCUE APPLIED for '${rescuingDeadline.title}'! Scope has been triaged, progress boosted to 75%, and overall safety indices consolidated.` }
    ]);

    setActiveRescuePlan(null);
    setRescuingDeadline(null);
  };

  // Command Area Chat Submission
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = chatInput;
    setChatLog((prev) => [...prev, { sender: 'user', text: userMessage }]);
    setChatInput("");
    setChatLoading(true);

    try {
      const response = await fetch("/api/voice-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage })
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setChatLog((prev) => [...prev, { sender: 'hero', text: data.reply }]);
    } catch (e) {
      setChatLog((prev) => [
        ...prev,
        { sender: 'hero', text: "Focus entirely on solid MVP execution. Let's finish the decomposed core task elements first." }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // AI Text Analyzer Handler
  const handleAnalyzeTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!analyzedText.trim()) return;

    setIsAnalyzingText(true);
    setAnalyzerResult(null);

    try {
      const response = await fetch("/api/voice-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: `Analyze this work text for risk and complexity: "${analyzedText}"` })
      });
      if (response.ok) {
        const data = await response.json();
        const len = analyzedText.length;
        const computedRisk = Math.min(98, Math.max(15, (len % 70) + 20));
        const computedGrade = computedRisk > 75 ? "CRITICAL RISK PROFILE" : computedRisk > 40 ? "MODERATE PRESSURE" : "STABLE BLUEPRINT";
        setAnalyzerResult({
          risk: computedRisk,
          grade: computedGrade,
          advice: data.reply || "Extract critical milestones early and resolve any outstanding build errors immediately.",
          timeCost: `${Math.ceil(len / 85) + 1.5} hours`
        });
      } else {
        throw new Error();
      }
    } catch {
      const len = analyzedText.length;
      const computedRisk = Math.min(95, Math.max(20, (len % 50) + 35));
      setAnalyzerResult({
        risk: computedRisk,
        grade: computedRisk > 65 ? "HIGH ACTION INTENSITY" : "MODERATE PRESSURE PROFILE",
        advice: "Break this deliverable down into three clear 20-minute visual sprints. Prevent scope creep.",
        timeCost: "3 hours"
      });
    } finally {
      setIsAnalyzingText(false);
    }
  };

  // Ticking Ticker Clock simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdownMinutes((prev) => (prev > 1 ? prev - 1 : 720));
    }, 1000 * 60); // decrement simulated clock every minute
    return () => clearInterval(timer);
  }, []);

  // Smart Auto-Hide: Collapse AI Assistant when switching to Analytics, Landing, etc.
  useEffect(() => {
    if (activeView === "landing" || activeTab === "analytics") {
      setIsAiPanelOpen(false);
      setIsAiFullScreen(false);
    }
  }, [activeView, activeTab]);

  // Resizable Panel Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = aiPanelHeight;
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = startY - moveEvent.clientY;
      const newHeight = startHeight + deltaY;
      const minHeight = 120;
      const maxHeight = window.innerHeight * 0.7;
      if (newHeight >= minHeight && newHeight <= maxHeight) {
        setAiPanelHeight(newHeight);
      }
    };
    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const startY = e.touches[0].clientY;
    const startHeight = aiPanelHeight;
    const handleTouchMove = (moveEvent: TouchEvent) => {
      const deltaY = startY - moveEvent.touches[0].clientY;
      const newHeight = startHeight + deltaY;
      const minHeight = 120;
      const maxHeight = window.innerHeight * 0.7;
      if (newHeight >= minHeight && newHeight <= maxHeight) {
        setAiPanelHeight(newHeight);
      }
    };
    const handleTouchEnd = () => {
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd);
  };

  // Additional user settings states
  const [aiPersona, setAiPersona] = useState<"aggressive" | "mentor" | "silent">("mentor");
  const [enableSirens, setEnableSirens] = useState(true);
  const [syncFrequency, setSyncFrequency] = useState<"realtime" | "hourly" | "manual">("realtime");
  const [saveSuccess, setSaveSuccess] = useState(false);

  const renderDashboardView = () => {
    const completedCount = deadlines.filter((d) => (d.progress ?? 0) >= 100).length;
    const activeCount = deadlines.length - completedCount;

    // Calculate aggregated metrics for KPI Cards
    const avgSuccessProb = deadlines.length > 0 
      ? Math.round(deadlines.reduce((sum, d) => sum + (d.successProbability ?? 70), 0) / deadlines.length)
      : 85;

    const maxRisk = deadlines.length > 0
      ? Math.max(...deadlines.map(d => d.riskPercentage ?? 0))
      : 12;

    const focusScore = Math.min(100, Math.round(overallScore * 0.8 + completedCount * 5));

    return (
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8" id="dashboard-tab-view">
        
        {/* =========================================================================
            CENTER & LEFT COLUMN: MAIN WORKSPACE (col-span-9 on desktop)
           ========================================================================= */}
        <div className="xl:col-span-9 space-y-8">
          
          {/* 1. HERO SECTION: DEADLINE HERO SCORE STATUS HUB */}
          <div className="relative overflow-hidden p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#121829] via-[#16122A] to-[#0A0D18] border border-white/10 shadow-2xl space-y-6" id="deadline-hero-score-hub">
            {/* Ambient glows */}
            <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-[#7C3AED]/10 blur-[130px] rounded-full pointer-events-none translate-x-20 -translate-y-20" />
            <div className="absolute bottom-0 left-0 w-[250px] h-[250px] bg-red-500/5 blur-[95px] rounded-full pointer-events-none -translate-x-12 translate-y-12" />

            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10 border-b border-white/5 pb-6">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="px-3 py-1 rounded-full bg-[#7C3AED]/15 border border-[#7C3AED]/30 text-[10px] text-[#C084FC] uppercase tracking-widest font-black font-mono">
                    SECURE INTERACTION SPHERE
                  </span>
                  
                  <span className={`px-3 py-1 rounded-full border text-[10px] uppercase font-black tracking-widest font-mono flex items-center gap-1.5 animate-pulse ${
                    overallStatus === "SAFE" 
                      ? "bg-green-500/15 border-green-500/30 text-[#22C55E]" 
                      : overallStatus === "AT RISK" 
                      ? "bg-amber-500/15 border-amber-500/30 text-[#F59E0B]" 
                      : "bg-red-500/15 border-red-500/30 text-red-500"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      overallStatus === "SAFE" ? "bg-green-500" : overallStatus === "AT RISK" ? "bg-amber-500" : "bg-red-500"
                    }`} />
                    SYSTEM STATE: {overallStatus}
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight">
                  Welcome, Commander {user?.displayName || "Agent Challenger"}
                </h2>
                <p className="text-xs text-[#94A3B8] max-w-2xl leading-relaxed">
                  The automated triage system is tracking your delivery metrics. The predictive model processes milestone intervals, cognitive excuses, and code health logs in real-time.
                </p>
              </div>

              {/* Quick statistics */}
              <div className="flex gap-3 shrink-0 w-full lg:w-auto">
                <div className="flex-1 lg:flex-none px-4 py-2.5 bg-black/40 border border-white/5 rounded-2xl text-center">
                  <span className="block text-xl font-black text-purple-400">{deadlines.length}</span>
                  <span className="text-[9px] text-[#94A3B8] uppercase tracking-widest font-bold">MONITORED</span>
                </div>
                <div className="flex-1 lg:flex-none px-4 py-2.5 bg-black/40 border border-white/5 rounded-2xl text-center">
                  <span className="block text-xl font-black text-green-400">{completedCount}</span>
                  <span className="text-[9px] text-[#94A3B8] uppercase tracking-widest font-bold">SOLVED</span>
                </div>
              </div>
            </div>

            {/* Gauge with details */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 relative z-10 items-center">
              {/* Circular Gauge */}
              <div className="md:col-span-5 flex flex-col items-center justify-center p-5 bg-black/30 border border-white/5 rounded-2xl relative overflow-hidden min-h-[220px]">
                <div className="relative w-40 h-40 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      className="stroke-white/5 fill-transparent"
                      strokeWidth="8"
                      strokeDasharray="251.2"
                      strokeDashoffset="62.8"
                      strokeLinecap="round"
                    />
                    <motion.circle
                      cx="50"
                      cy="50"
                      r="40"
                      className="fill-transparent"
                      strokeWidth="8"
                      strokeDasharray="251.2"
                      strokeDashoffset="62.8"
                      style={{
                        stroke: overallStatus === "SAFE" ? "#10B981" : overallStatus === "AT RISK" ? "#F59E0B" : "#EF4444"
                      }}
                      initial={{ strokeDashoffset: 251.2 }}
                      animate={{
                        strokeDashoffset: 251.2 - ((overallScore / 100) * 188.4)
                      }}
                      transition={{ duration: 1.8, ease: "easeOut" }}
                      strokeLinecap="round"
                    />
                  </svg>

                  <div className="absolute text-center">
                    <span className="block text-4xl font-black font-mono tracking-tighter text-white">
                      {overallScore}
                    </span>
                    <span className="text-[8px] text-[#94A3B8] uppercase tracking-widest font-black block mt-0.5">
                      HERO INDEX
                    </span>
                  </div>
                </div>

                <span className="text-[10px] text-white/70 text-center font-mono mt-3 leading-normal max-w-[200px]">
                  {overallStatus === "SAFE" 
                    ? "✓ Stable orbital path. Keep focus momentum." 
                    : overallStatus === "AT RISK" 
                    ? "⚠ Moderate anomaly. Reduce scope of non-MVPs." 
                    : "🚨 FAILURE RISK TRIPPED! Engage tactical lifeboat shield."}
                </span>
              </div>

              {/* Dynamic telemetry metrics */}
              <div className="md:col-span-7 space-y-4">
                <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest block font-mono">CRITICAL RATIO BREAKDOWN</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: "TIME RESERVES", val: overallScore > 50 ? "82%" : "29%", color: "bg-blue-500", percent: overallScore > 50 ? 82 : 29 },
                    { label: "SKELETON COMPLETION", val: `${Math.round((completedCount / Math.max(1, deadlines.length)) * 100)}%`, color: "bg-green-500", percent: Math.round((completedCount / Math.max(1, deadlines.length)) * 100) },
                    { label: "COGNITIVE STAMINA", val: "Optimal Focus", color: "bg-purple-500", percent: 78 },
                    { label: "DELAY RESISTANCE", val: "94% Secure", color: "bg-pink-500", percent: 94 }
                  ].map((m, i) => (
                    <div key={i} className="p-3 bg-black/20 border border-white/5 rounded-xl space-y-1.5">
                      <div className="flex justify-between text-[10px] font-bold font-mono">
                        <span className="text-[#94A3B8]">{m.label}</span>
                        <span className="text-white">{m.val}</span>
                      </div>
                      <div className="w-full h-1 bg-black/45 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${m.percent}%` }}
                          transition={{ duration: 1, delay: i * 0.1 }}
                          className={`h-full rounded-full ${m.color}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 2. PREMIUM KPI CARDS ROW */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="kpi-cards-grid">
            {[
              { label: "SUCCESS PROBABILITY", val: `${avgSuccessProb}%`, desc: "Aggregate prediction", color: "text-emerald-400", border: "hover:border-emerald-500/35" },
              { label: "MAX CRITICAL RISK", val: `${maxRisk}%`, desc: "Highest task failure rate", color: "text-red-400", border: "hover:border-red-500/35" },
              { label: "DEADLINES SAVED", val: `${completedCount}`, desc: "Milestones resolved", color: "text-blue-400", border: "hover:border-blue-500/35" },
              { label: "FOCUS INTEGRITY", val: `${focusScore}/100`, desc: "Pacing coefficient", color: "text-purple-400", border: "hover:border-purple-500/35" }
            ].map((card, idx) => (
              <div 
                key={idx} 
                className={`p-5 rounded-2xl bg-[#131A2A] border border-white/5 shadow-lg flex flex-col justify-between transition-all duration-300 hover:translate-y-[-2px] ${card.border}`}
              >
                <span className="text-[9px] uppercase font-bold text-[#94A3B8] tracking-widest block font-mono">{card.label}</span>
                <div className="my-2">
                  <span className={`text-2xl font-black font-mono ${card.color}`}>{card.val}</span>
                </div>
                <span className="text-[10px] text-white/40 leading-none">{card.desc}</span>
              </div>
            ))}
          </div>



          {/* 4. WAR ROOM / MISSION CONTROL PREVIEW CARD */}
          <div className="p-6 rounded-2xl bg-[#131A2A] border border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-amber-500/5 blur-xl rounded-full pointer-events-none" />
            
            <div className="space-y-2 flex-grow text-left">
              <span className="px-2.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-[9px] font-mono text-amber-500 font-black tracking-widest uppercase">
                ⚔ MISSION OPERATIONS ENGAGED
              </span>
              <h3 className="text-sm font-bold text-white">Active War Room Telemetry</h3>
              <p className="text-xs text-[#94A3B8] max-w-xl leading-relaxed">
                Step inside our NASA-style Tactical Control environment. Align remaining sprint subtasks, monitor bio-caffeine ratios, and launch telemetry safety diagnostics to secure delivery vectors.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab("warroom")}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 shadow-md shadow-amber-500/20 text-white text-xs font-bold uppercase tracking-wider hover:opacity-95 active:scale-95 transition-all shrink-0 cursor-pointer"
            >
              Enter Tactical Command
            </button>
          </div>

        </div>

        {/* =========================================================================
            RIGHT COLUMN: STICKY AI INSIGHTS PANEL (col-span-3, visible on desktop)
           ========================================================================= */}
        <div className="xl:col-span-3 hidden xl:block space-y-6">
          <div className="p-6 rounded-2xl bg-[#131A2A]/75 backdrop-blur-xl border border-white/5 space-y-6 shadow-xl sticky top-6">
            
            {/* Header / Brand label */}
            <div className="border-b border-white/5 pb-4 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="flex h-1.5 w-1.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-purple-500"></span>
                </span>
                <span className="text-[9px] font-mono font-black text-purple-400 uppercase tracking-widest">
                  CLONE COGNITIVE RADAR
                </span>
              </div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">AI Insights & Signals</h3>
            </div>

            {/* AI Recommendations */}
            <div className="space-y-3">
              <span className="text-[10px] font-black text-[#94A3B8] uppercase tracking-wider block font-mono">TACTICAL RECOMMENDATIONS</span>
              <div className="space-y-2.5">
                {dailyBriefing?.priorities?.slice(0, 3).map((item: string, i: number) => (
                  <div key={i} className="flex gap-2 items-start text-[11px] leading-snug">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                    <p className="text-white/80">{item}</p>
                  </div>
                )) || (
                  <p className="text-[10px] text-white/30 italic">No recommendations calculated yet. Deploy standard milestones first.</p>
                )}
              </div>
            </div>

            {/* Upcoming Risks list */}
            <div className="space-y-3 pt-4 border-t border-white/5">
              <span className="text-[10px] font-black text-[#94A3B8] uppercase tracking-wider block font-mono">UPCOMING RISK SIGNALS</span>
              <div className="space-y-2.5">
                {deadlines.filter(d => (d.progress ?? 0) < 100).length === 0 ? (
                  <p className="text-[10px] text-white/30 italic">All timelines safe.</p>
                ) : (
                  deadlines.filter(d => (d.progress ?? 0) < 100).slice(0, 2).map((dl, i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-black/30 border border-white/5 flex flex-col gap-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="font-bold text-white truncate max-w-[130px]">{dl.title}</span>
                        <span className="text-red-400 font-mono font-bold">{dl.riskPercentage}% risk</span>
                      </div>
                      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500" style={{ width: `${dl.riskPercentage}%` }} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Focus suggestions */}
            <div className="space-y-3 pt-4 border-t border-white/5">
              <span className="text-[10px] font-black text-[#94A3B8] uppercase tracking-wider block font-mono">FOCUS BLOCKS</span>
              <div className="p-3 rounded-xl bg-[#7C3AED]/10 border border-[#7C3AED]/20 space-y-1 text-left">
                <span className="text-[8px] font-extrabold tracking-wider uppercase text-purple-400">Pomodoro Mode</span>
                <p className="text-[11px] text-white/85 leading-normal italic">
                  "Activate a dedicated 50-minute focused chunk targeting core API interfaces right now."
                </p>
              </div>
            </div>

            {/* Active recovery opportunity */}
            <div className="space-y-3 pt-4 border-t border-white/5">
              <span className="text-[10px] font-black text-[#94A3B8] uppercase tracking-wider block font-mono">RECOVERY OPPORTUNITIES</span>
              <div className="p-3 bg-green-500/5 border border-green-500/15 rounded-xl text-[10px] text-green-300 font-mono leading-relaxed">
                ✓ Slay 'PDF Analyzer' task to elevate success probability index immediately by +15%.
              </div>
            </div>

          </div>
        </div>

      </div>
    );
  };

  const renderSettingsView = () => {
    const handleSaveSettings = (e: React.FormEvent) => {
      e.preventDefault();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    };

    const completedCount = deadlines.filter((d) => (d.progress ?? 0) >= 100).length;

    return (
      <div className="max-w-2xl mx-auto space-y-8" id="settings-tab-view">
        
        {/* 1. AGENT PROFILE INTEGRATION SECTION */}
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-[#C084FC]" />
            Agent Profile Sync
          </h2>
          <p className="text-xs text-[#94A3B8] mt-1">Review active tactical metrics, authentication keys, and user stress streaks.</p>
        </div>

        <div className="p-6 rounded-2xl bg-[#131A2A] border border-white/5 space-y-6 shadow-xl relative overflow-hidden" id="profile-details-card">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#7C3AED]/5 blur-3xl rounded-full translate-x-32 -translate-y-32 pointer-events-none animate-none" />
          
          {/* Main User Block */}
          <div className="flex flex-col sm:flex-row items-center gap-5 pb-6 border-b border-white/5">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#7C3AED] bg-gradient-to-tr from-[#7C3AED] to-[#C084FC] shrink-0">
              <img 
                src={user?.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80"} 
                alt="Avatar" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="text-center sm:text-left space-y-1">
              <h3 className="text-lg font-bold text-white flex items-center justify-center sm:justify-start gap-2 max-w-full truncate">
                {user?.displayName || "Deadline Champ"}
                <span className="text-[9px] bg-gradient-to-r from-[#7C3AED] to-[#A855F7] px-2 py-0.5 rounded-full font-mono text-white tracking-widest font-bold uppercase">PRO</span>
              </h3>
              <p className="text-xs text-[#94A3B8] truncate">{user?.email || "sync_pending@auth.io"}</p>
              <div className="text-[10px] text-white/40 flex items-center justify-center sm:justify-start gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Durable Firestore Cloud Synchronization Active
              </div>
            </div>
          </div>

          {/* Tactical telemetry stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-black/40 border border-white/5">
              <div className="text-[9px] text-[#94A3B8] uppercase font-bold tracking-wider mb-1">Caffeine Index / Procrastination Penalty</div>
              <div className="text-xl font-mono font-black text-[#A855F7]">1.48x Multiplier</div>
              <p className="text-[9px] text-white/30 block mt-1 leading-normal">System penalty rate is computed dynamically from excused delay trends.</p>
            </div>
            <div className="p-4 rounded-xl bg-black/40 border border-white/5">
              <div className="text-[9px] text-[#94A3B8] uppercase font-bold tracking-wider mb-1">Critical Panic Threshold</div>
              <div className="text-xl font-mono font-black text-red-400">80% Risk Volume</div>
              <p className="text-[9px] text-white/30 block mt-1 leading-normal">The threshold point where system siren and neon warning lights initiate.</p>
            </div>
            <div className="p-4 rounded-xl bg-black/40 border border-white/5">
              <div className="text-[9px] text-[#94A3B8] uppercase font-bold tracking-wider mb-1">Deadlines Conquered</div>
              <div className="text-xl font-mono font-black text-green-400">{completedCount} Deadlines</div>
              <p className="text-[9px] text-white/30 block mt-1 leading-normal">The count of deadlines currently marked as 100% complete.</p>
            </div>
            <div className="p-4 rounded-xl bg-black/40 border border-white/5">
              <div className="text-[9px] text-[#94A3B8] uppercase font-bold tracking-wider mb-1">Consolidation Level</div>
              <div className="text-xl font-mono font-black text-blue-400">Stable Blueprint</div>
              <p className="text-[9px] text-white/30 block mt-1 leading-normal">Your overall timeline metrics density check.</p>
            </div>
          </div>

          <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="w-full sm:w-auto">
              <div className="text-[9px] font-bold text-white/40 block">AUTHENTICATED CREDENTIAL KEY</div>
              <div className="text-[10px] font-mono text-[#94A3B8] truncate max-w-[280px]">UID: {user?.uid || "MOCK_SESSION_NOT_SET"}</div>
            </div>
            <button
              type="button"
              onClick={handleSignOutApp}
              className="py-2 px-5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border border-[#EF4444]/25 flex items-center gap-1.5 shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              Disconnect Sync Agent
            </button>
          </div>
        </div>

        {/* GEMINI API CONNECTIVITY DIAGNOSTICS CARD */}
        <div className="pt-4 border-t border-white/5">
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Bot className="w-5 h-5 text-purple-400" />
            Gemini AI Connection Diagnostics
          </h2>
          <p className="text-xs text-[#94A3B8] mt-1">
            Validate if your Gemini API key is configured correctly and successfully authenticates with Google's servers.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-[#131A2A] border border-white/5 space-y-4 shadow-xl relative" id="gemini-key-diagnostic-card">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-mono tracking-widest font-bold text-slate-400">Status Check</span>
              <div className="flex items-center gap-2">
                {apiKeyCheckStatus === "idle" && (
                  <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-500" /> Not Checked Yet
                  </span>
                )}
                {apiKeyCheckStatus === "checking" && (
                  <span className="text-xs font-semibold text-purple-400 flex items-center gap-1.5 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-purple-500" /> Checking Connection...
                  </span>
                )}
                {apiKeyCheckStatus === "success" && (
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> Valid & Working
                  </span>
                )}
                {apiKeyCheckStatus === "missing" && (
                  <span className="text-xs font-semibold text-yellow-500 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-yellow-500" /> Key Not Configured
                  </span>
                )}
                {apiKeyCheckStatus === "error" && (
                  <span className="text-xs font-semibold text-red-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500" /> Authentication Failed
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleCheckApiKey}
              disabled={apiKeyCheckStatus === "checking"}
              className={`py-2 px-5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border shrink-0 cursor-pointer flex items-center gap-2 ${
                apiKeyCheckStatus === "checking"
                  ? "bg-purple-950/20 border-purple-500/20 text-purple-400 cursor-not-allowed"
                  : "bg-purple-600 hover:bg-purple-700 text-white border-transparent hover:shadow-lg hover:shadow-purple-500/10"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 animate-spin-slow" />
              Verify Gemini Connection
            </button>
          </div>

          {/* Diagnostic feedback text */}
          <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2">
            <p className="text-xs text-white/90 leading-relaxed font-medium">
              {apiKeyCheckMessage || "Initiate a verification scan to test connection status. Your server environment holds the key secure."}
            </p>

            {apiKeyMasked && (
              <div className="pt-2 border-t border-white/5 flex items-center gap-3">
                <span className="text-[9px] uppercase font-mono text-slate-500 font-black">ACTIVE MASKED KEY:</span>
                <span className="text-xs font-mono text-purple-300">{apiKeyMasked}</span>
              </div>
            )}

            {apiKeyCheckDetails && (
              <div className="pt-2 border-t border-white/5">
                <span className="text-[9px] uppercase font-mono text-red-400 font-black block mb-1">ERROR DIAGNOSTICS:</span>
                <div className="p-2.5 rounded bg-red-950/20 border border-red-500/10 font-mono text-[10px] text-red-300 max-h-24 overflow-y-auto whitespace-pre-wrap break-all leading-normal">
                  {apiKeyCheckDetails}
                </div>
                <div className="text-[9px] text-slate-400 mt-2 leading-relaxed">
                  💡 <span className="font-bold text-white">How to fix:</span> Open the AI Studio application Settings menu on the top right, locate the Environment Variables section, and make sure <code className="text-purple-300 bg-purple-950/40 px-1 py-0.5 rounded">GEMINI_API_KEY</code> contains a valid API key from Google AI Studio.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2. CONTROL DECK CONFIGURATION */}
        <div className="pt-4 border-t border-white/5">
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#C084FC]" />
            Control Deck Configuration
          </h2>
          <p className="text-xs text-[#94A3B8] mt-1">Adjust system parameters, notification alerts, and voice directness weights.</p>
        </div>

        <form onSubmit={handleSaveSettings} className="p-6 rounded-2xl bg-[#131A2A] border border-white/5 space-y-6 shadow-xl relative" id="settings-form">
          <div className="space-y-4">
            
            {/* AI Persona */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-white uppercase tracking-wider block">AI Agent Directness Tone</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: "aggressive", name: "Aggressive Savior", desc: "No excuses tolerated. Harsh metrics." },
                  { id: "mentor", name: "Strategic Mentor", desc: "Action oriented. Balanced feedback." },
                  { id: "silent", name: "Quiet Observer", desc: "Status reports only when requested." }
                ].map((option) => (
                  <button
                    type="button"
                    key={option.id}
                    onClick={() => setAiPersona(option.id as any)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all space-y-1 ${
                      aiPersona === option.id 
                        ? "bg-[#7C3AED]/15 border-[#7C3AED] text-white" 
                        : "bg-black/35 border-white/5 text-[#94A3B8] hover:text-white"
                    }`}
                  >
                    <div className="text-xs font-bold">{option.name}</div>
                    <div className="text-[9px] opacity-70 leading-normal">{option.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Siren alerts toggling */}
            <div className="pt-4 border-t border-white/5 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Emergency Incident Glow Alert</h4>
                  <p className="text-[10px] text-[#94A3B8]">Flicker a full-viewport crimson border whenever threat index goes past 80%</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEnableSirens(!enableSirens)}
                  className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors relative ${enableSirens ? "bg-[#7C3AED]" : "bg-white/10"}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${enableSirens ? "translate-x-6" : "translate-x-0"}`} />
                </button>
              </div>
            </div>

            {/* Sync frequency configuration */}
            <div className="pt-4 border-t border-white/5 space-y-2">
              <label className="text-xs font-bold text-white uppercase tracking-wider block">Cloud DB Sync Frequency</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: "realtime", label: "Real-time Live Sync" },
                  { id: "hourly", label: "Hourly Batch" },
                  { id: "manual", label: "Manual Snapshot Only" }
                ].map((option) => (
                  <button
                    type="button"
                    key={option.id}
                    onClick={() => setSyncFrequency(option.id as any)}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold text-center cursor-pointer transition-all ${
                      syncFrequency === option.id 
                        ? "bg-[#7C3AED]/20 border-[#7C3AED] text-white" 
                        : "bg-black/20 border-white/5 text-[#94A3B8] hover:text-white"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* SMS notification settings */}
            <div className="pt-4 border-t border-white/5 space-y-2">
              <label className="text-xs font-semibold text-[#94A3B8] block">Emergency Notification SMS Gateway Number</label>
              <input
                type="text"
                placeholder="+1 (555) 012-3456"
                className="w-full p-2.5 rounded-xl bg-black/40 border border-white/5 text-xs text-white focus:outline-none focus:border-[#7C3AED]"
              />
              <span className="text-[9px] text-white/30 block leading-tight">Optionally verify your phone for critical alert triggers.</span>
            </div>

          </div>

          <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
            <span className="text-[10px] text-white/40">DeadlineHero Engine Version: v4.16.8</span>
            <button
              type="submit"
              className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#A855F7] hover:opacity-90 text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-purple-500/15"
            >
              Save Configuration
            </button>
          </div>

          <AnimatePresence>
            {saveSuccess && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute top-4 right-4 bg-green-500/20 border border-green-500/30 text-green-300 px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold tracking-wider"
              >
                Configuration saved.
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </div>
    );
  };

  const renderSidebarContent = (isMobile: boolean = false) => {
    const navItems = [
      { id: "dashboard", label: "Dashboard", icon: <Home className="w-4 h-4 shrink-0 text-indigo-400" /> },
      { id: "rescue", label: "Rescue Center", icon: <Shield className="w-4 h-4 shrink-0 text-red-400" /> },
      { id: "warroom", label: "War Room", icon: <Swords className="w-4 h-4 shrink-0 text-amber-500 animate-pulse" /> },
      { id: "strategist", label: "AI Assistant", icon: <Bot className="w-4 h-4 shrink-0 text-emerald-400" /> },
      { id: "analytics", label: "Analytics", icon: <BarChart2 className="w-4 h-4 shrink-0 text-cyan-400" /> },
      { id: "settings", label: "Settings", icon: <Settings className="w-4 h-4 shrink-0 text-slate-400" /> }
    ];

    const showText = isMobile || isSidebarExpanded;

    return (
      <div className="h-full flex flex-col justify-between bg-[#080C14] border-r border-white/5 relative z-40" id="sidebar-layout-container">
        <div className="space-y-6 pt-5">
          {/* Sidebar Top: Logo + Toggle button */}
          <div className={`px-5 flex items-center justify-between gap-2 h-10 ${showText ? "" : "flex-col"}`}>
            {showText ? (
              <div className="flex items-center space-x-3 overflow-hidden">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#7C3AED] to-[#C084FC] flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/20 animate-none">
                  <Flame className="w-4 h-4 text-white" />
                </div>
                <h1 className="font-bold text-sm bg-gradient-to-r from-white via-[#C084FC] to-[#7C3AED] bg-clip-text text-transparent truncate leading-none">
                  DeadlineHero AI
                </h1>
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#7C3AED] to-[#C084FC] flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/20 animate-none">
                <Flame className="w-4 h-4 text-white" />
              </div>
            )}

            {/* Desktop Toggle Switch icon button */}
            {!isMobile && (
              <button
                type="button"
                onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
                className="p-1.5 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white cursor-pointer transition-colors"
                title={isSidebarExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
              >
                <Menu className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Navigation Items list */}
          <nav className="space-y-1 px-3">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as any);
                    setShowAddForm(false);
                    if (isMobile) setIsMobileSidebarOpen(false);
                  }}
                  className={`w-full relative px-3 py-2.5 rounded-xl flex items-center transition-all text-xs font-bold cursor-pointer text-left group overflow-hidden ${
                    isActive 
                      ? "bg-[#7C3AED]/20 text-white" 
                      : "text-[#94A3B8] hover:text-white hover:bg-white/5"
                  } ${showText ? "gap-3" : "justify-center"}`}
                  title={item.label}
                >
                  {/* Glowing vertical left edge indicator for active selection */}
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active-pill"
                      className="absolute left-0 top-2 bottom-2 w-[3px] bg-gradient-to-b from-[#C084FC] to-[#7C3AED] rounded-r-full shadow-[0_0_10px_#7C3AED]"
                    />
                  )}

                  {item.icon}

                  {showText && (
                    <motion.span
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="truncate leading-none"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Block at bottom */}
        <div className={`p-4 border-t border-white/5 bg-black/20 ${showText ? "space-y-3.5" : "space-y-2 flex flex-col items-center"}`}>
          {showText ? (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div 
                className="w-8 h-8 rounded-full overflow-hidden border border-[#7C3AED] shrink-0 cursor-pointer"
                onClick={() => {
                  setActiveTab("settings");
                  if (isMobile) setIsMobileSidebarOpen(false);
                }}
              >
                <img 
                  src={user?.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80"} 
                  alt="Avatar" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold truncate text-white leading-tight">
                  {user?.displayName || "Deadline Champ"}
                </p>
                <span className="text-[9px] text-[#A855F7] font-mono leading-none">AI Agent Sync Active</span>
              </div>
            </div>
          ) : (
            <div 
              className="w-8 h-8 rounded-full overflow-hidden border border-[#7C3AED] shrink-0 cursor-pointer animate-none"
              title="View Profile"
              onClick={() => {
                setActiveTab("settings");
              }}
            >
              <img 
                src={user?.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80"} 
                alt="Avatar" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          )}

          {showText ? (
            <button
              type="button"
              onClick={handleSignOutApp}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-[#94A3B8] hover:text-red-400 rounded-xl bg-white/5 hover:bg-red-500/10 cursor-pointer transition-all border border-white/5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Disconnect Agent</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSignOutApp}
              className="p-2 rounded-xl bg-white/5 hover:bg-red-500/10 text-[#94A3B8] hover:text-red-400 cursor-pointer transition-all border border-white/5"
              title="Disconnect Sync Agent"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  };

  // Reusable AI assistant view renderer with support for compact state
  const renderAiAssistantInner = (isModal: boolean = false) => {
    const visibleMessages = isAiCompactMode 
      ? (chatLog.length > 0 ? [chatLog[chatLog.length - 1]] : [])
      : chatLog;

    return (
      <div className="flex flex-col justify-between h-full w-full">
        <div className="flex-1 flex flex-col min-h-0">
          {/* Panel Header */}
          <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-3">
            <span className="text-xs uppercase font-extrabold tracking-widest text-[#94A3B8] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#C084FC] animate-pulse" />
              AI Assistant Desk
            </span>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              
              {/* Compact Mode Toggle */}
              {!isModal && (
                <button
                  type="button"
                  onClick={() => setIsAiCompactMode(!isAiCompactMode)}
                  className={`px-2 py-1 rounded text-[9px] font-bold border transition-all cursor-pointer leading-none ${
                    isAiCompactMode 
                      ? "bg-[#7C3AED]/20 border-[#7C3AED]/40 text-[#C084FC]" 
                      : "bg-white/5 border-white/5 text-[#94A3B8] hover:text-white"
                  }`}
                  title={isAiCompactMode ? "Show all messages" : "Show last response only"}
                >
                  Compact
                </button>
              )}

              {/* Full Screen / Modal Toggle */}
              <button
                type="button"
                onClick={() => setIsAiFullScreen(!isAiFullScreen)}
                className="p-1 rounded bg-white/5 hover:bg-white/15 text-white/50 hover:text-white cursor-pointer transition-all border border-white/5"
                title={isAiFullScreen ? "Exit Fullscreen" : "Fullscreen Mode"}
              >
                {isAiFullScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => {
                  setIsAiPanelOpen(false);
                  setIsAiFullScreen(false);
                }}
                className="p-1 rounded bg-white/5 hover:bg-white/15 text-[#94A3B8] hover:text-red-400 cursor-pointer transition-all border border-white/5"
                title="Minimize Panel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Subtitle / Description (Hidden in compact mode) */}
          {!isAiCompactMode && (
            <p className="text-[10px] text-white/50 mb-3 leading-normal">
              Analyze text, evaluate procrastination phrases, plan sprint structures, or query the assistant.
            </p>
          )}

          {/* Mode Tab Switcher */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-black/40 rounded-xl mb-4 border border-white/5 shrink-0">
            <button
              type="button"
              onClick={() => setAiMode("chat")}
              className={`py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider text-center cursor-pointer transition-all ${
                aiMode === "chat"
                  ? "bg-[#7C3AED] text-white shadow-md shadow-purple-500/10"
                  : "text-[#94A3B8] hover:text-white hover:bg-white/5"
              }`}
            >
              Copilot Chat
            </button>
            <button
              type="button"
              onClick={() => setAiMode("analyzer")}
              className={`py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider text-center cursor-pointer transition-all ${
                aiMode === "analyzer"
                  ? "bg-[#7C3AED] text-white shadow-md shadow-purple-500/10"
                  : "text-[#94A3B8] hover:text-white hover:bg-white/5"
              }`}
            >
              Text Analyzer
            </button>
          </div>

          {/* Render AI Chat Mode */}
          {aiMode === "chat" && (
            <div className={`space-y-4 flex-grow overflow-y-auto pr-1 pb-4 scrollbar-thin`}>
              {visibleMessages.length === 0 && (
                <div className="text-center py-8 text-white/30 text-xs italic">
                  No active consultation history. Write something below!
                </div>
              )}
              {visibleMessages.map((chat, idx) => (
                <div key={idx} className={`flex ${chat.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-3 rounded-xl text-xs max-w-[85%] leading-relaxed ${
                    chat.sender === 'user' 
                      ? 'bg-[#7C3AED] text-white rounded-tr-none shadow-md shadow-purple-500/15' 
                      : 'bg-black/35 border border-white/5 text-[#94A3B8] rounded-tl-none'
                  }`}>
                    {chat.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="p-3 bg-black/35 rounded-xl text-xs text-[#94A3B8] rounded-tl-none animate-pulse">
                    Agent is mapping recovery timeline...
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Render AI Analyzer Mode */}
          {aiMode === "analyzer" && (
            <div className={`space-y-4 flex-grow overflow-y-auto pr-1 pb-4 scrollbar-thin`}>
              <form onSubmit={handleAnalyzeTextSubmit} className="space-y-2 shrink-0">
                <textarea
                  value={analyzedText}
                  onChange={(e) => setAnalyzedText(e.target.value)}
                  placeholder="Paste workload email, school prompt, code constraint, or excuses list here..."
                  className="w-full h-24 p-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#7C3AED] leading-normal resize-none"
                />
                <button
                  type="submit"
                  disabled={isAnalyzingText || !analyzedText.trim()}
                  className="w-full py-2 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#A855F7] text-white text-xs font-bold uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                >
                  {isAnalyzingText ? "Parsing Text..." : "Analyze Work / Text"}
                </button>
              </form>

              {analyzerResult && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-black/35 border border-white/5 rounded-xl space-y-2.5"
                >
                  <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                    <span className="text-[9px] uppercase font-bold text-[#C084FC]">AI ANALYSIS SCORE</span>
                    <span className="text-[10px] font-mono text-white/50">{analyzerResult.timeCost} cost</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="px-2.5 py-1 bg-red-500/10 border border-red-500/20 rounded-lg text-center shrink-0">
                      <div className="text-lg font-black text-red-400">{analyzerResult.risk}%</div>
                      <div className="text-[7px] text-red-300 font-bold uppercase">RISK LEVEL</div>
                    </div>
                    <div className="flex-grow">
                      <div className="text-[10px] font-bold text-white uppercase leading-tight">{analyzerResult.grade}</div>
                      <div className="text-[9px] text-[#94A3B8] leading-tight flex items-center gap-1">
                        <span className="w-1 h-1 bg-[#C084FC] rounded-full" /> Threat profile calculated
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 bg-white/5 border border-white/5 rounded-lg">
                    <div className="text-[9px] text-[#C084FC] uppercase font-bold tracking-wider mb-1">COPILOT ADVICE</div>
                    <p className="text-[10px] text-white/80 leading-normal italic">
                      "{analyzerResult.advice}"
                    </p>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </div>

        {/* Footer form - visible ONLY in active chat mode */}
        {aiMode === "chat" && (
          <form onSubmit={handleChatSubmit} className="mt-2 pt-3 border-t border-white/5 flex gap-2 shrink-0">
            <input
              type="text"
              placeholder="Type/paste code, excuses, or prompts..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-grow px-3.5 py-2 rounded-xl bg-black/40 border border-[#7C3AED]/20 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#7C3AED]"
            />
            <button
              type="submit"
              disabled={chatLoading}
              className="px-4 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#A855F7] text-white font-bold text-xs cursor-pointer tracking-wider shrink-0"
            >
              Send
            </button>
          </form>
        )}
      </div>
    );
  };

  const formatCountdownTime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`;
  };

  // Determine if Any deadline is currently triggering panic CRITICAL state
  const isPanicInEffect = deadlines.some((d) => (d.riskPercentage ?? 0) > 80);

  return (
    <div className="min-h-screen bg-[#0B1020] text-white flex flex-col font-sans relative">
      <AnimatePresence>
        
        {/* Sirens and glowing outline if PANIC mode is triggered */}
        {isPanicInEffect && (
          <div className="fixed inset-0 border-[3px] border-red-500/30 pointer-events-none z-[100] animate-pulse">
            <div className="absolute top-0 left-0 w-full bg-[#EF4444] text-white text-[10px] py-1 font-bold tracking-widest text-center flex items-center justify-center gap-3">
              <AlertOctagon className="w-3.5 h-3.5 animate-spin" />
              <span>🚨 CRITICAL PANIC RESPONSE MODE ACTIVE — {"FAILURE DANGER DETECTED (WORKLOAD TRIPPED > 80%)"}</span>
              <span className="bg-black/30 px-2 py-0.5 rounded text-red-300 font-mono">COUNTDOWN: {formatCountdownTime(countdownMinutes)}</span>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Main View Router */}
      {activeView === "landing" ? (
        <LandingPage onStart={() => setShowAuthModal(true)} />
      ) : (
        <div className="flex-grow flex min-h-screen relative overflow-hidden bg-[#0B1020]">
          
          {/* 1. Desktop Permanently Fixed Sidebar (visible on md+) */}
          <aside 
            style={{ width: isSidebarExpanded ? "280px" : "80px" }}
            className="hidden md:block fixed top-0 left-0 bottom-0 z-30 transition-all duration-300 overflow-hidden"
          >
            {renderSidebarContent(false)}
          </aside>

          {/* 2. Mobile Left Drawer Slide-out Sidebar (visible on <md) */}
          <AnimatePresence>
            {isMobileSidebarOpen && (
              <div key="mobile-sidebar-container">
                {/* Backdrop overlay layer with click-to-close */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                />
                
                {/* Drawer Container with framer motion swipe/slide animation */}
                <motion.aside
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 220 }}
                  drag="x"
                  dragConstraints={{ left: -280, right: 0 }}
                  dragElastic={{ left: 0.1, right: 0.5 }}
                  onDragEnd={(e, info) => {
                    if (info.offset.x < -60) {
                      setIsMobileSidebarOpen(false);
                    }
                  }}
                  className="fixed top-0 left-0 bottom-0 w-[280px] z-50 md:hidden overflow-hidden shadow-2xl"
                >
                  {renderSidebarContent(true)}
                </motion.aside>
              </div>
            )}
          </AnimatePresence>

          {/* 3. Main Content Container Area */}
          <div 
            className={`flex-grow flex flex-col min-h-screen transition-all duration-300 overflow-x-hidden ${
              isSidebarExpanded ? "md:pl-[280px]" : "md:pl-[80px]"
            }`}
          >
            {/* Mobile Top Navbar Bar header (shown on mobile layout to open menu drawer) */}
            <header className="flex md:hidden h-14 bg-[#080C14] border-b border-white/5 px-4 items-center justify-between z-20 shrink-0">
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(true)}
                className="p-1.5 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white"
                title="Open Navigation"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-[#C084FC] animate-pulse" />
                <span className="font-extrabold text-[10px] tracking-wider text-white uppercase">DeadlineHero AI</span>
              </div>
              <div 
                className="w-7 h-7 rounded-full overflow-hidden border border-white/10 bg-gradient-to-tr from-[#7C3AED] to-[#A855F7] cursor-pointer"
                onClick={() => {
                  setActiveTab("settings");
                }}
              >
                <img 
                  src={user?.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80"} 
                  alt="Avatar" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            </header>

            {/* Desktop and Tablet Workspace Header (top workspace title, alert triggers, profile settings) */}
            <header className="h-16 border-b border-white/5 px-6 lg:px-8 flex items-center justify-between bg-[#0B1020]/80 backdrop-blur-md shrink-0">
              <div className="flex items-center gap-4">
                <h1 className="text-sm font-medium tracking-tight text-white lg:text-base capitalize">
                  DeadlineHero <span className="text-white/40">/</span> <span className="text-[#C084FC] uppercase tracking-wider text-xs font-bold">{activeTab.replace("-", " ")} Center</span>
                </h1>
                {isPanicInEffect && (
                  <div className="px-2 py-0.5 bg-red-500/10 border border-red-500/20 rounded text-[10px] text-red-400 font-bold tracking-wider">CRITICAL SESSION</div>
                )}
              </div>
              <div className="flex items-center gap-4">
                {/* AI Panel Toggle Option to Close and Open */}
                <button
                  type="button"
                  onClick={() => setIsAiPanelOpen(!isAiPanelOpen)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all text-xs font-bold cursor-pointer ${
                    isAiPanelOpen 
                      ? "bg-[#7C3AED]/20 border-[#7C3AED]/50 text-white" 
                      : "bg-white/5 border-white/10 text-[#94A3B8] hover:text-white"
                  }`}
                  title={isAiPanelOpen ? "Close AI Assistant Analysis Panel" : "Open AI Assistant Analysis Panel"}
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isAiPanelOpen ? 'text-[#C084FC] animate-pulse' : 'text-[#94A3B8]'}`} />
                  <span className="hidden sm:inline leading-none">
                    {isAiPanelOpen ? "Close AI Assistant" : "Analyze via AI"}
                  </span>
                  <span className="inline sm:hidden leading-none">AI</span>
                </button>

                <div className="text-right hidden sm:block">
                  <div className="text-[10px] text-white/40 uppercase tracking-widest leading-none mb-1">System Status</div>
                  <div className="text-xs text-[#22C55E] flex items-center gap-1.5 justify-end">
                    <span className="w-1.5 h-1.5 bg-[#22C55E] rounded-full animate-pulse" />
                    AI Agent Active
                  </div>
                </div>
                <div 
                  onClick={() => setActiveTab("settings")}
                  className="w-8 h-8 rounded-full overflow-hidden border border-white/10 shrink-0 bg-gradient-to-tr from-[#7C3AED] to-[#A855F7] cursor-pointer hover:border-[#7C3AED]/50 transition-colors"
                >
                  <img 
                    src={user?.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80"} 
                    alt="Avatar" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
            </header>

            {/* Scrollable Workspace Panels container padding top adjustment when panic triggers */}
            <div className={`flex-grow p-6 lg:p-8 space-y-8 ${isPanicInEffect ? 'pt-14' : ''}`}>
              <AnimatePresence mode="wait">
                {/* Show Add Triage Form inside content pane if activated */}
                {showAddForm ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    key="add-form"
                  >
                    <RiskEngine 
                      onAddDeadline={handleAddAndAnalyzeDeadline} 
                      onCancel={() => setShowAddForm(false)} 
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    key={activeTab}
                    className="space-y-8"
                  >
                    {/* Main Workspace Panels — Occupy 100% of horizontal layout space on all screens */}
                    <div className="w-full space-y-8 pb-20">
                      {activeTab === "dashboard" && renderDashboardView()}
                      
                      {activeTab === "rescue" && (
                        <RescueCenter
                          user={user}
                          score={overallScore}
                          status={overallStatus}
                          briefing={dailyBriefing}
                          deadlines={deadlines}
                          onAddDeadlineClick={() => setShowAddForm(true)}
                          onDeleteDeadline={handleDeleteDeadline}
                          onSaveDeadlineClick={handleSaveDeadlineModal}
                          onSignOut={handleSignOutApp}
                        />
                      )}

                      {activeTab === "warroom" && <WarRoom deadlines={deadlines} />}

                      {activeTab === "strategist" && (
                        <WorkAssistant 
                          setActiveTab={setActiveTab}
                          onImportDeadline={async (newDl) => {
                            const dObj: Deadline = {
                              id: "imported_" + Date.now(),
                              userId: user?.uid || "demo-hero-999",
                              title: newDl.title,
                              date: newDl.date,
                              priority: newDl.priority,
                              progress: 0,
                              estimatedEffort: newDl.estimatedEffort,
                              riskPercentage: newDl.riskPercentage,
                              successProbability: newDl.successProbability,
                              urgencyScore: newDl.urgencyScore,
                              recoveryPotential: newDl.recoveryPotential,
                              isCritical: newDl.riskPercentage > 80,
                              createdAt: new Date().toISOString()
                            };
                            const updated = [dObj, ...deadlines];
                            await saveDeadlinesState(updated);
                            await analyzeWorkloadScore(updated);
                          }}
                        />
                      )}

                      {activeTab === "analytics" && (
                        <AnalyticsDashboard
                          completedCount={deadlines.filter(d => (d.progress ?? 0) >= 100).length}
                          savedCount={deadlines.length}
                          deadlinesCount={deadlines.length}
                        />
                      )}

                      {activeTab === "settings" && renderSettingsView()}
                    </div>

                    {/* Desktop Docked Resizable Drawer Mode */}
                    <AnimatePresence>
                      {isAiPanelOpen && !isAiFullScreen && (
                        <motion.div
                          key="desktop-drawer"
                          initial={{ opacity: 0, y: 150, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 150, scale: 0.95 }}
                          transition={{ type: "spring", damping: 25, stiffness: 220 }}
                          style={{ height: `${aiPanelHeight}px` }}
                          className="hidden md:flex flex-col fixed bottom-6 right-6 z-40 w-[420px] bg-[#0A0F1D]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden shadow-purple-500/5 hover:border-white/15"
                        >
                          {/* Top edge drag border handle */}
                          <div 
                            onMouseDown={handleMouseDown}
                            onTouchStart={handleTouchStart}
                            className="h-2 w-full bg-white/5 hover:bg-[#7C3AED]/30 active:bg-[#7C3AED]/55 cursor-ns-resize flex items-center justify-center transition-colors group shrink-0"
                            title="Drag up or down to resize AI Assistant"
                          >
                            <div className="w-12 h-1 rounded-full bg-white/20 group-hover:bg-[#C084FC]/55 group-active:bg-white/80 transition-colors" />
                          </div>

                          {/* Render Internal AI View */}
                          <div className="p-5 flex-grow flex flex-col min-h-0 overflow-hidden">
                            {renderAiAssistantInner(false)}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Full Screen Mode Modal Overlay */}
                    <AnimatePresence>
                      {isAiPanelOpen && isAiFullScreen && (
                        <div key="full-screen-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: "spring", damping: 25 }}
                            className="w-[90%] h-[90%] max-w-6xl bg-[#090D1C]/95 backdrop-blur-2xl border border-[#7C3AED]/30 rounded-3xl shadow-3xl flex flex-col overflow-hidden relative"
                          >
                            {/* Visual aesthetic accent */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#7C3AED]/5 blur-[120px] rounded-full pointer-events-none" />
                            
                            <div className="p-8 flex-grow flex flex-col min-h-0 relative z-10">
                              {renderAiAssistantInner(true)}
                            </div>
                          </motion.div>
                        </div>
                      )}
                    </AnimatePresence>

                    {/* Swipeable Mobile Bottom Sheet */}
                    <AnimatePresence>
                      {isAiPanelOpen && !isAiFullScreen && (
                        <motion.div
                          key="mobile-bottom-sheet"
                          initial={{ y: "100%" }}
                          animate={{ y: 0 }}
                          exit={{ y: "100%" }}
                          transition={{ type: "spring", damping: 25, stiffness: 220 }}
                          drag="y"
                          dragConstraints={{ top: 0 }}
                          dragElastic={{ top: 0, bottom: 0.8 }}
                          onDragEnd={(e, info) => {
                            if (info.offset.y > 140) {
                              setIsAiPanelOpen(false);
                            }
                          }}
                          className="flex md:hidden flex-col fixed bottom-0 left-0 right-0 z-50 h-[80vh] bg-[#0E1628]/95 backdrop-blur-2xl border-t border-[#7C3AED]/20 rounded-t-3xl shadow-2xl overflow-hidden"
                        >
                          {/* Touch drag indicator standard bar */}
                          <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto my-3 cursor-ns-resize shrink-0 animate-pulse" />
                          <div className="px-5 pb-6 flex-grow flex flex-col min-h-0 overflow-hidden">
                            {renderAiAssistantInner(false)}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* 🚨 FEATURE 2: SAVE MY DEADLINE GIANT FLOATING EMERGENCY BUTTON */}
                    {deadlines.filter(d => (d.progress ?? 0) < 100).length > 0 && (
                      <motion.button
                        type="button"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        onClick={() => {
                          const criticalDl = deadlines.find(d => (d.riskPercentage ?? 0) > 80) || deadlines.filter(d => (d.progress ?? 0) < 100)[0];
                          if (criticalDl) {
                            handleSaveDeadlineModal(criticalDl);
                          }
                        }}
                        className="fixed bottom-6 right-48 md:right-52 z-48 p-4 rounded-full bg-gradient-to-r from-red-600 via-red-500 to-rose-500 shadow-xl shadow-red-500/25 flex items-center justify-center text-white font-extrabold text-xs cursor-pointer border border-red-400/30 hover:scale-105 active:scale-95 transition-all animate-pulse"
                        title="TRIGGER LIFEBOAT RECOVERY SHIELD"
                      >
                        <div className="flex items-center gap-2">
                          <AlertOctagon className="w-4 h-4 text-white shrink-0" />
                          <span className="leading-none tracking-widest font-black uppercase">🚨 SAVE MY DEADLINE</span>
                        </div>
                      </motion.button>
                    )}

                    {/* Floating Assistant toggle trigger floating bubble */}
                    <motion.button
                      type="button"
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      onClick={() => {
                        setIsAiPanelOpen(!isAiPanelOpen);
                        if (isAiFullScreen) setIsAiFullScreen(false);
                      }}
                      className="fixed bottom-6 right-6 z-48 p-4 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#A855F7] shadow-xl shadow-purple-500/25 flex items-center justify-center text-white font-extrabold text-xs cursor-pointer border border-[#C084FC]/30 hover:scale-105 active:scale-95 transition-all animate-none"
                      title={isAiPanelOpen ? "Close AI Desk" : "Open AI Assistant"}
                    >
                      {isAiPanelOpen ? (
                        <div className="flex items-center gap-2">
                          <X className="w-4 h-4 text-white" />
                          <span className="max-w-0 md:max-w-xs overflow-hidden transition-all duration-300 leading-none">Close Desk</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-white animate-pulse" />
                          <span className="leading-none">Open AI Desk</span>
                        </div>
                      )}
                    </motion.button>

                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </div>
        </div>
      )}

      {/* Real Auth Modal Sliding Drawer */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-[110] p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md p-8 rounded-3xl bg-[#131A2A] border border-[#7C3AED]/30 space-y-6 relative overflow-hidden"
            >
              {/* Background accent inside card */}
              <div className="absolute top-[-20%] left-[-20%] w-48 h-48 bg-[#7C3AED]/10 blur-3xl rounded-full" />
              
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#7C3AED] to-[#C084FC] flex items-center justify-center mx-auto shadow-lg shadow-purple-500/20">
                  <Flame className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold">Synchronize Recovery Agent</h3>
                <p className="text-xs text-[#94A3B8]">
                  Connect your profile or verify metrics instantly using our quick-demo environment bypass.
                </p>
              </div>

              {authError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 text-center">
                  {authError}
                </div>
              )}

              {/* Form elements */}
              <form onSubmit={handleEmailSignIn} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-[#94A3B8] uppercase">EMAIL ADDRESS</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. hackathon_judge@domain.com"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-[#7C3AED]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-[#94A3B8] uppercase">SECURE PASSWORD</label>
                  <input
                    type="password"
                    required
                    placeholder="Provide at least 6 characters"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-[#7C3AED]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3 rounded-xl bg-[#7C3AED] hover:bg-[#A855F7] text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isRegister ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
                  <span>{isRegister ? "Register New Agent" : "Synchronize Agent"}</span>
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-2">
                <div className="flex-grow h-[1px] bg-white/10" />
                <span className="text-[10px] text-[#94A3B8] font-mono">OR</span>
                <div className="flex-grow h-[1px] bg-white/10" />
              </div>

              {/* Federated Login Controls */}
              <div className="space-y-2.5">
                <button
                  onClick={handleSocialGoogleSignIn}
                  disabled={authLoading}
                  className="w-full py-3 rounded-xl bg-white text-black font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all hover:bg-slate-100"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.148-5.111 4.148-3.414 0-6.19-2.776-6.19-6.19 0-3.414 2.776-6.19 6.19-6.19 1.481 0 2.836.524 3.905 1.39l2.946-2.946C18.667 2.628 15.65 1.5 12.24 1.5c-5.795 0-10.5 4.705-10.5 10.5s4.705 10.5 10.5 10.5c5.38 0 9.873-3.882 10.363-9.1v-3.115H12.24z"/>
                  </svg>
                  <span>Authorize with Google</span>
                </button>

                {/* Instant Bypass Demonstration Login - Hackathon judges will absolutely appreciate this! */}
                <button
                  onClick={triggerInstantDemoState}
                  disabled={authLoading}
                  className="w-full py-3 rounded-xl bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E] font-bold text-xs uppercase tracking-widest cursor-pointer hover:bg-[#22C55E]/25 transition-all flex items-center justify-center gap-1.5"
                >
                  <Laptop className="w-4 h-4 text-[#22C55E]" />
                  <span>Use Demo Sandbox Bypass</span>
                </button>
              </div>

              {/* Toggle registering */}
              <div className="text-center pt-2">
                <button
                  onClick={() => setIsRegister(!isRegister)}
                  className="text-[11px] text-[#A855F7] hover:underline cursor-pointer"
                >
                  {isRegister ? "Already tracking? Sync email profile" : "Create a fresh user credentials tracking system"}
                </button>
              </div>

              {/* Close Button */}
              <button 
                onClick={() => setShowAuthModal(false)}
                className="absolute right-4 top-4 hover:text-white text-[#94A3B8] transition-all cursor-pointer text-sm font-semibold"
              >
                ✕
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🚨 FEATURE 2: SAVE DEADLINE RECOVERY ROADMAP OVERLAY POPUP */}
      <AnimatePresence>
        {activeRescuePlan && rescuingDeadline && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[110] p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-4xl max-h-[90vh] rounded-3xl bg-[#0F172A] border-2 border-[#EF4444]/40 space-y-6 relative overflow-hidden flex flex-col shadow-2xl shadow-red-500/10"
            >
              {/* Header Warning */}
              <div className="p-6 border-b border-white/5 bg-[#1E293B]/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#EF4444]/15 flex items-center justify-center text-[#EF4444]">
                    <ShieldAlert className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <span className="block text-[9px] font-black uppercase text-[#F87171] tracking-widest">TACTICAL NUCLEAR TRIAGE IN PROGRESS</span>
                    <h3 className="text-lg font-extrabold text-white">Emergency Rescue Action Sheet: {rescuingDeadline.title}</h3>
                  </div>
                </div>
                <div className="px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[10px] font-extrabold uppercase tracking-widest shrink-0">
                  {activeRescuePlan.category ?? "Personal Goal"} MODE
                </div>
              </div>

              {/* Scrollable Workspace */}
              <div className="p-6 overflow-y-auto space-y-6 flex-grow pr-4 custom-scrollbar">
                
                {/* 0. Dynamic Telemetry & Low Time Alert */}
                <div className="space-y-4">
                  {/* Warning message when available time is very low (e.g. daysRemaining <= 1) */}
                  {(activeRescuePlan.daysRemaining !== undefined ? activeRescuePlan.daysRemaining : 1) <= 1 && (
                    <div id="emergency-mode-warning" className="p-4 rounded-2xl bg-red-950/40 border-2 border-red-500 text-red-200 animate-pulse flex items-start gap-3 shadow-lg shadow-red-500/10">
                      <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5 animate-bounce" />
                      <div>
                        <h4 className="font-extrabold text-sm text-red-400">⚠ Only 1 day remaining.</h4>
                        <p className="text-xs text-red-300 font-semibold mt-0.5">Emergency study mode activated.</p>
                      </div>
                    </div>
                  )}

                  {/* Date & Remaining Time Indicators */}
                  <div id="rescue-telemetry-grid" className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-900/30 p-4 rounded-2xl border border-white/5">
                    <div id="current-date-metric" className="p-3 rounded-xl bg-slate-900/60 border border-white/5 flex flex-col justify-between">
                      <span className="block text-[9px] text-[#94A3B8] font-bold uppercase tracking-wider">Current Date</span>
                      <span className="text-xs font-mono font-bold text-white mt-1">
                        {activeRescuePlan.currentDate || new Date().toISOString().split('T')[0]}
                      </span>
                    </div>
                    <div id="deadline-date-metric" className="p-3 rounded-xl bg-slate-900/60 border border-white/5 flex flex-col justify-between">
                      <span className="block text-[9px] text-[#94A3B8] font-bold uppercase tracking-wider">Deadline Date</span>
                      <span className="text-xs font-mono font-bold text-white mt-1">
                        {activeRescuePlan.deadlineDate || rescuingDeadline.date}
                      </span>
                    </div>
                    <div id="days-remaining-metric" className="p-3 rounded-xl bg-slate-900/60 border border-white/5 flex flex-col justify-between">
                      <span className="block text-[9px] text-yellow-400 font-bold uppercase tracking-wider">Days Remaining</span>
                      <span className="text-xs font-mono font-extrabold text-yellow-300 mt-1">
                        {activeRescuePlan.daysRemaining !== undefined ? activeRescuePlan.daysRemaining : 1} { (activeRescuePlan.daysRemaining ?? 1) === 1 ? 'day' : 'days' }
                      </span>
                    </div>
                    <div id="hours-remaining-metric" className="p-3 rounded-xl bg-slate-900/60 border border-white/5 flex flex-col justify-between">
                      <span className="block text-[9px] text-blue-400 font-bold uppercase tracking-wider">Hours Remaining</span>
                      <span className="text-xs font-mono font-extrabold text-blue-300 mt-1">
                        {activeRescuePlan.hoursRemaining !== undefined ? activeRescuePlan.hoursRemaining : 24} hours
                      </span>
                    </div>
                  </div>
                </div>

                {/* 1. Numerical Risk Metrics Cockpit */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* Failure Risk Indicator */}
                  <div className="p-4 rounded-2xl bg-red-950/20 border border-red-500/20 relative overflow-hidden flex flex-col justify-between">
                    <div>
                      <span className="block text-[10px] text-[#F87171] font-bold uppercase tracking-wider mb-2">FAILURE RISK</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-red-500">{activeRescuePlan.failureRisk ?? 65}%</span>
                        <span className="text-xs text-red-400/70 font-light">Calculated Trajectory</span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-red-950 rounded-full overflow-hidden mt-3">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: `${activeRescuePlan.failureRisk ?? 65}%` }} />
                    </div>
                  </div>

                  {/* Success Probability Indicator */}
                  <div className="p-4 rounded-2xl bg-green-950/20 border border-green-500/20 relative overflow-hidden flex flex-col justify-between">
                    <div>
                      <span className="block text-[10px] text-[#4ADE80] font-bold uppercase tracking-wider mb-2">SUCCESS PROBABILITY</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-green-400">{activeRescuePlan.successProbability ?? 85}%</span>
                        <span className="text-xs text-green-400/70 font-light">With Shield Active</span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-green-950 rounded-full overflow-hidden mt-3">
                      <div className="h-full bg-green-400 rounded-full" style={{ width: `${activeRescuePlan.successProbability ?? 85}%` }} />
                    </div>
                  </div>

                  {/* Recovery Potential Indicator */}
                  <div className="p-4 rounded-2xl bg-blue-950/20 border border-blue-500/20 relative overflow-hidden flex flex-col justify-between">
                    <div>
                      <span className="block text-[10px] text-[#60A5FA] font-bold uppercase tracking-wider mb-2">RECOVERY POTENTIAL</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-blue-400">{activeRescuePlan.recoveryPotential ?? 75}%</span>
                        <span className="text-xs text-blue-400/70 font-light">Remaining Leverage</span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-blue-950 rounded-full overflow-hidden mt-3">
                      <div className="h-full bg-blue-400 rounded-full" style={{ width: `${activeRescuePlan.recoveryPotential ?? 75}%` }} />
                    </div>
                  </div>

                </div>

                {/* 2. Category-Specific Tactical Blueprint */}
                <div className="p-5 rounded-2xl bg-[#1E293B]/40 border border-white/5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                    <Brain className="w-5 h-5 text-purple-400" />
                    <h4 className="text-xs font-black uppercase text-purple-300 tracking-widest">
                      {activeRescuePlan.category ?? "Personal Goal"} Custom Triage Blueprint
                    </h4>
                  </div>

                  {activeRescuePlan.category === "Exam" && activeRescuePlan.categoryContent?.studySchedule && (
                    <div className="space-y-4 text-xs">
                      <div>
                        <span className="font-extrabold text-[#94A3B8] block mb-2 uppercase tracking-widest text-[9px]">Active Study Schedule</span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {activeRescuePlan.categoryContent.studySchedule.map((s, idx) => (
                            <div key={idx} className="p-3 rounded-xl bg-black/40 border border-purple-500/10 space-y-2">
                              <span className="font-black text-purple-400 block text-[9px] uppercase tracking-wider">{s.day}</span>
                              <span className="text-[9px] text-white font-mono bg-purple-500/20 px-2 py-0.5 rounded-full inline-block">{s.duration}</span>
                              <ul className="space-y-1 pl-2 list-disc text-[11px] text-[#94A3B8]">
                                {s.topics?.map((t, i) => <li key={i}>{t}</li>)}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                      {activeRescuePlan.categoryContent.topicPrioritization && (
                        <div>
                          <span className="font-extrabold text-[#94A3B8] block mb-2 uppercase tracking-widest text-[9px]">Topic Prioritization Matrix</span>
                          <div className="space-y-2">
                            {activeRescuePlan.categoryContent.topicPrioritization.map((p, idx) => (
                              <div key={idx} className="p-3 rounded-xl bg-black/40 border border-white/5 flex justify-between items-start gap-4">
                                <div>
                                  <p className="font-bold text-white text-[11px]">{p.topic}</p>
                                  <p className="text-[#94A3B8] text-[11px] font-light mt-0.5">{p.strategy}</p>
                                </div>
                                <span className="text-[9px] font-black uppercase bg-red-500/15 text-red-400 px-2.5 py-0.5 rounded-full shrink-0">{p.weight}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {activeRescuePlan.categoryContent.revisionStrategy && (
                        <div>
                          <span className="font-extrabold text-[#94A3B8] block mb-1.5 uppercase tracking-widest text-[9px]">Active Revision Strategies</span>
                          <ul className="space-y-1.5 pl-4 list-decimal text-[11px] text-[#94A3B8]">
                            {activeRescuePlan.categoryContent.revisionStrategy.map((s, idx) => <li key={idx}>{s}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {activeRescuePlan.category === "Assignment" && activeRescuePlan.categoryContent && (
                    <div className="space-y-4 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {activeRescuePlan.categoryContent.researchOutline && (
                          <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-2">
                            <span className="font-extrabold text-[#C084FC] block text-[9px] uppercase tracking-widest">Source & Research Outline</span>
                            <ul className="space-y-1 pl-3 list-disc text-[11px] text-[#94A3B8]">
                              {activeRescuePlan.categoryContent.researchOutline.map((s, idx) => <li key={idx}>{s}</li>)}
                            </ul>
                          </div>
                        )}
                        {activeRescuePlan.categoryContent.draftDrafting && (
                          <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-2">
                            <span className="font-extrabold text-[#C084FC] block text-[9px] uppercase tracking-widest">Drafting Sprints</span>
                            <ul className="space-y-1 pl-3 list-disc text-[11px] text-[#94A3B8]">
                              {activeRescuePlan.categoryContent.draftDrafting.map((s, idx) => <li key={idx}>{s}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {activeRescuePlan.categoryContent.editingRound && (
                          <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-2">
                            <span className="font-extrabold text-blue-400 block text-[9px] uppercase tracking-widest">Syntactic Proofing Loops</span>
                            <ul className="space-y-1 pl-3 list-disc text-[11px] text-[#94A3B8]">
                              {activeRescuePlan.categoryContent.editingRound.map((s, idx) => <li key={idx}>{s}</li>)}
                            </ul>
                          </div>
                        )}
                        {activeRescuePlan.categoryContent.referenceChecking && (
                          <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-2">
                            <span className="font-extrabold text-blue-400 block text-[9px] uppercase tracking-widest">Rubric & Citation Checklist</span>
                            <ul className="space-y-1 pl-3 list-disc text-[11px] text-[#94A3B8]">
                              {activeRescuePlan.categoryContent.referenceChecking.map((s, idx) => <li key={idx}>{s}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeRescuePlan.category === "Interview" && activeRescuePlan.categoryContent && (
                    <div className="space-y-4 text-xs">
                      {activeRescuePlan.categoryContent.mockInterviewPlan && (
                        <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-2">
                          <span className="font-extrabold text-emerald-400 block text-[9px] uppercase tracking-widest">Mock Interview Strategy</span>
                          <ul className="space-y-1 pl-3 list-disc text-[11px] text-[#94A3B8]">
                            {activeRescuePlan.categoryContent.mockInterviewPlan.map((s, idx) => <li key={idx}>{s}</li>)}
                          </ul>
                        </div>
                      )}
                      {activeRescuePlan.categoryContent.questionPreparation && (
                        <div>
                          <span className="font-extrabold text-[#94A3B8] block mb-2 uppercase tracking-widest text-[9px]">Custom STAR Question Templates</span>
                          <div className="space-y-2">
                            {activeRescuePlan.categoryContent.questionPreparation.map((q, idx) => (
                              <div key={idx} className="p-3 rounded-xl bg-black/40 border border-emerald-500/10 space-y-1">
                                <p className="font-bold text-white text-[11px]">Q: {q.question}</p>
                                <p className="text-emerald-400 text-[11px] font-light leading-snug"><span className="font-bold">Focus:</span> {q.focus}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {activeRescuePlan.categoryContent.skillRoadmap && (
                        <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-2">
                          <span className="font-extrabold text-[#94A3B8] block text-[9px] uppercase tracking-widest">Core Technical Foundations</span>
                          <ul className="space-y-1 pl-3 list-disc text-[11px] text-[#94A3B8]">
                            {activeRescuePlan.categoryContent.skillRoadmap.map((s, idx) => <li key={idx}>{s}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {activeRescuePlan.category === "Hackathon" && activeRescuePlan.categoryContent && (
                    <div className="space-y-4 text-xs">
                      {activeRescuePlan.categoryContent.mvpRoadmap && (
                        <div>
                          <span className="font-extrabold text-[#94A3B8] block mb-2 uppercase tracking-widest text-[9px]">MVP Feature Decompositions</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {activeRescuePlan.categoryContent.mvpRoadmap.map((m, idx) => (
                              <div key={idx} className="p-3 rounded-xl bg-black/40 border border-orange-500/10 space-y-1.5 flex justify-between items-start gap-2">
                                <div>
                                  <p className="font-bold text-white text-[11px]">{m.feature}</p>
                                  <span className="text-[9px] text-[#94A3B8] font-mono">Complexity: {m.complexity}</span>
                                </div>
                                <span className="text-[9px] font-black uppercase bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full shrink-0">{m.priority}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {activeRescuePlan.categoryContent.featurePrioritization && (
                          <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-2">
                            <span className="font-extrabold text-orange-400 block text-[9px] uppercase tracking-widest">De-prioritized Features (Cut)</span>
                            <ul className="space-y-1 pl-3 list-disc text-[11px] text-[#94A3B8]">
                              {activeRescuePlan.categoryContent.featurePrioritization.map((s, idx) => <li key={idx}>{s}</li>)}
                            </ul>
                          </div>
                        )}
                        {activeRescuePlan.categoryContent.demoPreparation && (
                          <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-2">
                            <span className="font-extrabold text-orange-400 block text-[9px] uppercase tracking-widest">Demo Video & Script Rules</span>
                            <ul className="space-y-1 pl-3 list-disc text-[11px] text-[#94A3B8]">
                              {activeRescuePlan.categoryContent.demoPreparation.map((s, idx) => <li key={idx}>{s}</li>)}
                            </ul>
                          </div>
                        )}
                        {activeRescuePlan.categoryContent.submissionChecklist && (
                          <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-2">
                            <span className="font-extrabold text-orange-400 block text-[9px] uppercase tracking-widest">Submission Validation Checklist</span>
                            <ul className="space-y-1 pl-3 list-disc text-[11px] text-[#94A3B8]">
                              {activeRescuePlan.categoryContent.submissionChecklist.map((s, idx) => <li key={idx}>{s}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeRescuePlan.category === "Project" && activeRescuePlan.categoryContent && (
                    <div className="space-y-4 text-xs">
                      {activeRescuePlan.categoryContent.taskDecomposition && (
                        <div>
                          <span className="font-extrabold text-[#94A3B8] block mb-2 uppercase tracking-widest text-[9px]">Surgical Task Decomposition</span>
                          <div className="space-y-2">
                            {activeRescuePlan.categoryContent.taskDecomposition.map((t, idx) => (
                              <div key={idx} className="p-3 rounded-xl bg-black/40 border border-white/5 flex justify-between items-center text-[11px] gap-2">
                                <div>
                                  <p className="font-bold text-white">{t.subtask}</p>
                                  <span className="text-[9px] text-[#94A3B8]">Complexity: {t.complexity}</span>
                                </div>
                                <span className="text-[9px] font-mono bg-purple-500/20 text-purple-300 px-2.5 py-0.5 rounded-full shrink-0">{t.eta}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {activeRescuePlan.categoryContent.milestones && (
                        <div>
                          <span className="font-extrabold text-[#94A3B8] block mb-2 uppercase tracking-widest text-[9px]">Strategic Project Milestones</span>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {activeRescuePlan.categoryContent.milestones.map((m, idx) => (
                              <div key={idx} className="p-3 rounded-xl bg-black/40 border border-purple-500/15 space-y-1 text-center">
                                <span className="block text-[10px] text-purple-400 font-black uppercase tracking-wider">{m.milestone}</span>
                                <span className="text-[11px] text-white font-mono">{m.dueDate}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {activeRescuePlan.categoryContent.deliveryPlan && (
                        <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-2">
                          <span className="font-extrabold text-[#94A3B8] block text-[9px] uppercase tracking-widest">Delivery and Testing Protocols</span>
                          <ul className="space-y-1 pl-3 list-disc text-[11px] text-[#94A3B8]">
                            {activeRescuePlan.categoryContent.deliveryPlan.map((s, idx) => <li key={idx}>{s}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {activeRescuePlan.category === "Meeting" && activeRescuePlan.categoryContent && (
                    <div className="space-y-4 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {activeRescuePlan.categoryContent.agendaCreation && (
                          <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-2">
                            <span className="font-extrabold text-pink-400 block text-[9px] uppercase tracking-widest">Outcome-focused Agenda</span>
                            <ul className="space-y-1 pl-3 list-disc text-[11px] text-[#94A3B8]">
                              {activeRescuePlan.categoryContent.agendaCreation.map((s, idx) => <li key={idx}>{s}</li>)}
                            </ul>
                          </div>
                        )}
                        {activeRescuePlan.categoryContent.talkingPoints && (
                          <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-2">
                            <span className="font-extrabold text-pink-400 block text-[9px] uppercase tracking-widest">Key Presentational Focus Lines</span>
                            <ul className="space-y-1 pl-3 list-disc text-[11px] text-[#94A3B8]">
                              {activeRescuePlan.categoryContent.talkingPoints.map((s, idx) => <li key={idx}>{s}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                      {activeRescuePlan.categoryContent.actionItemTracker && (
                        <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-2">
                          <span className="font-extrabold text-[#94A3B8] block text-[9px] uppercase tracking-widest">Action Tracker & Assignments</span>
                          <ul className="space-y-1 pl-3 list-disc text-[11px] text-[#94A3B8]">
                            {activeRescuePlan.categoryContent.actionItemTracker.map((s, idx) => <li key={idx}>{s}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {activeRescuePlan.category === "Bill Payment" && activeRescuePlan.categoryContent && (
                    <div className="space-y-4 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {activeRescuePlan.categoryContent.budgetOptimization && (
                          <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-2">
                            <span className="font-extrabold text-yellow-400 block text-[9px] uppercase tracking-widest">Budget Prunings</span>
                            <ul className="space-y-1 pl-3 list-disc text-[11px] text-[#94A3B8]">
                              {activeRescuePlan.categoryContent.budgetOptimization.map((s, idx) => <li key={idx}>{s}</li>)}
                            </ul>
                          </div>
                        )}
                        {activeRescuePlan.categoryContent.cashflowSchedule && (
                          <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-2">
                            <span className="font-extrabold text-yellow-400 block text-[9px] uppercase tracking-widest">Cashflow Schedule</span>
                            <ul className="space-y-1 pl-3 list-disc text-[11px] text-[#94A3B8]">
                              {activeRescuePlan.categoryContent.cashflowSchedule.map((s, idx) => <li key={idx}>{s}</li>)}
                            </ul>
                          </div>
                        )}
                        {activeRescuePlan.categoryContent.autoPaySetup && (
                          <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-2">
                            <span className="font-extrabold text-yellow-400 block text-[9px] uppercase tracking-widest">AutoPay Alarms Setup</span>
                            <ul className="space-y-1 pl-3 list-disc text-[11px] text-[#94A3B8]">
                              {activeRescuePlan.categoryContent.autoPaySetup.map((s, idx) => <li key={idx}>{s}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeRescuePlan.category === "Personal Goal" && activeRescuePlan.categoryContent && (
                    <div className="space-y-4 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {activeRescuePlan.categoryContent.actionSteps && (
                          <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-2">
                            <span className="font-extrabold text-purple-400 block text-[9px] uppercase tracking-widest">Focus Calendar Blockers</span>
                            <ul className="space-y-1 pl-3 list-disc text-[11px] text-[#94A3B8]">
                              {activeRescuePlan.categoryContent.actionSteps.map((s, idx) => <li key={idx}>{s}</li>)}
                            </ul>
                          </div>
                        )}
                        {activeRescuePlan.categoryContent.milestoneTracking && (
                          <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-2">
                            <span className="font-extrabold text-purple-400 block text-[9px] uppercase tracking-widest">Checkpoint Identifiers</span>
                            <ul className="space-y-1 pl-3 list-disc text-[11px] text-[#94A3B8]">
                              {activeRescuePlan.categoryContent.milestoneTracking.map((s, idx) => <li key={idx}>{s}</li>)}
                            </ul>
                          </div>
                        )}
                        {activeRescuePlan.categoryContent.habitIntegration && (
                          <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-2">
                            <span className="font-extrabold text-purple-400 block text-[9px] uppercase tracking-widest">Habit Stacking Models</span>
                            <ul className="space-y-1 pl-3 list-disc text-[11px] text-[#94A3B8]">
                              {activeRescuePlan.categoryContent.habitIntegration.map((s, idx) => <li key={idx}>{s}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                </div>

                {/* 3. Bento Multi-Dimensional Recommendation Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  
                  {/* Left: Critical vs Optional vs Recommended Actions (Col span 7) */}
                  <div className="md:col-span-7 space-y-4">
                    
                    {/* Critical Tasks */}
                    <div className="p-4 rounded-2xl bg-red-950/20 border border-red-500/20 space-y-2">
                      <span className="block text-[10px] text-red-400 font-extrabold uppercase tracking-widest">CRITICAL TASKS (MUST-DO IMMEDATELY)</span>
                      <ul className="space-y-1.5">
                        {(activeRescuePlan.criticalTasks ?? []).map((t, i) => (
                          <li key={i} className="text-xs text-white flex items-start gap-2">
                            <span className="text-red-500 font-bold">▪</span>
                            <span className="font-medium">{t}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Recommended Actions */}
                    <div className="p-4 rounded-2xl bg-purple-950/15 border border-purple-500/20 space-y-2">
                      <span className="block text-[10px] text-purple-400 font-extrabold uppercase tracking-widest">RECOMMENDED STRATEGIES</span>
                      <ul className="space-y-1.5">
                        {(activeRescuePlan.recommendedActions ?? []).map((t, i) => (
                          <li key={i} className="text-xs text-white flex items-start gap-2">
                            <span className="text-purple-400 font-bold">▪</span>
                            <span className="font-medium">{t}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Optional Tasks */}
                    <div className="p-4 rounded-2xl bg-slate-900/50 border border-white/5 space-y-2">
                      <span className="block text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">OPTIONAL ITEMS TO IGNORE / DEFER</span>
                      <ul className="space-y-1.5">
                        {(activeRescuePlan.optionalTasks ?? []).map((t, i) => (
                          <li key={i} className="text-xs text-slate-400 flex items-start gap-2 line-through decoration-slate-600">
                            <span className="text-slate-500 font-bold">▪</span>
                            <span>{t}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                  </div>

                  {/* Right: Time Allocation (Col span 5) */}
                  <div className="md:col-span-5 p-4 rounded-2xl bg-[#1E293B]/40 border border-white/5 flex flex-col justify-between space-y-3">
                    <div>
                      <span className="block text-[10px] text-blue-400 font-extrabold uppercase tracking-widest mb-1">TIME ALLOCATION BREAKDOWN</span>
                      <p className="text-[11px] text-[#94A3B8] leading-tight">Recommended distribution of preparation hours.</p>
                    </div>

                    <div className="space-y-3 py-2">
                      {(activeRescuePlan.timeAllocation ?? []).map((item, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs text-white font-medium">
                            <span className="truncate max-w-[200px]">{item.activity}</span>
                            <span className="font-mono text-[11px] text-blue-400">{item.hours}h ({item.percentage}%)</span>
                          </div>
                          <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" 
                              style={{ width: `${item.percentage}%` }} 
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-300 text-center">
                      Execution total hours mapped to current remaining deadline timeframe.
                    </div>
                  </div>

                </div>

                {/* 4. Muting Protocols & Hourly Steps */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-[#94A3B8] uppercase">IMMEDIATE MUTING PROTOCOLS</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {activeRescuePlan.priorityActions?.map((action, idx) => (
                      <div key={idx} className="p-3 bg-white/5 border border-white/5 text-xs text-white rounded-xl font-medium">
                        ▪ {action}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recovery Roadmap & Hour-By-Hour plan details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  {/* Stages Roadmap */}
                  <div className="space-y-2.5">
                    <span className="block text-[10px] font-bold text-[#94A3B8] uppercase">TRIAGE ROADMAP STAGES</span>
                    <div className="space-y-2 max-h-[170px] overflow-y-auto pr-1">
                      {activeRescuePlan.recoveryRoadmap?.map((stage, idx) => (
                        <div key={idx} className="p-3 bg-black/40 border border-white/5 rounded-xl text-xs space-y-1">
                          <div className="flex justify-between font-bold text-white leading-tight">
                            <span>{stage.stage}</span>
                            <span className="text-red-400 font-mono text-[10px]">{stage.duration}</span>
                          </div>
                          <p className="text-[#94A3B8] font-light leading-snug">{stage.action}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Hour-By-Hour plan */}
                  <div className="space-y-2.5">
                    <span className="block text-[10px] font-bold text-[#94A3B8] uppercase">HOUR-BY-HOUR CRITICAL INTERVALS</span>
                    <div className="space-y-2 max-h-[170px] overflow-y-auto pr-1">
                      {activeRescuePlan.hourByHourPlan?.map((interval, idx) => (
                        <div key={idx} className="p-2 bg-black/40 border border-white/5 rounded-xl text-xs flex gap-2">
                          <span className="font-mono text-[9px] bg-[#EF4444]/10 text-[#EF4444] px-1.5 py-0.5 rounded h-fit shrink-0">
                            {interval.hour}
                          </span>
                          <div>
                            <p className="font-bold text-white leading-snug">{interval.task}</p>
                            <span className="text-[9px] text-red-300 uppercase font-bold tracking-widest">
                              Intensity: {interval.intensity}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>

              {/* Decline or Accept Strategy */}
              <div className="p-6 border-t border-white/5 bg-[#1E293B]/60 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
                <div className="text-xs text-[#94A3B8] leading-tight text-center sm:text-left">
                  <span className="block font-bold text-white">Recommended intervals: {activeRescuePlan.focusSessions} Pomodoros</span>
                  Execute immediately to guarantee calculated completion metrics.
                </div>
                
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => { setActiveRescuePlan(null); setRescuingDeadline(null); }}
                    className="flex-1 sm:flex-initial px-4 py-2.5 bg-white/5 hover:bg-white/10 text-xs text-[#94A3B8] font-medium rounded-xl cursor-pointer"
                  >
                    Abort Lifeboat
                  </button>
                  <button
                    onClick={handleAcceptRescueSurvival}
                    className="flex-grow sm:flex-initial px-5 py-2.5 bg-green-600 hover:bg-green-700 hover:shadow-lg hover:shadow-green-500/20 text-xs font-bold text-white uppercase tracking-widest rounded-xl cursor-pointer animate-pulse hover:animate-none"
                  >
                    Activate Recovery Shield
                  </button>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Spinner Overlay while Auth is Loading on load */}
      {authLoading && (
        <div className="fixed inset-0 bg-[#0B1020] flex flex-col items-center justify-center z-[200]">
          <div className="w-12 h-12 rounded-full border-t-2 border-r-2 border-[#7C3AED] animate-spin" />
          <h2 className="text-sm font-semibold tracking-widest text-[#C084FC] mt-4 animate-pulse">
            LOADING SECURE WORKSPACE
          </h2>
        </div>
      )}
    </div>
  );
}
