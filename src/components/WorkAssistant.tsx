import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, Layout, FileText, Calendar, ArrowRight, Lightbulb, 
  FileUp, CheckCircle2, HardDrive, Plus, Bot, ShieldAlert 
} from "lucide-react";

interface WorkAssistantProps {
  onImportDeadline: (deadline: {
    title: string;
    date: string;
    priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    progress: number;
    estimatedEffort: number;
    riskPercentage: number;
    successProbability: number;
    urgencyScore: number;
    recoveryPotential: number;
  }) => void;
  setActiveTab?: (tab: "dashboard" | "rescue" | "warroom" | "strategist" | "analytics" | "settings") => void;
}

export default function WorkAssistant({ onImportDeadline, setActiveTab }: WorkAssistantProps) {
  // Navigation within the AI Assistant Page
  const [subTab, setSubTab] = useState<"scaffold" | "scanner">("scaffold");

  // Scaffold Generator States
  const [type, setType] = useState<"presentation" | "resume" | "study_plan">("presentation");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<any | null>(null);

  // Document Scanner States
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [textInput, setTextInput] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [imported, setImported] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Presets for the Document Scanner
  const presets = [
    {
      title: "Syllabus: CS101 Final Term Project",
      text: "Final Term Project guidelines: Deadlines: June 30, 2026. The submission is a fully functional web shell application with custom styling and a live database container. Grading weight: 45%. Recommended intensity is extreme effort (9/10), high complexity, student is required to outline modular components, write robust unit testing files, and deploy to external production host."
    },
    {
      title: "Workorder: Corporate Presentation Pitch",
      text: "Deliverable order: Pitch Deck presentation due in 5 days (June 28, 2026). Must summarize business outcomes, cost reductions, and caffeine consumption logs. Difficulty: High. Progress: 0%."
    }
  ];

  // ==========================================
  // Scaffold Generation Handlers
  // ==========================================
  const handleGenerateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    setLoading(true);
    setOutput(null);

    try {
      const response = await fetch("/api/assistant-work", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, title })
      });
      if (!response.ok) throw new Error("Asset structural generation failed");
      const data = await response.json();
      setOutput(data);
    } catch (e) {
      console.error(e);
      // Fallback
      setOutput({
        title: `${title} - Mock Delivery Scaffold`,
        outline: [
          { section: "Introduction & Focus Outline", content: "Key foundational guidelines regarding your target topic.", details: "Pro Tip: Complete this module first to secure a solid mental skeleton." },
          { section: "Core Structure Deployment", content: "Implement the crucial technical pipelines or slide visuals here.", details: "Pro Tip: Keep components modular and readable." }
        ],
        additionalTips: [
          "Establish high-contrast dark visual accents.",
          "Compile checks after each modular addition to avoid syntax bugs."
        ],
        isFallback: true
      });
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // Document Scanner Handlers
  // ==========================================
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processUploadedFile = (file: File) => {
    setSelectedFile(file);
    setTextInput(`Reading and analyzing "${file.name}" (${(file.size / 1024).toFixed(1)} KB)...`);
    
    const fileType = file.type || "";
    const isPDF = fileType === "application/pdf" || file.name.endsWith(".pdf");
    
    const reader = new FileReader();
    
    if (isPDF) {
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const base64Data = dataUrl.split(",")[1] || "";
        executeDocumentTriage("", file.name, base64Data, "application/pdf");
      };
      reader.readAsDataURL(file);
    } else {
      reader.onload = (event) => {
        const content = event.target?.result as string;
        executeDocumentTriage(content, file.name);
      };
      reader.readAsText(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processUploadedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processUploadedFile(e.target.files[0]);
    }
  };

  const triggerFileSearch = () => {
    fileInputRef.current?.click();
  };

  const executeDocumentTriage = async (
    docText: string, 
    docTitle: string = "Extracted Document Deadline",
    fileData?: string,
    mimeType?: string
  ) => {
    setAnalyzing(true);
    setResult(null);
    setImported(false);

    try {
      const response = await fetch("/api/parse-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: docText,
          title: docTitle,
          fileData: fileData,
          mimeType: mimeType
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.dueDate) {
          setResult({
            ...data,
            title: data.title || docTitle
          });
          setAnalyzing(false);
          return;
        }
      }
      throw new Error();
    } catch (e) {
      // Offline fallback high-fidelity parsed data
      setResult({
        title: docTitle.startsWith("Document File Loaded") ? "Term Project Blueprint" : docTitle,
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
      });
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Tab Segment Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111625] p-4 rounded-2xl border border-white/5">
        <div className="space-y-1">
          <h3 className="text-base font-bold flex items-center gap-1.5 text-white">
            <Bot className="w-5 h-5 text-[#C084FC] animate-pulse" />
            AI Assistant Center
          </h3>
          <p className="text-xs text-[#94A3B8]">
            Plan modular sprint blueprints or scan PDF syllabus documents to automate schedules.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setSubTab("scaffold")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              subTab === "scaffold" 
                ? "bg-[#7C3AED] text-white shadow-md shadow-purple-500/25" 
                : "text-[#94A3B8] hover:text-white"
            }`}
          >
            Sprints Planner
          </button>
          <button
            type="button"
            onClick={() => setSubTab("scanner")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              subTab === "scanner" 
                ? "bg-[#7C3AED] text-white shadow-md shadow-purple-500/25" 
                : "text-[#94A3B8] hover:text-white"
            }`}
          >
            PDF & Syllabus Ingestion
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {subTab === "scaffold" ? (
          <motion.div
            key="scaffold-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-6 rounded-2xl bg-[#131A2A] border border-white/5 space-y-5"
          >
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                Execution Blueprint Generator
              </h4>
              <p className="text-xs text-[#94A3B8] mt-1">
                Draft structural plans for presentations, resume blueprints, or custom exam study intervals.
              </p>
            </div>

            <form onSubmit={handleGenerateAsset} className="space-y-4">
              {/* Selector Pills */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "presentation", label: "Presentations", icon: <Layout className="w-3.5 h-3.5" /> },
                  { id: "resume", label: "Resumes", icon: <FileText className="w-3.5 h-3.5" /> },
                  { id: "study_plan", label: "Study Plan", icon: <Calendar className="w-3.5 h-3.5" /> }
                ].map((pill) => (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setType(pill.id as any)}
                    className={`p-2.5 rounded-xl border flex flex-col sm:flex-row items-center justify-center gap-1.5 font-bold text-xs transition-all cursor-pointer ${
                      type === pill.id 
                        ? "bg-[#7C3AED]/15 border-[#7C3AED] text-white" 
                        : "bg-black/20 border-white/5 text-[#94A3B8] hover:bg-black/30"
                    }`}
                  >
                    {pill.icon}
                    <span className="hidden sm:inline">{pill.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <input 
                  type="text" 
                  required
                  placeholder={
                    type === 'presentation' ? "e.g. 'AI Startup Demo Pitch' or 'Q3 Business Review'" :
                    type === 'resume' ? "e.g. 'Senior Full-Stack Developer Profile' or 'Figma UX Lead'" :
                    "e.g. 'Advanced Thermodynamics Final' or 'Data Structures Exam'"
                  }
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="flex-grow px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-[#7C3AED]"
                />
                <button 
                  type="submit"
                  disabled={loading}
                  className="px-5 py-3 rounded-xl bg-[#7C3AED] hover:bg-[#A855F7] text-white font-bold text-xs uppercase tracking-widest transition-all cursor-pointer shrink-0"
                >
                  {loading ? "Generating..." : "Generate Blueprint"}
                </button>
              </div>
            </form>

            {loading && (
              <div className="py-12 flex flex-col items-center justify-center space-y-2">
                <div className="w-10 h-10 rounded-full border-t-2 border-r-2 border-[#7C3AED] animate-spin" />
                <span className="text-xs font-mono text-[#94A3B8] animate-pulse">Consulting engine clusters...</span>
              </div>
            )}

            {output && !loading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4 max-h-[350px] overflow-y-auto pr-1"
              >
                {output.isFallback && (
                  <div className="p-4 bg-yellow-950/20 border border-yellow-500/20 rounded-xl text-xs text-yellow-300 space-y-1.5 shadow-md">
                    <div className="flex items-center gap-2 font-bold text-yellow-400">
                      <ShieldAlert className="w-4 h-4 text-yellow-400 shrink-0" />
                      Gemini API is Unavailable (Local Simulation Engaged)
                    </div>
                    <p className="text-[#D1D5DB] leading-relaxed">
                      Your configured Gemini API key returned a service unavailability error (503 / High demand) from Google's servers. 
                      To preserve functionality, DeadlineHero has engaged its local simulation engine.
                    </p>
                    {setActiveTab && (
                      <button
                        type="button"
                        onClick={() => setActiveTab("settings")}
                        className="text-xs font-bold text-purple-300 hover:text-purple-100 underline cursor-pointer inline-flex items-center gap-1 mt-1"
                      >
                        Go to Settings to verify your API Key →
                      </button>
                    )}
                  </div>
                )}

                <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                  <span className="block text-[9px] uppercase font-bold text-[#A855F7] tracking-widest">OUTPUT SCAFFOLDING Blueprint</span>
                  <p className="text-sm font-extrabold text-white mt-0.5">{output.title}</p>
                </div>

                <div className="space-y-2.5">
                  {output.outline?.map((item: any, idx: number) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-black/40 border border-white/5 text-xs space-y-1.5">
                      <span className="font-extrabold text-[#C084FC] block">{item.section}</span>
                      <p className="text-[#94A3B8] font-light leading-relaxed">{item.content}</p>
                      {item.details && (
                        <div className="p-2 rounded-lg bg-indigo-950/20 text-[#C084FC] font-mono text-[10px]">
                          <span className="font-bold">PRO NOTE:</span> {item.details}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {output.additionalTips && (
                  <div className="p-4 rounded-xl bg-[#22C55E]/5 border border-[#22C55E]/10 space-y-2">
                    <span className="font-semibold text-xs text-green-400 flex items-center gap-1">
                      <Lightbulb className="w-4 h-4 text-green-400" />
                      Additional Execution Secrets
                    </span>
                    <ul className="space-y-1">
                      {output.additionalTips.map((tip: string, idx: number) => (
                        <li key={idx} className="text-xs text-[#94A3B8] flex items-start gap-1.5">
                          <span className="text-green-500 font-bold">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="scanner-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-6 rounded-2xl bg-[#131A2A] border border-white/5 space-y-6"
          >
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FileUp className="w-4 h-4 text-purple-400" />
                Assignment & Lecture Scanner
              </h4>
              <p className="text-xs text-[#94A3B8] mt-1">
                Drag and drop syllabus sheets, exam guidelines, requirement documents, or homework PDFs to generate automated deadlines.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Dropzone & Quick Presets */}
              <div className="lg:col-span-5 space-y-4">
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={triggerFileSearch}
                  className={`cursor-pointer group select-none p-6 min-h-[160px] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center transition-all ${
                    dragActive 
                      ? "border-[#7C3AED] bg-[#7C3AED]/5" 
                      : "border-white/10 hover:border-[#7C3AED]/40 bg-black/10 hover:bg-black/20"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.txt"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  
                  <FileUp className="w-8 h-8 text-white/35 group-hover:text-[#C084FC] transition-colors mb-2 animate-pulse" />
                  <span className="text-xs font-bold text-white leading-normal">
                    {selectedFile ? selectedFile.name : "Drag & Drop syllabus or briefs here"}
                  </span>
                  <span className="text-[10px] text-[#94A3B8] block mt-1">
                    Supports PDF, DOCX, or TXT (Max 4MB) or click to browse
                  </span>
                </div>

                {/* Preset Buttons */}
                <div className="space-y-2.5">
                  <span className="text-[8px] font-black tracking-widest text-[#94A3B8] uppercase block">QUICK DEMO PRESETS</span>
                  <div className="flex flex-col gap-2">
                    {presets.map((preset, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => {
                          setSelectedFile(null);
                          setTextInput(preset.text);
                          executeDocumentTriage(preset.text, preset.title);
                        }}
                        className="p-3 bg-black/35 hover:bg-black/55 hover:border-[#7C3AED]/30 text-left border border-white/5 rounded-xl cursor-pointer transition-colors space-y-0.5"
                      >
                        <span className="text-xs font-bold text-[#C084FC] block">{preset.title}</span>
                        <p className="text-[10.5px] text-[#94A3B8] leading-snug truncate">{preset.text}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Ingestion Output Result */}
              <div className="lg:col-span-7 p-5 rounded-2xl bg-black/25 border border-white/5 relative overflow-hidden min-h-[290px] flex flex-col justify-center">
                <AnimatePresence mode="wait">
                  {analyzing && (
                    <motion.div 
                      key="loading-scanner"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center space-y-3.5 text-center py-12"
                    >
                      <div className="w-8 h-8 rounded-full border-t-2 border-r-2 border-[#7C3AED] animate-spin" />
                      <div>
                        <span className="text-xs font-bold tracking-widest text-white uppercase block animate-pulse">Parsing target documents...</span>
                        <span className="text-[10px] text-[#94A3B8] block mt-1">Extracting milestones, due dates, and fail risks</span>
                      </div>
                    </motion.div>
                  )}

                  {!analyzing && result && (
                    <motion.div
                      key="result-scanner"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      {result.isFallback && (
                        <div className="p-3 bg-yellow-950/20 border border-yellow-500/20 rounded-xl text-[11px] text-yellow-300 space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-yellow-400">
                            <ShieldAlert className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                            Simulated Document Parsing Active
                          </div>
                          <p className="text-[#94A3B8] leading-relaxed text-[10.5px]">
                            Google Gemini API is currently offline/experiencing high demand. Displaying pre-analyzed demo results.
                          </p>
                        </div>
                      )}

                      <div className="flex justify-between items-start border-b border-white/5 pb-3 pb-3">
                        <div>
                          <span className="text-[9px] bg-[#7C3AED]/15 text-[#C084FC] px-2 py-0.5 rounded font-bold uppercase tracking-widest font-mono">
                            SCANNED SCHEDULER
                          </span>
                          <h4 className="text-sm font-extrabold text-white mt-1">{result.title}</h4>
                        </div>
                        
                        <div className="text-right shrink-0">
                          <span className="block text-[8px] text-[#94A3B8] uppercase font-bold">Failure Probability</span>
                          <span className="text-sm font-black text-red-400">{result.calculatedRiskPercentage}%</span>
                        </div>
                      </div>

                      {/* Extracted Details Info */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                        <div className="p-2 bg-white/5 rounded-xl border border-white/5">
                          <span className="block text-[8px] text-[#94A3B8] font-bold uppercase">DUE DATE</span>
                          <span className="text-[11px] font-bold text-white flex items-center justify-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3 text-blue-400" />
                            {result.dueDate}
                          </span>
                        </div>

                        <div className="p-2 bg-white/5 rounded-xl border border-white/5">
                          <span className="block text-[8px] text-[#94A3B8] font-bold uppercase">PRIORITY</span>
                          <span className="text-[11px] font-bold mt-0.5 inline-block text-red-400 tracking-wider">{result.priority}</span>
                        </div>

                        <div className="p-2 bg-white/5 rounded-xl border border-white/5">
                          <span className="block text-[8px] text-[#94A3B8] font-bold uppercase">EFFORT</span>
                          <span className="text-[11px] font-bold text-white block mt-0.5">{result.effortScore}/10</span>
                        </div>

                        <div className="p-2 bg-white/5 rounded-xl border border-white/5">
                          <span className="block text-[8px] text-[#94A3B8] font-bold uppercase">HOURS</span>
                          <span className="text-[11px] font-bold text-white block mt-0.5">{result.estimatedHours}h</span>
                        </div>
                      </div>

                      <div className="space-y-1 bg-black/40 p-3 rounded-xl border border-white/5">
                        <span className="text-[8px] font-bold tracking-widest text-[#C084FC] uppercase block">AI ANALYSIS DETAIL</span>
                        <p className="text-[11px] text-[#94A3B8] leading-relaxed font-light">
                          {result.complexityAnalysis}
                        </p>
                      </div>

                      {/* Milestones list */}
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-bold tracking-widest text-white uppercase block">IDENTIFIED TASK BREAKDOWNS</span>
                        <div className="space-y-1 max-h-[110px] overflow-y-auto pr-1">
                          {result.extractedMilestones?.map((milestone: string, i: number) => (
                            <div key={i} className="flex gap-2 items-center p-2 rounded-lg bg-white/5 text-[10.5px] text-white">
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                              <span className="truncate">{milestone}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Import button */}
                      <div className="pt-2 border-t border-white/5 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            onImportDeadline({
                              title: result.title,
                              date: result.dueDate,
                              priority: result.priority,
                              progress: 0,
                              estimatedEffort: result.effortScore,
                              riskPercentage: result.calculatedRiskPercentage,
                              successProbability: result.successProbability || (100 - result.calculatedRiskPercentage),
                              urgencyScore: result.calculatedRiskPercentage + 10,
                              recoveryPotential: 100 - result.calculatedRiskPercentage
                            });
                            setImported(true);
                          }}
                          disabled={imported}
                          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all ${
                            imported 
                              ? "bg-green-600/20 text-green-400 border border-green-500/30" 
                              : "bg-gradient-to-r from-[#7C3AED] to-[#A855F7] text-white shadow-lg hover:opacity-90"
                          }`}
                        >
                          <Plus className="w-4 h-4" />
                          <span>{imported ? "Success Imported!" : "Import to Live Board"}</span>
                        </button>
                      </div>

                    </motion.div>
                  )}

                  {!analyzing && !result && (
                    <motion.div
                      key="idle-scanner"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-12 p-6 space-y-3"
                    >
                      <HardDrive className="w-8 h-8 text-white/10 mx-auto" />
                      <div>
                        <h4 className="text-xs font-bold text-white">Ingestion System Ready</h4>
                        <p className="text-[10.5px] text-[#94A3B8] leading-relaxed max-w-sm mx-auto mt-1">
                          Drop guidelines, lecture sheets, exam specifications, or use a demo preset on the left to extract an immediate milestone execution timeline.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
