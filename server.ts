import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-loaded Gemini AI client
let aiClient: GoogleGenAI | null = null;
let currentApiKey: string | undefined = undefined;

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
    aiClient = null;
    currentApiKey = undefined;
    return null;
  }

  if (!aiClient || currentApiKey !== apiKey) {
    try {
      aiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
      currentApiKey = apiKey;
      console.log("[Gemini Client] Initialized successfully with current API key.");
    } catch (e) {
      console.error("Failed to initialize GoogleGenAI with key:", e);
      aiClient = null;
      currentApiKey = undefined;
    }
  }
  return aiClient;
}

// -------------------------------------------------------------
// SECURE SERVER-SIDE GEMINI HANDLERS & SYNTHETIC DATA FALLBACK
// -------------------------------------------------------------

// Simple in-memory cache to prevent hitting Gemini API limits on routine user navigation/reloads
const apiCache = new Map<string, { data: any; expiry: number }>();

function getCached(key: string): any | null {
  const cached = apiCache.get(key);
  if (cached) {
    if (Date.now() < cached.expiry) {
      return cached.data;
    }
    apiCache.delete(key);
  }
  return null;
}

function setCached(key: string, data: any, ttlMs: number = 10 * 60 * 1000) { // 10 minutes default TTL
  apiCache.set(key, { data, expiry: Date.now() + ttlMs });
}

// Global circuit breaker cooldown timestamp
let geminiCoolDownUntil = 0;

async function callGeminiSafe<T>(
  cacheKey: string,
  promptGenerator: () => any,
  mimeType: "application/json" | "text/plain",
  fallbackGenerator: () => T,
  serviceName: string
): Promise<T> {
  // Check cache first
  const cached = getCached(cacheKey);
  if (cached) {
    console.log(`[Cache Hit] Serving ${serviceName} from local cache.`);
    return cached as T;
  }

  // Check circuit breaker status
  if (Date.now() < geminiCoolDownUntil) {
    console.info(`[Circuit Breaker Active] Bypassing Gemini API for ${serviceName} (Cooling down). Utilizing high-fidelity simulation engine.`);
    const fb = fallbackGenerator();
    setCached(cacheKey, fb, 2 * 60 * 1000); // 2 minutes transient hold
    return fb;
  }

  const ai = getAiClient();
  if (ai) {
    const modelsToTry = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-3.5-flash"];
    let attempts = 3;
    let delay = 1000;
    while (attempts > 0) {
      let lastErr: any = null;
      let success = false;
      
      for (const modelName of modelsToTry) {
        try {
          const prompt = promptGenerator();
          const config: any = {};
          if (mimeType === "application/json") {
            config.responseMimeType = "application/json";
          }
          
          console.log(`[Gemini Request] Attempting service ${serviceName} with model ${modelName}...`);
          const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config
          });

          const responseText = response.text || "{}";
          let result: any = responseText;
          if (mimeType === "application/json") {
            const cleaned = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
            result = JSON.parse(cleaned);
          }

          // Cache historical success of Gemini
          setCached(cacheKey, result);
          return result as T;
        } catch (err: any) {
          lastErr = err;
          const errStr = (err?.message || "").toLowerCase();
          console.warn(`[Gemini Model Error] Model ${modelName} failed for ${serviceName}:`, err?.message || err);
          
          // Continue to try other models in this loop
          continue;
        }
      }

      // If we reach here, all models in modelsToTry failed in this iteration.
      attempts--;
      const errStr = (lastErr?.message || "").toLowerCase();
      const isRateLimit = errStr.includes("429") || errStr.includes("quota") || errStr.includes("limit") || lastErr?.status === "RESOURCE_EXHAUSTED" || lastErr?.statusCode === 429;
      const isTemporary = errStr.includes("503") || errStr.includes("demand") || errStr.includes("unavailable") || lastErr?.status === "UNAVAILABLE" || lastErr?.statusCode === 503;
      
      if (isRateLimit || isTemporary) {
        // Trigger circuit breaker cooldown immediately to prevent future requests from hanging/stalling
        geminiCoolDownUntil = Date.now() + 60 * 1000; // Cool down for 60 seconds
        console.warn(`[Circuit Breaker Triggered] Service ${serviceName} encountered temporary limit/rate-limiting on all models. Cooling down for 60s.`);
      }

      if (attempts > 0 && (isRateLimit || isTemporary)) {
        console.warn(`[Gemini Retry] Service ${serviceName} encountered temporary limit/error. Retrying all models in ${delay}ms... (${attempts} remaining)`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      } else {
        console.info(`[Gemini Safe fallback] Gracefully employing local high-fidelity simulation engine for ${serviceName}.`);
        break;
      }
    }
  }

  // Gracefully degrade to offline local simulation & cache it briefly to avoid re-thrashing a blocked endpoint
  const fb = fallbackGenerator();
  setCached(cacheKey, fb, 2 * 60 * 1000); // 2 minutes transient hold
  return fb;
}

// GET API Key verification endpoint
app.get("/api/check-api-key", async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
    return res.json({ 
      status: "missing", 
      message: "Your Gemini API Key is not set or is still the default placeholder." 
    });
  }

  // Mask the key for display safety
  const trimmed = apiKey.trim();
  const maskedKey = trimmed.length > 8 
    ? `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`
    : "***";

  try {
    const ai = getAiClient();
    if (!ai) {
      return res.json({ 
        status: "error", 
        message: "Failed to initialize Gemini Client with the provided key.",
        maskedKey
      });
    }

    console.log(`[Diagnostic] Executing diagnostic validation request with Gemini key ending in ${trimmed.slice(-4)}`);
    
    const modelsToTry = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-3.5-flash"];
    let lastError = null;
    let successfulModel = "";
    let text = "";

    for (const modelName of modelsToTry) {
      try {
        console.log(`[Diagnostic] Trying model ${modelName}...`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: "Respond with exactly the single word 'OK'.",
        });
        text = (response.text || "").trim();
        successfulModel = modelName;
        lastError = null;
        break; // Success! Break the loop
      } catch (err: any) {
        lastError = err;
        console.warn(`[Diagnostic] Model ${modelName} failed during verification:`, err?.message || err);
      }
    }

    if (successfulModel) {
      // Clear the local cache to allow fresh queries using the now active key
      apiCache.clear();
      geminiCoolDownUntil = 0; // Reset cooldown
      console.log("[Diagnostic] Gemini key verified! Local cache and circuit breaker cleared.");

      return res.json({
        status: "success",
        message: `API Key verified! Successfully connected to Gemini API using model: ${successfulModel}.`,
        maskedKey,
        responseText: text,
        modelUsed: successfulModel
      });
    } else {
      return res.json({
        status: "error",
        message: "All attempted Gemini models failed to authenticate or connect.",
        maskedKey,
        details: lastError?.message || String(lastError)
      });
    }
  } catch (err: any) {
    console.error("Gemini API Verification Error:", err);
    return res.json({
      status: "error",
      message: "The API key verification process encountered an unhandled error.",
      maskedKey,
      details: err?.message || String(err)
    });
  }
});

// Post-onboarding / Dashboard daily overview scorer
app.post("/api/rescue-score-analysis", async (req, res) => {
  const { deadlines = [] } = req.body;

  // Build client stable payload key
  const normalizedList = deadlines.map((d: any) => ({
    id: d.id,
    title: d.title,
    date: d.date,
    progress: d.progress,
    priority: d.priority,
    estimatedEffort: d.estimatedEffort
  }));
  const cacheKey = "rescue_analysis_" + JSON.stringify(normalizedList);

  const promptGenerator = () => `
    Analyze the following user deadlines and generate a status dashboard response.
    Deadlines: ${JSON.stringify(normalizedList)}
    
    Return a valid JSON object matching the schema:
    {
      "score": number (0 to 100 representing overall DeadlineHero recovery/safety score. A low score means high risk across multiple deadlines),
      "status": "SAFE" | "AT RISK" | "CRITICAL",
      "dailyBriefing": {
        "priorities": string[],
        "riskAlerts": string[],
        "recommendedActions": string[],
        "focusAreas": string[]
      }
    }
    Do not wrap in markdown blocks, must return pure valid JSON. If deadlines list is empty, default to a fresh onboarding score of 80 ("SAFE") with supportive briefing.
  `;

  const fallbackGenerator = () => {
    let score = 82;
    let status: "SAFE" | "AT RISK" | "CRITICAL" = "SAFE";

    if (deadlines.length > 0) {
      const criticalCount = deadlines.filter((d: any) => d.priority === "CRITICAL" || d.priority === "HIGH").length;
      const progressAvg = deadlines.reduce((acc: number, cur: any) => acc + (cur.progress || 0), 0) / deadlines.length;

      if (criticalCount > 1 || progressAvg < 30) {
        score = Math.floor(15 + Math.random() * 20);
        status = "CRITICAL";
      } else if (criticalCount > 0 || progressAvg < 60) {
        score = Math.floor(40 + Math.random() * 15);
        status = "AT RISK";
      } else {
        score = Math.floor(75 + Math.random() * 20);
        status = "SAFE";
      }
    }

    const briefings: Record<string, { priorities: string[]; riskAlerts: string[]; recommendedActions: string[]; focusAreas: string[] }> = {
      SAFE: {
        priorities: ["Keep maintaining momentum on active projects", "Review next week's assignments early"],
        riskAlerts: ["No critical deadlines at immediate threat. Keep it up!"],
        recommendedActions: ["Maintain normal focus sessions of 45 mins", "Refine study briefs for upcoming exams"],
        focusAreas: ["Core milestones", "Continuous progression"]
      },
      "AT RISK": {
        priorities: ["Accelerate milestones for closest deadlines", "Cut non-essential auxiliary components", "Consolidate MVP features"],
        riskAlerts: ["Close deadline with lower progress detected!", "Procrastination loop predicted"],
        recommendedActions: ["Lock into 'Focus Mode' (deep work, no devices)", "Complete task decomposition immediately"],
        focusAreas: ["Critical path tasks", "Prototyping MVP"]
      },
      CRITICAL: {
        priorities: ["ACTIVATE PANIC MODE IMMEDIATELY", "Eliminate all secondary features", "Deploy skeleton architecture in 4 hours"],
        riskAlerts: ["Extreme high risk of deadline failure detected!", "Remaining hours insufficient for normal pace"],
        recommendedActions: ["Execute Hour-by-Hour save plan", "Delegate or drop non-essential requirements", "Minimize breaks to strict 10m intervals"],
        focusAreas: ["Core functioning logic", "Working deployment", "Presentation outline"]
      }
    };

    const fallbackBriefing = briefings[status];

    return {
      score,
      status,
      dailyBriefing: fallbackBriefing
    };
  };

  const result = await callGeminiSafe(cacheKey, promptGenerator, "application/json", fallbackGenerator, "rescue-score-analysis");
  return res.json(result);
});

// Risk Engine analysis (calculates risks & does task decomposition, simulator timelines)
app.post("/api/risk-engine", async (req, res) => {
  const { title, date, progress = 0, priority = "MEDIUM", estimatedEffort = 5 } = req.body;
  const cacheKey = `risk_engine_${title}_${date}_${progress}_${priority}_${estimatedEffort}`;

  const promptGenerator = () => `
    You are DeadlineHero AI, the autonomous recovery agent.
    Analyze this deadline and calculate precise telemetry:
    Title: "${title}"
    Due: ${date}
    Current Progress: ${progress}%
    Priority: ${priority}
    Estimated Effort needed: ${estimatedEffort} (scale 1-10)

    Generate a complete risk audit and rescue strategy in strict JSON.
    JSON format:
    {
      "failureRisk": number (0 to 100),
      "successProbability": number (0 to 100),
      "urgencyScore": number (0 to 100),
      "recoveryPotential": number (0 to 100),
      "tasks": [
        { "title": "...", "category": "Research"|"Design"|"Development"|"Testing"|"Deployment"|"Presentation", "estimatedTime": "e.g., 2 hours", "difficulty": "Low"|"Medium"|"High", "priority": "Low"|"Medium"|"High", "status": "TODO" }
      ],
      "scheduler": [
        { "time": "7:00 PM", "task": "...", "type": "work"|"break" },
        { "time": "8:30 PM", "task": "Take a mental reset", "type": "break" }
      ],
      "futureSelf": {
        "timelineA": [
          { "step": "Phase 1: Delay Action", "description": "Continuing to put off the hard work...", "consequence": "Panic levels rise" },
          { "step": "Phase 2: Last-minute Rush", "description": "Trying to build everything in 2 hours...", "consequence": "Catastrophic crash/unhandled errors" },
          { "step": "Phase 3: Missed Deadline", "description": "Failure to submit, zero marks/lost client", "consequence": "Anxiety and regret" }
        ],
        "timelineB": [
          { "step": "Phase 1: Run AI Blueprint", "description": "Accepting the modular breakdown today...", "consequence": "Stress drops by 60%" },
          { "step": "Phase 2: Incremental Milestone", "description": "Completing MVP deployment first...", "consequence": "Success probability increases" },
          { "step": "Phase 3: Secure Submit", "description": "Polished presentation fully delivered...", "consequence": "Victory and relief" }
        ]
      },
      "coachAdvice": "string (direct, powerful, encouraging productivity advice written as a high-intensity coach)"
    }
    Must be pure valid JSON, no markdown formatting.
  `;

  const fallbackGenerator = () => {
    const daysDiff = Math.max(1, Math.round((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    let failureRisk = Math.min(98, Math.max(5, Math.floor((100 - progress) * (priority === "CRITICAL" ? 1.3 : priority === "HIGH" ? 1.1 : 0.8) / Math.max(0.5, daysDiff))));
    if (progress >= 100) failureRisk = 0;

    const successProbability = 100 - failureRisk;
    const urgencyScore = Math.min(100, Math.floor(100 / Math.max(0.5, daysDiff)) + (priority === "CRITICAL" ? 20 : 5));
    const recoveryPotential = Math.min(95, Math.max(20, Math.floor(progress * 0.4 + (100 - failureRisk) * 0.6)));

    const derivedTasks = [
      { title: `Core structural research for ${title}`, category: "Research", estimatedTime: "1.5 hours", difficulty: "Medium", priority: "High", status: "TODO" },
      { title: `Architectural design blueprint`, category: "Design", estimatedTime: "1 hour", difficulty: "Low", priority: "Medium", status: "TODO" },
      { title: `Build functional prototype MVP`, category: "Development", estimatedTime: "4 hours", difficulty: "High", priority: "High", status: "TODO" },
      { title: `Validate endpoints and edge cases`, category: "Testing", estimatedTime: "1 hour", difficulty: "Medium", priority: "Medium", status: "TODO" },
      { title: `Deploy to production hosting container`, category: "Deployment", estimatedTime: "45 mins", difficulty: "Medium", priority: "High", status: "TODO" },
      { title: `Construct visual slides & demo pitch`, category: "Presentation", estimatedTime: "2 hours", difficulty: "Low", priority: "High", status: "TODO" }
    ];

    const derivedSchedule = [
      { time: "07:00 PM", task: "Kickoff: Deep technical asset setup & initial research", type: "work" },
      { time: "08:15 PM", task: "Quick reset: Drink water, stretch legs", type: "break" },
      { time: "08:30 PM", task: "Development: Speed build of core functionalities and logic", type: "work" },
      { time: "10:00 PM", task: "Break: Physical shift, adjust lighting", type: "break" },
      { time: "10:15 PM", task: "Verification: Run deployment commands and debug tests", type: "work" },
      { time: "11:00 PM", task: "Refinement: Polish visual pitch & slides layout", type: "work" }
    ];

    return {
      failureRisk,
      successProbability,
      urgencyScore,
      recoveryPotential,
      tasks: derivedTasks,
      scheduler: derivedSchedule,
      futureSelf: {
        timelineA: [
          { "step": "Continue Procrastinating", "description": "Delaying starting the task to check social media or scroll.", "consequence": "Zero code written, anxiety peaks, risk spikes to 95%" },
          { "step": "Panic & Overwhelm", "description": "4 hours before due-time, attempts to write everything at once.", "consequence": "Extreme fatigue, broken builds, missed critical configurations" },
          { "step": "Miss submission deadline", "description": "Failing to submit. System crashes lastminute, no backup plan.", "consequence": "Bitter failure, loss of trust, and immediate rejection" }
        ],
        timelineB: [
          { "step": "Commit to the Hero Plan", "description": "Taking the decomposed tasks generated by DeadlineHero AI immediately.", "consequence": "Immediate clarity, mental focus, risk falls to 20%" },
          { "step": "Build MVP Skeleton", "description": "Deploying the bare minimum functional baseline to Cloud Run.", "consequence": "Safety net secured! Even a partial submission gets solid points" },
          { "step": "Polish & Polish Demo", "description": "Confidently delivering a clean presentation with no pressure.", "consequence": "Outstanding victory, praise from peers, and hackathon top ranks" }
        ]
      },
      coachAdvice: `Listen to me carefully. Your failure risk for '${title}' is sitting at ${failureRisk}%. Do not look away. This is either your wakeup call or your tombstone. Start with the decomposed 'Research' phase right now, lock your phone in another room, and let's get you over that finish line!`
    };
  };

  const result = await callGeminiSafe(cacheKey, promptGenerator, "application/json", fallbackGenerator, "risk-engine");
  return res.json(result);
});

// FEATURE 2: 🚨 SAVE MY DEADLINE (Emergency Rescue Button)
// Helper to classify deadlines into 8 required categories
function detectCategory(title: string): "Exam" | "Assignment" | "Interview" | "Hackathon" | "Project" | "Meeting" | "Bill Payment" | "Personal Goal" {
  const t = (title || "").toLowerCase();
  if (t.includes("exam") || t.includes("test") || t.includes("quiz") || t.includes("midterm") || t.includes("final") || t.includes("study") || t.includes("revision") || t.includes("course")) {
    return "Exam";
  }
  if (t.includes("interview") || t.includes("mock") || t.includes("hiring") || t.includes("recruiter") || t.includes("career") || t.includes("job") || t.includes("screening")) {
    return "Interview";
  }
  if (t.includes("hackathon") || t.includes("hack") || t.includes("jam") || t.includes("devpost") || t.includes("ideathon")) {
    return "Hackathon";
  }
  if (t.includes("meeting") || t.includes("sync") || t.includes("standup") || t.includes("briefing") || t.includes("call") || t.includes("presentation") || t.includes("review") || t.includes("demo")) {
    return "Meeting";
  }
  if (t.includes("bill") || t.includes("payment") || t.includes("pay") || t.includes("rent") || t.includes("invoice") || t.includes("subscription") || t.includes("tax")) {
    return "Bill Payment";
  }
  if (t.includes("assignment") || t.includes("homework") || t.includes("essay") || t.includes("report") || t.includes("paper") || t.includes("turn in") || t.includes("submit") || t.includes("pset") || t.includes("p-set")) {
    return "Assignment";
  }
  if (t.includes("project") || t.includes("mvp") || t.includes("app") || t.includes("website") || t.includes("feature") || t.includes("build") || t.includes("deploy") || t.includes("repo") || t.includes("v1")) {
    return "Project";
  }
  return "Personal Goal";
}

// Calculate dynamic available days and hours remaining
function calculateTimeRemaining(deadlineStr: string, currentDateOverride?: string) {
  const now = currentDateOverride ? new Date(currentDateOverride) : new Date();
  
  const deadlineDate = new Date(deadlineStr);
  deadlineDate.setHours(0, 0, 0, 0);
  
  const todayDate = new Date(now);
  todayDate.setHours(0, 0, 0, 0);
  
  const diffTime = deadlineDate.getTime() - todayDate.getTime();
  let daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (daysRemaining <= 0) {
    daysRemaining = 1;
  }
  
  const deadlineDateFull = new Date(deadlineStr + "T23:59:59");
  const diffMs = deadlineDateFull.getTime() - now.getTime();
  const hoursRemaining = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));
  
  const pad = (n: number) => n.toString().padStart(2, "0");
  const currentDateFormatted = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  
  return {
    currentDate: currentDateFormatted,
    deadlineDate: deadlineStr,
    daysRemaining,
    hoursRemaining
  };
}

// Generate premium, highly structured fallbacks matching user requirements
function getCategoryFallbackPlan(
  title: string,
  progress: number,
  priority: string,
  estimatedEffort: number,
  userId: string = "demo",
  daysRemaining: number = 3,
  hoursRemaining: number = 72
) {
  const category = detectCategory(title);
  
  // Dynamic metrics calculations
  const failureRisk = Math.max(15, Math.min(95, 100 - progress - (10 - estimatedEffort) * 3));
  const successProbability = Math.max(25, Math.min(98, progress + 25 + (10 - estimatedEffort) * 2));
  const recoveryPotential = Math.max(30, Math.min(95, 90 - (estimatedEffort * 4) + (progress * 0.2)));
  
  const beforeSuccessRate = Math.round(100 - failureRisk);
  const afterSuccessRate = Math.round(successProbability);
  const focusSessions = Math.max(4, Math.round(estimatedEffort * 1.5));
  
  let categoryContent: any = {};
  let criticalTasks: string[] = [];
  let optionalTasks: string[] = [];
  let recommendedActions: string[] = [];
  let timeAllocation: Array<{ activity: string; hours: number; percentage: number }> = [];
  let priorityActions: string[] = [];
  let recoveryRoadmap: Array<{ stage: string; action: string; duration: string }> = [];
  let hourByHourPlan: Array<{ hour: string; task: string; intensity: string }> = [];

  const effortText = estimatedEffort >= 8 ? "Extreme" : estimatedEffort >= 5 ? "Moderate" : "Light";
  const progressText = progress >= 75 ? "High" : progress >= 40 ? "Steady" : "Lagging";

  if (daysRemaining <= 1) {
    // Available days = 1
    // Generate: Emergency Plan & Hour-by-hour schedule
    criticalTasks = [
      `Initiate emergency speed run for "${title}"`,
      "Mute all social feeds and phone notifications immediately",
      "Draft a single, raw sheet of crucial formulas or key concepts"
    ];
    optionalTasks = [
      "Avoid reading full textbook chapters or secondary source materials",
      "Do not spend time on cosmetic layouts or design decorations"
    ];
    recommendedActions = [
      "Take a 5-minute active walk every 50 minutes to maintain high cognitive focus",
      "Sleep at least 6 hours to facilitate emergency memory retention"
    ];
    timeAllocation = [
      { activity: "High-Priority Concept Triage", hours: Math.min(hoursRemaining, 4), percentage: 50 },
      { activity: "Active Recall & Timed Tests", hours: Math.min(hoursRemaining, 2.5), percentage: 30 },
      { activity: "Core Cheatsheet Drafting", hours: Math.min(hoursRemaining, 1.5), percentage: 20 }
    ];
    priorityActions = [
      "Isolate top 3 topics",
      "Eliminate phone distractions",
      "Construct a 1-page cheat sheet"
    ];
    recoveryRoadmap = [
      { stage: "Stage 1: Core Diagnostics", action: `Pinpoint top conceptual holes in "${title}".`, duration: "45 mins" },
      { stage: "Stage 2: High-Yield Sprint", action: "Cover the 3 highest weight items with pure focus.", duration: "120 mins" },
      { stage: "Stage 3: Timed Fire Drill", action: "Practice mock questions or build core layouts under strict limits.", duration: "60 mins" }
    ];
    hourByHourPlan = [
      { hour: "Hour 1-2", task: `Build core layout or summarize critical ${category} concepts.`, intensity: "High" },
      { hour: "Hour 3-4", task: "Solve active recall questions and test core inputs.", intensity: "High" },
      { hour: "Hour 5", task: "Run a full simulation test without notes or assist tools.", intensity: "Medium" }
    ];

    if (category === "Exam") {
      categoryContent = {
        studySchedule: [
          { day: "Day 1 (Emergency Plan)", topics: [`Review top 3 highest weight conceptual lectures for ${title}`, "Map critical formulas"], duration: "5 hours" }
        ],
        topicPrioritization: [
          { topic: `${title} - Fundamental Theories`, weight: "Critical", strategy: "Focus solely on highest yield concepts." }
        ],
        revisionStrategy: [
          "Flashcard testing: space recall review blocks at 2 hours and 5 hours post coverage."
        ]
      };
    } else if (category === "Assignment") {
      categoryContent = {
        researchOutline: [`Identify 2 central sources for ${title} argument outline`],
        draftDrafting: ["Write introduction and raw body arguments under strict clock"],
        editingRound: ["Rapid proofreading block to check reference lines"],
        referenceChecking: ["Verify direct APA citation formats"]
      };
    } else if (category === "Interview") {
      categoryContent = {
        mockInterviewPlan: ["Run 1 recorded voice practice answering common prompts"],
        questionPreparation: [{ question: "Describe a high pressure challenge.", focus: "STAR structure: Action and direct result." }],
        skillRoadmap: ["Review highest priority systems architecture concepts"]
      };
    } else if (category === "Hackathon") {
      categoryContent = {
        mvpRoadmap: [{ feature: "Build minimal core layout", complexity: "Low", priority: "CRITICAL" }],
        featurePrioritization: ["Prune all settings, secondary dashboards, and visual charts"],
        demoPreparation: ["Record a rapid 60-second screen walkthrough video"],
        submissionChecklist: ["Validate dependencies compile correctly and push build"]
      };
    } else if (category === "Project") {
      categoryContent = {
        taskDecomposition: [{ subtask: `Setup structural files and schemas for "${title}"`, eta: "2 hours", complexity: "High" }],
        milestones: [{ milestone: "Assemble functional main views", dueDate: "Day 1" }],
        deliveryPlan: ["Adopt strict local-branch iteration; avoid multi-module conflicts."]
      };
    } else if (category === "Meeting") {
      categoryContent = {
        agendaCreation: ["Detail 2 key presentation takeaways"],
        talkingPoints: ["Present core deliverables of work blocks"],
        actionItemTracker: ["Assign ownership tickets directly on task board"]
      };
    } else if (category === "Bill Payment") {
      categoryContent = {
        budgetOptimization: ["Examine bill statements to spot unrequested subscription items"],
        cashflowSchedule: ["Confirm deposit dates align with current payments"],
        autoPaySetup: ["Configure warning alerts for immediate transaction pings"]
      };
    } else { // Personal Goal
      categoryContent = {
        actionSteps: [`Take the absolute simplest 10-minute initial step for "${title}"`],
        milestoneTracking: ["Log percentage completion marker"],
        habitIntegration: ["Stack action block immediately following current morning desk routine"]
      };
    }

  } else if (daysRemaining <= 3) {
    // Available days = 2-3
    // Generate: Daily rescue plan & High-priority focus only
    criticalTasks = [
      `Execute high-priority daily focus blocks on "${title}"`,
      "De-clutter desk and close distraction tabs on desktop",
      "Run targeted practice diagnostics on weakest chapters"
    ];
    optionalTasks = [
      "Ignore formatting polish or advanced styling variations",
      "De-prioritize supplementary reference sheets"
    ];
    recommendedActions = [
      "Use Pomodoro rounds: 45 minutes study followed by 10 minutes recharge",
      "Share active milestone metrics with a study or work companion"
    ];
    timeAllocation = [
      { activity: "High-Priority Focus Blocks", hours: Math.min(hoursRemaining, 8), percentage: 55 },
      { activity: "Active Testing Practice", hours: Math.min(hoursRemaining, 3.6), percentage: 25 },
      { activity: "Topic Gap Remediation", hours: Math.min(hoursRemaining, 2.9), percentage: 20 }
    ];
    priorityActions = [
      "Establish 4-hour focus block",
      "Outline core study sections",
      "Configure web blocks for work"
    ];
    recoveryRoadmap = [
      { stage: "Day 1: Diagnostics", action: `Pinpoint exact pain points in "${title}" syllabus or scope.`, duration: "60 mins" },
      { stage: "Day 2: High-Yield Sprint", action: "Focus study exclusively on identified critical topics.", duration: "180 mins" },
      { stage: "Day 3: Practice Drills", action: "Take active mock exams and self-score response gaps.", duration: "90 mins" }
    ];
    hourByHourPlan = [
      { hour: "Day 1", task: `Map fundamental theories and review core concepts for ${title}.`, intensity: "High" },
      { hour: "Day 2", task: "Execute intense problem solving sets on critical areas.", intensity: "High" },
      { hour: "Day 3", task: "Conduct mock timed recall exams and review weak responses.", intensity: "Medium" }
    ];

    if (category === "Exam") {
      categoryContent = {
        studySchedule: [
          { day: "Day 1 (Daily Rescue Plan)", topics: ["Review core conceptual lectures", "Formulate memory mappings"], duration: "3 hours" },
          { day: `Day ${daysRemaining} (High-Priority Focus Only)`, topics: ["Complete full diagnostics test paper", "Correct specific weaknesses"], duration: "2.5 hours" }
        ],
        topicPrioritization: [
          { topic: `${title} - Fundamental Core`, weight: "High", strategy: "Memorize structural equations." }
        ],
        revisionStrategy: ["Space active review blocks 1 day post first coverage."]
      };
    } else if (category === "Assignment") {
      categoryContent = {
        researchOutline: ["Collect 3 credible sources to anchor thesis argument"],
        draftDrafting: ["Compose central analytical sections and introduction outline"],
        editingRound: ["Syntactic review: remove duplicate expressions"],
        referenceChecking: ["Cross-verify references and bibliography entries"]
      };
    } else if (category === "Interview") {
      categoryContent = {
        mockInterviewPlan: ["Record voice response answer maps for STAR prompts"],
        questionPreparation: [{ question: "Tell me about a time you solved a bottleneck.", focus: "STAR layout: Emphasize individual leverage." }],
        skillRoadmap: ["Revise tree algorithms, big-O notation rules, and system patterns"]
      };
    } else if (category === "Hackathon") {
      categoryContent = {
        mvpRoadmap: [
          { feature: "Establish essential dashboard layouts", complexity: "Low", priority: "CRITICAL" },
          { feature: "Configure proxy controllers for backend", complexity: "Medium", priority: "CRITICAL" }
        ],
        featurePrioritization: ["Defer additional custom profiles; center main workspace logic"],
        demoPreparation: ["Record clean 2-minute user walkthrough video"],
        submissionChecklist: ["Run code validations and upload workspace deliverables early"]
      };
    } else if (category === "Project") {
      categoryContent = {
        taskDecomposition: [
          { subtask: "Establish data definitions & routes", eta: "2 hours", complexity: "Medium" },
          { subtask: "Integrate core functional views", eta: "3.5 hours", complexity: "High" }
        ],
        milestones: [
          { milestone: "Data structures & types final", dueDate: "Day 1" },
          { milestone: "UI view assembly", dueDate: `Day ${daysRemaining}` }
        ],
        deliveryPlan: ["Leverage local mock endpoints to insulate frontend views from backend delays."]
      };
    } else if (category === "Meeting") {
      categoryContent = {
        agendaCreation: ["Draft 3 strict outcomes for the review session"],
        talkingPoints: ["Prioritize critical performance scores over secondary plans"],
        actionItemTracker: ["Distribute follow-up tasks on main coordination board"]
      };
    } else if (category === "Bill Payment") {
      categoryContent = {
        budgetOptimization: ["Audit credit card statements to isolate and drop unused tiers"],
        cashflowSchedule: ["Ensure incoming cash matches due invoices"],
        autoPaySetup: ["Enable instant payment checks on bank portal"]
      };
    } else { // Personal Goal
      categoryContent = {
        actionSteps: ["Take immediate 15-minute action to cross initial hurdle"],
        milestoneTracking: ["Mark calendar checklist progress points"],
        habitIntegration: ["Schedule active action block on calendar next to high energy hours"]
      };
    }

  } else if (daysRemaining <= 7) {
    // Available days = 4-7
    // Generate: Daily roadmap & Practice sessions & Revision blocks
    criticalTasks = [
      `Establish systematic daily roadmap for "${title}"`,
      "Draft comprehensive lecture / project chapter maps",
      "Run complete diagnostic practice exams or mock integrations"
    ];
    optionalTasks = [
      "Avoid reading peripheral reference books / secondary files",
      "Prune secondary decorative formatting details"
    ];
    recommendedActions = [
      "Incorporate dedicated practice sessions every other day",
      "Configure active revision blocks to re-test tricky content"
    ];
    timeAllocation = [
      { activity: "Practice Sessions & Exercises", hours: Math.min(hoursRemaining, 12), percentage: 45 },
      { activity: "Roadmap Concept Ingestion", hours: Math.min(hoursRemaining, 8), percentage: 30 },
      { activity: "Revision Blocks & Recall", hours: Math.min(hoursRemaining, 6.7), percentage: 25 }
    ];
    priorityActions = [
      "Draft study roadmap",
      "Schedule practice sessions",
      "Configure active revision blocks"
    ];
    recoveryRoadmap = [
      { stage: "Stage 1: Ingestion Phase", action: `Read core materials of "${title}" and construct clear summary cards.`, duration: "120 mins" },
      { stage: "Stage 2: Practice Sessions", action: "Solve high difficulty problem sets without checking solutions.", duration: "180 mins" },
      { stage: "Stage 3: Revision Blocks", action: "Re-test missed topics in systematic spaced intervals.", duration: "90 mins" }
    ];
    hourByHourPlan = [
      { hour: "Day 1-2", task: `Deep dive core materials of "${title}" and build cheat cards.`, intensity: "High" },
      { hour: "Day 3-4", task: "Execute timed practice papers and score weak sections.", intensity: "High" },
      { hour: "Day 5-6", task: "Review weak responses and construct active revision blocks.", intensity: "Medium" }
    ];

    if (category === "Exam") {
      categoryContent = {
        studySchedule: [
          { day: "Day 1-2 (Daily Roadmap)", topics: ["Syllabus overview and cheat-sheet construction"], duration: "2 hours daily" },
          { day: "Day 3-4 (Practice Sessions)", topics: ["Practice diagnostics under pressure", "Self-score gaps"], duration: "2.5 hours daily" },
          { day: `Day 5-${daysRemaining} (Revision Blocks)`, topics: ["Review weak flashcard deck", "Run final calm test"], duration: "1.5 hours daily" }
        ],
        topicPrioritization: [
          { topic: `${title} - High Weight Concepts`, weight: "High", strategy: "Settle complex numerical templates." }
        ],
        revisionStrategy: ["Space recall reviews 1 day and 3 days post first study session."]
      };
    } else if (category === "Assignment") {
      categoryContent = {
        researchOutline: ["Collect 5 authoritative academic papers", "Draft thesis skeleton mapping direct headers"],
        draftDrafting: ["Sprint intro & draft cohesive body arguments focusing on clear transitions"],
        editingRound: ["Review style sheets for punctuation and paragraph flow"],
        referenceChecking: ["Validate all bibliography lines match APA or MLA parameters"]
      };
    } else if (category === "Interview") {
      categoryContent = {
        mockInterviewPlan: ["Run 2 recorded practice sessions answering high frequency behavioral questions"],
        questionPreparation: [
          { question: "Walk me through your resume.", focus: "Focus on impact, growth, and specific technology levers." },
          { question: "Describe a project conflict.", focus: "Highlight communication skills and data-driven resolution." }
        ],
        skillRoadmap: ["Review graph algorithms, database queries, and scalability patterns"]
      };
    } else if (category === "Hackathon") {
      categoryContent = {
        mvpRoadmap: [
          { feature: "Establish dashboard layouts and responsive routes", complexity: "Low", priority: "CRITICAL" },
          { feature: "Setup proxy controllers and cache models", complexity: "Medium", priority: "CRITICAL" },
          { feature: "Incorporate elegant chart visualizers", complexity: "Medium", priority: "HIGH" }
        ],
        featurePrioritization: ["Prune profiles view, focus purely on functional workspace dashboard"],
        demoPreparation: ["Record professional 3-minute happy-path user walkthrough"],
        submissionChecklist: ["Validate clean compilation and submit 1 hour before deadline"]
      };
    } else if (category === "Project") {
      categoryContent = {
        taskDecomposition: [
          { subtask: "Design database schemas and data definitions", eta: "2 hours", complexity: "Medium" },
          { subtask: "Incorporate API routes and mock handlers", eta: "3 hours", complexity: "Medium" },
          { subtask: "Assemble interactive frontend components", eta: "4 hours", complexity: "High" }
        ],
        milestones: [
          { milestone: "Data schema definition final", dueDate: "Day 2" },
          { milestone: "Backend API routes and mocks complete", dueDate: "Day 4" },
          { milestone: "UI integration & lint validation complete", dueDate: `Day ${daysRemaining}` }
        ],
        deliveryPlan: ["Build atomic components and test each modular step to isolate bugs."]
      };
    } else if (category === "Meeting") {
      categoryContent = {
        agendaCreation: ["Identify 4 core coordinate topics and assign presentation leads"],
        talkingPoints: ["Review deliverables progress", "Highlight project bottleneck solutions"],
        actionItemTracker: ["Record action items with clear delivery schedules and owners"]
      };
    } else if (category === "Bill Payment") {
      categoryContent = {
        budgetOptimization: ["Prune redundant subscription tiers and optimize checking accounts"],
        cashflowSchedule: ["Confirm bank account balance fits upcoming billing dates"],
        autoPaySetup: ["Enable alerts for low balance boundaries"]
      };
    } else { // Personal Goal
      categoryContent = {
        actionSteps: ["Execute primary 30-minute action checkpoint tasks"],
        milestoneTracking: ["Update progress logs in tracking journal"],
        habitIntegration: ["Incorporate habit-stacking rules onto calendar slotting"]
      };
    }

  } else {
    // Available days > 7
    // Generate: Weekly plan & Daily milestones & Review checkpoints
    criticalTasks = [
      `Formulate comprehensive weekly plan for "${title}"`,
      "Deconstruct full workload into daily milestones",
      "Establish structured review checkpoints to track pacing"
    ];
    optionalTasks = [
      "Avoid spending excess hours on early-stage trivial details",
      "Defer cosmetic UI styling adjustments to last phase"
    ];
    recommendedActions = [
      "Run complete feedback reviews at every weekly checkpoint",
      "Establish structured rewards for completing daily milestones"
    ];
    timeAllocation = [
      { activity: "Weekly Plan Progress Sprints", hours: Math.min(hoursRemaining, 18), percentage: 40 },
      { activity: "Daily Milestones Exercises", hours: Math.min(hoursRemaining, 13.5), percentage: 30 },
      { activity: "Review Checkpoints & Diagnostics", hours: Math.min(hoursRemaining, 13.5), percentage: 30 }
    ];
    priorityActions = [
      "Draft weekly roadmap",
      "Identify daily milestones",
      "Mark weekly review checkpoints"
    ];
    recoveryRoadmap = [
      { stage: "Week 1: Concept Foundation", action: `Audit all materials of "${title}" to build clear summary cards.`, duration: "180 mins" },
      { stage: "Week 2: Milestones & Drills", action: "Execute targeted practice questions and test integration routes.", duration: "240 mins" },
      { stage: "Week 3: Review Checkpoint", action: "Run a full simulation test to identify and fix residual gaps.", duration: "120 mins" }
    ];
    hourByHourPlan = [
      { hour: "Week 1", task: `Cover foundation topics of "${title}" and build review cards.`, intensity: "Medium" },
      { hour: "Week 2", task: "Execute comprehensive practice paper drills.", intensity: "High" },
      { hour: "Week 3", task: "Review weak areas and run final review checkpoints.", intensity: "Medium" }
    ];

    if (category === "Exam") {
      categoryContent = {
        studySchedule: [
          { day: "Week 1 (Weekly Plan)", topics: [`Comprehensive review of all "${title}" chapters`], duration: "10 hours total" },
          { day: "Week 2 (Daily Milestones)", topics: ["Solve past exam series, focus on multi-chapter problems"], duration: "12 hours total" },
          { day: `Week 3 (Review Checkpoints)`, topics: ["Review tricky topics and run simulation tests"], duration: "6 hours total" }
        ],
        topicPrioritization: [
          { topic: `${title} - Core & Advanced theories`, weight: "Critical", strategy: "Audit complex conceptual structures." }
        ],
        revisionStrategy: ["Spaced recall testing: review material 1 day, 3 days, and 7 days post first exposure."]
      };
    } else if (category === "Assignment") {
      categoryContent = {
        researchOutline: ["Conduct exhaustive literature review and collect 8 key publications"],
        draftDrafting: ["Write complete essay skeleton drafting comprehensive body subsections"],
        editingRound: ["Perform detailed edit rounds to check semantic coherence and syntax flow"],
        referenceChecking: ["Run strict cross-checks on bibliography references and citation matches"]
      };
    } else if (category === "Interview") {
      categoryContent = {
        mockInterviewPlan: ["Record 3 complete practice session answers for behavioral STAR prompts"],
        questionPreparation: [
          { question: "Describe a major technical bottleneck.", focus: "STAR structure: focus on data-centric solutions." },
          { question: "How do you coordinate with multi-discipline teams?", focus: "Demonstrate emotional intelligence and consensus building." }
        ],
        skillRoadmap: ["Study system designs, graph patterns, database locks, and cache strategies"]
      };
    } else if (category === "Hackathon") {
      categoryContent = {
        mvpRoadmap: [
          { feature: "Assemble frontend container structures", complexity: "Low", priority: "CRITICAL" },
          { feature: "Write backend controllers and APIs", complexity: "Medium", priority: "CRITICAL" },
          { feature: "Incorporate chart dashboards", complexity: "Medium", priority: "HIGH" }
        ],
        featurePrioritization: ["Defer additional profiling details; center functional layouts"],
        demoPreparation: ["Draft script and record professional walkthrough video screencast"],
        submissionChecklist: ["Validate compiler scripts run clean and push early to production"]
      };
    } else if (category === "Project") {
      categoryContent = {
        taskDecomposition: [
          { subtask: "Establish data definitions & types", eta: "2 hours", complexity: "Medium" },
          { subtask: "Incorporate API routes and mock handlers", eta: "4 hours", complexity: "Medium" },
          { subtask: "Assemble interactive user views", eta: "5 hours", complexity: "High" }
        ],
        milestones: [
          { milestone: "Data structures & types definition complete", dueDate: "Week 1" },
          { milestone: "Backend API controllers complete", dueDate: "Week 2" },
          { milestone: "UI components integrated & tested", dueDate: `Week 3` }
        ],
        deliveryPlan: ["Build atomic files, test components modularly to isolate bugs."]
      };
    } else if (category === "Meeting") {
      categoryContent = {
        agendaCreation: ["Coordinate speaking schedules and assign presentation leads"],
        talkingPoints: ["Demonstrate current feature outcomes and address bottlenecks"],
        actionItemTracker: ["Detail action tickets with owners and timelines on coordination board"]
      };
    } else if (category === "Bill Payment") {
      categoryContent = {
        budgetOptimization: ["Audit card accounts to prune inactive subscription lines"],
        cashflowSchedule: ["Ensure liquid balances match invoicing dates"],
        autoPaySetup: ["Enable automatic bank transfers with low balance alert boundaries"]
      };
    } else { // Personal Goal
      categoryContent = {
        actionSteps: ["Deconstruct main milestones into daily micro-actions"],
        milestoneTracking: ["Mark calendar checklist points in performance journal"],
        habitIntegration: ["Integrate consistent daily habit blocks on high-energy hours"]
      };
    }
  }

  return {
    id: "plan_" + Date.now(),
    deadlineId: "fallback_" + Date.now(),
    userId,
    category,
    failureRisk,
    successProbability,
    recoveryPotential,
    beforeSuccessRate,
    afterSuccessRate,
    focusSessions,
    categoryContent,
    criticalTasks,
    optionalTasks,
    recommendedActions,
    timeAllocation,
    priorityActions,
    recoveryRoadmap,
    hourByHourPlan
  };
}

app.post("/api/save-deadline", async (req, res) => {
  const { title, date, progress = 0, priority = "MEDIUM", estimatedEffort = 6, userId = "demo" } = req.body;
  
  // Dynamic available time metrics calculation
  const timeMetrics = calculateTimeRemaining(date);
  
  const cacheKey = `save_deadline_${title}_${date}_${progress}_${priority}_${estimatedEffort}_${userId}_${timeMetrics.daysRemaining}`;

  const category = detectCategory(title);

  const promptGenerator = () => `
    You are the Smart Calendar Planner inside DeadlineHero AI.

    Your job is to create realistic, personalized schedules based on deadlines.

    Before generating a plan, you MUST execute these steps:
    Step 1: Calculate Days Remaining = Deadline Date - Current Date
    Days Remaining is calculated as: ${timeMetrics.daysRemaining} days.

    Step 2: Analyze:
    - Task Type: "${category}" (Detected from title "${title}")
    - Available Time: based on calculated ${timeMetrics.hoursRemaining} hours remaining
    - Progress %: ${progress}%
    - Priority: ${priority}
    - Complexity / Estimated Effort: ${estimatedEffort}/10

    Step 3: Generate a realistic schedule.

    RULES:
    - Never generate more days than available (Strictly max ${timeMetrics.daysRemaining} days in any plan).
    - Never use fixed templates. Every plan must be different.
    - Create hour-by-hour schedules when less than 3 days remain.
    - Create day-by-day schedules when more than 3 days remain.
    - Activate Emergency Mode when risk is high (Current Failure Risk estimated at ${100 - progress}%).

    ====================
    EXAMPLE 1 (Hour-by-Hour, < 3 days remain)
    ====================
    INPUT:
    Task: Math Exam
    Deadline: 26 June
    Today: 24 June
    Progress: 20%
    Available Hours: 4 hours/day

    OUTPUT STRUCTURE (equivalent to):
    Days Remaining: 2
    Risk: High
    Success Probability: 42%
    Study Plan:
    Day 1:
      - 6 PM - 8 PM: Algebra
      - 8 PM - 9 PM: Break
      - 9 PM - 11 PM: Calculus
    Day 2:
      - 6 PM - 8 PM: Probability
      - 8 PM - 10 PM: Revision
    Exam Day: Quick Revision
    AI Recommendation: Focus on Algebra and Calculus. Skip low-weightage topics.

    ====================
    EXAMPLE 2 (Day-by-Day, >= 3 days remain)
    ====================
    INPUT:
    Task: Hackathon Submission
    Deadline: 29 June
    Today: 24 June
    Progress: 30%
    Available Hours: 5 hours/day

    OUTPUT STRUCTURE (equivalent to):
    Days Remaining: 5
    Risk: Medium
    Success Probability: 72%
    Study Plan:
    - Day 1: Frontend Development
    - Day 2: Backend Integration
    - Day 3: Testing
    - Day 4: Deployment
    - Day 5: Presentation and Demo
    AI Recommendation: Focus on MVP first. Do not spend time on extra animations.

    ====================
    EXAMPLE 3 (Day-by-Day, >= 3 days remain)
    ====================
    INPUT:
    Task: Job Interview
    Deadline: Friday
    Today: Monday
    Progress: 10%
    Available Hours: 3 hours/day

    OUTPUT STRUCTURE (equivalent to):
    Study Plan:
    - Day 1: Resume Review
    - Day 2: Technical Questions
    - Day 3: Mock Interview
    - Day 4: HR Questions
    Interview Day: Quick Revision
    AI Recommendation: Practice speaking answers out loud.

    ====================
    Your output MUST be a valid JSON matching this schema:
    {
      "category": "${category}",
      "failureRisk": number (0-100),
      "successProbability": number (0-100),
      "recoveryPotential": number (0-100),
      "beforeSuccessRate": number (100 - failureRisk),
      "afterSuccessRate": number (successProbability),
      "focusSessions": number (recommended Pomodoro intervals),
      
      "categoryContent": {
        // Populate fields matching the category "${category}":
        // For "Exam":
        "studySchedule": [ { "day": string, "topics": string[], "duration": string } ], // Maximum ${timeMetrics.daysRemaining} days
        "topicPrioritization": [ { "topic": string, "weight": string, "strategy": string } ],
        "revisionStrategy": string[],
        
        // For "Interview":
        "mockInterviewPlan": string[],
        "questionPreparation": [ { "question": string, "focus": string } ],
        "skillRoadmap": string[],
        
        // For "Hackathon":
        "mvpRoadmap": [ { "feature": string, "complexity": string, "priority": string } ],
        "featurePrioritization": string[],
        "demoPreparation": string[],
        "submissionChecklist": string[],
        
        // For "Project":
        "taskDecomposition": [ { "subtask": string, "eta": string, "complexity": string } ],
        "milestones": [ { "milestone": string, "dueDate": string } ],
        "deliveryPlan": string[],
        
        // For "Meeting":
        "agendaCreation": string[],
        "talkingPoints": string[],
        "actionItemTracker": string[],
        
        // For "Bill Payment":
        "budgetOptimization": string[],
        "cashflowSchedule": string[],
        "autoPaySetup": string[],
        
        // For "Personal Goal":
        "actionSteps": string[],
        "milestoneTracking": string[],
        "habitIntegration": string[],
        
        // For "Assignment":
        "researchOutline": string[],
        "draftDrafting": string[],
        "editingRound": string[],
        "referenceChecking": string[]
      },

      "criticalTasks": string[] (max 3 absolute must-do non-negotiable items),
      "optionalTasks": string[] (max 3 items to completely skip/ignore),
      "recommendedActions": string[] (max 3 items representing AI Recommendations like "Focus on Algebra..." or "Practice speaking answers out loud."),
      "timeAllocation": [ { "activity": string, "hours": number, "percentage": number } ],
      "priorityActions": string[] (max 3 rapid killer steps),
      "recoveryRoadmap": [ { "stage": string, "action": string, "duration": string } ] (exactly 3 stages matching the available days),
      "hourByHourPlan": [ { "hour": string, "task": string, "intensity": "High" | "Medium" | "Low" } ] (detailed hour-by-hour intervals when daysRemaining < 3, else daily focus intervals)
    }

    Keep recommendations and study plan extremely customized to "${title}". Do not wrap response in markdown blocks or backticks. Return pure JSON string.
  `;

  const fallbackGenerator = () => getCategoryFallbackPlan(title, progress, priority, estimatedEffort, userId, timeMetrics.daysRemaining, timeMetrics.hoursRemaining);

  const result = await callGeminiSafe(cacheKey, promptGenerator, "application/json", fallbackGenerator, "save-deadline");
  
  // Explicitly force actual date/time calculations into returned payload
  const finalResult = {
    ...result,
    currentDate: timeMetrics.currentDate,
    deadlineDate: timeMetrics.deadlineDate,
    daysRemaining: timeMetrics.daysRemaining,
    hoursRemaining: timeMetrics.hoursRemaining
  };

  return res.json(finalResult);
});

// FEATURE 8: EXCUSE DETECTOR
app.post("/api/excuse-check", async (req, res) => {
  const { excuse } = req.body;
  const cacheKey = `excuse_check_${(excuse || "").trim().toLowerCase()}`;

  const promptGenerator = () => `
    Analyze this excuse for procrastination/task delay:
    Excuse: "${excuse}"

    Determine patterns, provide humor/tough-love coach advice, and output a strict JSON metric:
    {
      "detectedPatterns": "string (which cognitive distortion or procrastination archetype is being used)",
      "procrastinationScore": number (0 to 100 representing severe avoidance behavior),
      "delayProbability": number (e.g. 0 to 100 indicating likelihood of actual deferral),
      "coachAdvice": "string (witty, brutal but supportive action-prompting counter advice)"
    }
    Must be pure JSON without markdown format.
  `;

  const fallbackGenerator = () => {
    const triggers: Record<string, any> = {
      "tomorrow": { pattern: "Future Self Idealization Bias", score: 85, prob: 95, advice: "Ah, the mythical 'tomorrow.' Your tomorrow self has the exact same energy level. Break it into a 5-minute task and start right now!" },
      "tired": { pattern: "Energy-State Exaggeration Illusion", score: 70, prob: 80, advice: "Mental fatigue is real, but avoidance makes it worse. Set a timer for 10 minutes. If you're still dying, take a nap. Otherwise, persist!" },
      "perfect": { pattern: "Analysis Paralysis / Perfectionism Trap", score: 90, prob: 92, advice: "Done is better than perfect. Write a completely messy draft first. You cannot edit a blank page!" },
      "later": { pattern: "Temporal Discounting Drift", score: 75, prob: 88, advice: "Later never arrives because when it gets here, it's called 'now' again. Tackle the ugly frog first!" }
    };

    const parsedText = excuse.toLowerCase();
    let selected = triggers["tomorrow"];
    for (const key of Object.keys(triggers)) {
      if (parsedText.includes(key)) {
        selected = triggers[key];
        break;
      }
    }

    return {
      detectedPatterns: selected.pattern,
      procrastinationScore: selected.score,
      delayProbability: selected.prob,
      coachAdvice: selected.advice
    };
  };

  const result = await callGeminiSafe(cacheKey, promptGenerator, "application/json", fallbackGenerator, "excuse-check");
  return res.json(result);
});

// FEATURE 10: AI WORK ASSISTANT
app.post("/api/assistant-work", async (req, res) => {
  const { type, title } = req.body;
  const cacheKey = `assistant_work_${type}_${title}`;

  const promptGenerator = () => `
    You are a highly efficient AI Work Strategist.
    The user requires assistance with creating concrete deliverables for ${type}:
    Deliverable Title: "${title}"

    Provide a breakdown structure matching the requested file type.
    If type is 'presentation', design a detailed slide layout flow.
    If type is 'resume', design a structural resume layout outline with enhancements.
    If type is 'study_plan', design a daily topic revision breakdown.

    Format as strict JSON:
    {
      "title": "string (polished name/subtopic)",
      "outline": [
        { "section": "Slide/Chapter/Section e.g. Slide 1: Introduction", "content": "Detailed focal bullet outlines...", "details": "Presenter notes, layout guidance, or helpful tricks..." }
      ],
      "additionalTips": string[] (3 actionable high-tier trade-secrets to master this deliverable)
    }
    Do not output markdown code guards.
  `;

  const fallbackGenerator = () => {
    let outline = [];
    let additionalTips = [];

    if (type === "presentation") {
      outline = [
        { section: "Slide 1: Title & Hook", content: "Hook the room with the immediate core challenge. Name of project and unique value proposal.", details: "Speaker Note: Speak confidently. Share a 15-second story of pain before showing the solution." },
        { section: "Slide 2: The Core Problem", content: "Show current solutions are failing. Highlight real user frustrations (e.g. anxiety, lost grades, stress).", details: "Speaker Note: Ground this in simple statistics. Point to the failure rates." },
        { section: "Slide 3: Our Solution (The Wow)", content: "Introduce DeadlineHero AI as an active autonomous rescue companion overlaying execution schedules.", details: "Speaker Note: Show the screen view of the emergency recovery dashboard." },
        { section: "Slide 4: Core Tech & Architecture", content: "Google Gemini 2.5-Flash model serving real-time risk predictions + Firebase auth & secure DB storage.", details: "Speaker Note: Emphasize the ultra-fast latency of flash models under 1.1 seconds." },
        { section: "Slide 5: Call to Action (Conclusion)", content: "Final pricing model or pilot stats. Encourage signups for the first public beta program.", details: "Speaker Note: End on a high, punchy note. Open floor to judges' questions." }
      ];
      additionalTips = [
        "Keep text restricted to high-contrast bullets. Rely on visual screenshots of DeadlineHero UI.",
        "Rehearse your demo transition at least 5 times. High latency is your enemy.",
        "Keep presentation under 3.5 minutes total to leave space for Q&A."
      ];
    } else if (type === "resume") {
      outline = [
        { section: "Header / Professional Summary", content: "Impactful summary highlighting 'Productivity Architect with 3+ years experience driving AI interfaces'.", details: "Layout Tip: Use clean sans-serif typography, font size 10-11pt maximum." },
        { section: "Work Experience - Key Chronology", content: "Bullet points structured around the X-Y-Z formula: 'Accomplished [X], as measured by [Y], by doing [Z].'", details: "Enhancement: Start each line with powerful action verbs like 'Engineered', 'Optimized', 'Pioneered'." },
        { section: "Key Projects: DeadlineHero AI Implementation", content: "Description of a real-time full-stack rescue dashboard predicting user procrastination curves via Gemini API.", details: "Enhancement: Call out tech stack clearly: React, Express, Firebase, TypeScript." }
      ];
      additionalTips = [
        "Keep resume to a single page. Cut older/irrelevant history to keep whitespace clean.",
        "Verify PDF is machine-readable by selecting text. Do not export as flattened image.",
        "Quantify your accomplishments! Always specify percentages, dollar rates, or hours saved."
      ];
    } else {
      outline = [
        { section: "Day 1: Foundations & Scope Definition", content: "Review syllabus guidelines. Break topics into core high-yield modules vs. secondary elements.", details: "Routine: Study 50 minutes, rest 10 minutes. Max blocks: 4." },
        { section: "Day 2: Hardest Concept Drill", content: "Attack target equations or complex coding schemas first. Complete 3 active-recall exercises.", details: "Routine: Write summaries entirely from memory without looking at reference material." },
        { section: "Day 3: Practice Testing under constraint", content: "Simulate a mock countdown. Attempt at least 15 past questions with tight timers.", details: "Routine: Grade yours thoroughly. Study mistakes for at least 30 minutes carefully." }
      ];
      additionalTips = [
        "Never do passive reading (highlighting textbooks). Passive review has close to 5% retention rates.",
        "Teach the concept to a rubber duck or a friend. Clarify gaps in your own logic.",
        "Drink black coffee or tea 30 minutes before deep review, and secure 8 hours of sleep."
      ];
    }

    return {
      title: `${title} - AI Generated Architecture`,
      outline,
      additionalTips,
      isFallback: true
    };
  };

  const result = await callGeminiSafe(cacheKey, promptGenerator, "application/json", fallbackGenerator, "assistant-work");
  return res.json(result);
});

// FEATURE 3: AI CHAT / COMMAND CENTER
app.post("/api/voice-assistant", async (req, res) => {
  const { message } = req.body;
  const cacheKey = `voice_assistant_${(message || "").trim().toLowerCase()}`;

  const promptGenerator = () => `
    You are DeadlineHero AI, an autonomous recovery coach. Provide a short, direct, motivating response to the user's input:
    "${message}"
    Keep it under 3 sentences, high impact, direct, and and fully supportive of deep execution.
  `;

  const fallbackGenerator = () => {
    const replies = [
      "Your future is crafted by what you do right now, not what you promise. Let's finish the MVP module immediately.",
      "Procrastination is just fear of failure in disguise. Break the block into small 10-minute tasks. You've got this!",
      "No more excuses. Your deadline is approaching. Close the extra tabs, power up your focus and let's win this day."
    ];
    const reply = replies[Math.floor(Math.random() * replies.length)];

    return {
      reply,
      speakText: reply
    };
  };

  const result = await callGeminiSafe(cacheKey, promptGenerator, "text/plain", fallbackGenerator, "voice-assistant");
  
  if (typeof result === "string") {
    return res.json({
      reply: result,
      speakText: result
    });
  }
  return res.json(result);
});

// FEATURE 3.5: AI DOCUMENT INGESTION / SYLLABUS PARSING
app.post("/api/parse-document", async (req, res) => {
  const { text, title, fileData, mimeType } = req.body;
  const contentHash = fileData ? fileData.length : (text || "").length;
  const cacheKey = `parse_document_${(title || "").trim().toLowerCase()}_${contentHash}`;

  const promptGenerator = () => {
    const textPrompt = `
      You are an expert project scheduler and task triager.
      Read this task sheet, homework description, work syllabus, or document text carefully.

      Analyze the workload, identify major milestones, and extract the project scheduling details.
      
      Format your response as strict JSON following this schema:
      {
        "title": "Clean, descriptive project title (or '${title || "Extracted Task"}' if not specified)",
        "dueDate": "YYYY-MM-DD (format as ISO date, estimating the closest upcoming date from the document or today. Use the format YYYY-MM-DD strictly)",
        "priority": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
        "effortScore": number (1 to 10),
        "estimatedHours": number,
        "complexityAnalysis": "A crisp, professional analysis of why this workload is complex or what the core bottleneck is.",
        "extractedMilestones": string[] (3-5 highly actionable, specific chronological phases or milestone steps),
        "calculatedRiskPercentage": number (0 to 100 representing probability of failure / procrastination risk),
        "successProbability": number (0 to 100)
      }
      
      Do not output markdown code guards. Just raw JSON.
    `;

    if (fileData && mimeType) {
      return {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: fileData
            }
          },
          {
            text: textPrompt
          }
        ]
      };
    }

    return `
      Read this task sheet, homework description, work syllabus, or document text:
      "${text}"

      ${textPrompt}
    `;
  };

  const fallbackGenerator = () => {
    return {
      title: title || "Term Project Blueprint",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
      priority: "HIGH",
      effortScore: 8,
      estimatedHours: 15,
      complexityAnalysis: "Synthesized from guidelines: High intensity full-stack development demanding database synchronization and custom styles.",
      extractedMilestones: [
        "Phase 1: Database blueprint modeling and setup configuration (2 hours)",
        "Phase 2: Core server routing logic and API proxies (5 hours)",
        "Phase 3: Front-end container layout assembly and styles (6 hours)",
        "Phase 4: Run build validations and test hosting compilation (2 hours)"
      ],
      calculatedRiskPercentage: 78,
      successProbability: 22,
      isFallback: true
    };
  };

  const result = await callGeminiSafe(cacheKey, promptGenerator, "application/json", fallbackGenerator, "parse-document");
  return res.json(result);
});

// -------------------------------------------------------------
// VITE AND DEVELOPMENT DEV SETUP MIDDLEWARES
// -------------------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development Mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    // Mount Vite middlewares after defining express routes
    app.use(vite.middlewares);
  } else {
    // Production Mode
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Serve index.html for all non-api SPA paths
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) {
        next();
      } else {
        res.sendFile(path.join(distPath, "index.html"));
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[DeadlineHero Server] running smoothly on http://localhost:${PORT}`);
  });
}

startServer();
