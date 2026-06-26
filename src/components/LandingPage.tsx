import { motion } from "motion/react";
import { ShieldAlert, Zap, Compass, Target, ArrowRight, Sparkles, Play, Flame, BrainCircuit, Activity } from "lucide-react";

interface LandingPageProps {
  onStart: () => void;
}

export default function LandingPage({ onStart }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-[#0B1020] text-white flex flex-col relative overflow-hidden font-sans">
      {/* Background ambient glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-900/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-purple-900/20 blur-[120px] pointer-events-none" />
      
      {/* Navbar */}
      <header className="border-b border-white/5 backdrop-blur-md bg-[#0B1020]/75 sticky top-0 z-50 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#7C3AED] to-[#C084FC] flex items-center justify-center shadow-lg shadow-purple-500/10">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold tracking-tight text-lg bg-gradient-to-r from-white via-[#C084FC] to-[#7C3AED] bg-clip-text text-transparent">
              DeadlineHero AI
            </span>
            <span className="block text-[9px] text-[#A855F7] font-semibold uppercase tracking-widest leading-none">
              Last-Minute Life Saver
            </span>
          </div>
        </div>
        
        <button
          onClick={onStart}
          className="relative group px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all font-medium text-sm flex items-center gap-2 cursor-pointer"
        >
          <span>Launch Agent</span>
          <ArrowRight className="w-4 h-4 text-[#C084FC] group-hover:translate-x-1 transition-transform" />
        </button>
      </header>

      {/* Hero Section */}
      <main className="flex-grow flex flex-col items-center justify-center px-6 py-16 md:py-24 relative z-10 max-w-7xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-4xl flex flex-col items-center"
        >
          {/* Tag */}
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-[#7C3AED]/30 mb-8 self-center">
            <Sparkles className="w-3.5 h-3.5 text-[#C084FC]" />
            <span className="text-xs font-semibold uppercase tracking-widest text-[#C084FC]">
              Agentic Recovery Engine
            </span>
          </div>

          <h1 className="text-4xl md:text-7xl font-extrabold tracking-tight leading-none mb-6">
            Never Miss Another
            <br />
            <span className="bg-gradient-to-r from-red-400 via-[#C084FC] to-[#7C3AED] bg-clip-text text-transparent">
              Deadline.
            </span>
          </h1>

          <p className="text-base md:text-xl text-[#94A3B8] max-w-2xl mb-10 leading-relaxed font-light">
            DeadlineHero AI predicts risk paths, drafts real-time hour-by-hour rescue roadmaps, simulates future paths, and guides your focus before it's too late. It is not a task manager, it is your emergency chief-of-staff.
          </p>

          {/* Interactive CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center px-4 mb-16">
            <button
              onClick={onStart}
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-[#7C3AED] via-[#A855F7] to-[#C084FC] hover:shadow-xl hover:shadow-purple-500/20 text-white font-semibold transition-all flex items-center justify-center gap-2.5 cursor-pointer transform hover:scale-[1.02]"
            >
              <span>Start Saving Deadlines</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={onStart}
              className="px-8 py-4 rounded-xl bg-[#131A2A] hover:bg-[#1C253B] border border-white/5 text-white font-medium transition-all flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Watch Demo Playbook</span>
            </button>
          </div>
        </motion.div>

        {/* Dynamic Bento Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-10">
          <motion.div
            whileHover={{ y: -5 }}
            className="p-6 rounded-2xl bg-[#131A2A] border border-white/5 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-purple-500/10 to-transparent blur-xl" />
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-6 text-[#C084FC]">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold mb-2">Deadline Risk Engine</h3>
            <p className="text-sm text-[#94A3B8] leading-relaxed">
              Calculates real-time failure probability and urgency index. Know exactly which project needs direct intervention now.
            </p>
          </motion.div>

          <motion.div
            whileHover={{ y: -5 }}
            className="p-6 rounded-2xl bg-[#131A2A] border border-white/5 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-red-500/10 to-transparent blur-xl" />
            <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6 text-red-400">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold mb-2">🚨 SAVE MY DEADLINE</h3>
            <p className="text-sm text-[#94A3B8] leading-relaxed">
              Activate atomic schedule triage. Generates precise hour-by-hour plans that increase recovery probability from 25% up to 88% in seconds.
            </p>
          </motion.div>

          <motion.div
            whileHover={{ y: -5 }}
            className="p-6 rounded-2xl bg-[#131A2A] border border-white/5 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-indigo-500/10 to-transparent blur-xl" />
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6 text-indigo-400">
              <Compass className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold mb-2">Future Self Simulator</h3>
            <p className="text-sm text-[#94A3B8] leading-relaxed">
              Dynamic dual-timeline projector depicting Timeline A (Procrastinator) vs Timeline B (Hero Path) to visually inspire active completion.
            </p>
          </motion.div>
        </div>

        {/* Feature 4,5,6 Callout Section */}
        <div className="mt-20 w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight mb-4 text-left">
              Advanced Agentic Features Built For Master Strategists
            </h2>
            <p className="text-[#94A3B8] mb-8 leading-relaxed text-left">
              Whether you are an engineer trying to finish a massive codebase, a student with exams, or preparing for an upcoming product pitch—our AI actively works with you to produce outline templates, slide sheets, schedule checklists, and study blueprints.
            </p>

            <div className="space-y-4">
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-400 shrink-0 mt-0.5">
                  <BrainCircuit className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-white">Excuse Detector & Panic Alert</h4>
                  <p className="text-sm text-[#94A3B8]">Detects avoidance behavior dynamically and shifts UI into a high-warning reactive State.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-400 shrink-0 mt-0.5">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-white">Visual Analytics Dashboards</h4>
                  <p className="text-sm text-[#94A3B8]">Track saved items, completion velocity, streak scores and productivity metrics in real-time.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative p-8 rounded-2xl bg-[#131A2A] border border-white/5 space-y-6">
            <h4 className="text-sm font-semibold uppercase tracking-widest text-[#C084FC]">Interactive Playbook Mockup</h4>
            <div className="p-4 rounded-xl bg-black/40 border border-white/5 font-mono text-xs text-green-400 space-y-2">
              <p>{`> Initializing DeadlineHero Agent...`}</p>
              <p className="text-purple-400">{`> Input: "Hackathon Submission due in 2 days"`}</p>
              <p className="text-yellow-400">{`> Failure Risk Detected: 91% [CRITICAL_PANIC_STATE]`}</p>
              <p className="text-white">{`> Creating Rescue Strategy Timeline [Time: 18 hours]`}</p>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden mt-3">
                <div className="h-full bg-gradient-to-r from-red-500 to-green-500 w-[78%]" />
              </div>
            </div>
            <div className="bg-white/5 p-4 rounded-xl flex items-center justify-between border border-white/5">
              <div>
                <span className="block text-xs text-[#94A3B8]">SUCCESS PROBABILITY</span>
                <span className="text-xl font-black text-green-400">Before: 25% ➔ After Rescue: 88%</span>
              </div>
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                <Target className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Table Section */}
        <div className="mt-24 w-full">
          <div className="text-center mb-12">
            <h3 className="text-2xl md:text-3xl font-extrabold">Plans Configured to Rescue You</h3>
            <p className="text-sm text-[#94A3B8] mt-1">Whether you need light alerts or full nuclear crisis interventions.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto w-full">
            <div className="p-8 rounded-2xl bg-[#131A2A] border border-white/5 flex flex-col justify-between">
              <div>
                <span className="text-xs uppercase font-bold tracking-widest text-indigo-400">Triage Tier</span>
                <h4 className="text-2xl font-bold mt-2">Free Rescue Plan</h4>
                <p className="text-[#94A3B8] text-sm mt-3">Saves up to 3 static monthly deadlines, basic smart scheduler suggestions.</p>
              </div>
              <div className="mt-8">
                <span className="text-4xl font-extrabold">$0</span>
                <span className="text-xs text-[#94A3B8]"> / forever</span>
                <button onClick={onStart} className="w-full mt-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all cursor-pointer">
                  Activate Workspace
                </button>
              </div>
            </div>

            <div className="p-8 rounded-2xl bg-gradient-to-b from-[#1E1B4B]/80 to-[#131A2A] border border-[#7C3AED]/40 relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 px-3 py-1 bg-[#7C3AED] text-white text-[10px] uppercase font-bold tracking-widest rounded-bl-xl">
                SUPERIOR CHOICE
              </div>
              <div>
                <span className="text-xs uppercase font-bold tracking-widest text-[#C084FC]">Autoboot Lifeboat</span>
                <h4 className="text-2xl font-bold mt-2">Unlimited Agent Pro</h4>
                <p className="text-[#94A3B8] text-sm mt-3">Unlimited active recovery agent runs, total Gemini 2.5 API, complete voice simulation engine and panic response.</p>
              </div>
              <div className="mt-8">
                <span className="text-4xl font-extrabold">$12</span>
                <span className="text-xs text-[#94A3B8]"> / month</span>
                <button onClick={onStart} className="w-full mt-6 py-3 rounded-xl bg-[#7C3AED] hover:bg-[#A855F7] text-white font-semibold transition-all shadow-lg shadow-purple-500/20 cursor-pointer">
                  Upgrade & Save Deadlines
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6 text-center text-xs text-[#94A3B8] bg-[#090D1A]/60 z-10 w-full">
        <p>© 2026 DeadlineHero AI. Armed with autonomous intelligence. Built for champions of delivery.</p>
      </footer>
    </div>
  );
}
