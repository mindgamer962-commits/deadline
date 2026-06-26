import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Activity, ShieldAlert, Timer, Compass, Zap, Flame, 
  RefreshCw, Terminal, Play, AlertOctagon, CheckCircle2, ListTodo, Shield, Radar 
} from "lucide-react";
import { Deadline } from "../types";

interface WarRoomProps {
  deadlines: Deadline[];
}

export default function WarRoom({ deadlines }: WarRoomProps) {
  const [activeDl, setActiveDl] = useState<Deadline | null>(deadlines.find(d => (d.progress ?? 0) < 100) || deadlines[0] || null);
  const [countdown, setCountdown] = useState({ h: 11, m: 59, s: 59 });
  const [isAlertActive, setIsAlertActive] = useState(true);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([
    "🚀 WAR_ROOM INITIALIZED: NASA Core Telemetry Online",
    "🛡️ SHIELD ENGINES ENERGIZED: Procrastination buffer is at 100%",
    "🛰️ SATELLITE RADAR: Scanning for upcoming delivery vectors...",
    "✨ STATUS: All systems nominal. Waiting for mission triggers."
  ]);

  // Countdown ticking effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev.s > 0) return { ...prev, s: prev.s - 1 };
        if (prev.m > 0) return { h: prev.h, m: prev.m - 1, s: 59 };
        if (prev.h > 0) return { h: prev.h - 1, m: 59, s: 59 };
        return { h: 12, m: 0, s: 0 }; // Loop
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Random console logs for flavor
  useEffect(() => {
    const interval = setInterval(() => {
      const activities = [
        "📡 Scanning deadline proximity... Optimal pacing verified.",
        "⚡ Triage buffer auto-scaled: Target progress recalculated.",
        "🧠 Future-Self prediction: 88% probability threshold locked.",
        "🧮 Telemetry matrix: Stress levels are within safe tolerances.",
        "🚨 WARNING: Micro-delay detected in secondary milestones. Correction applied."
      ];
      const randomMsg = activities[Math.floor(Math.random() * activities.length)];
      setConsoleLogs(prev => [...prev.slice(-4), `[${new Date().toLocaleTimeString()}] ${randomMsg}`]);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!activeDl) {
    return (
      <div className="p-8 rounded-2xl bg-[#131A2A] border border-white/5 text-center space-y-4">
        <AlertOctagon className="w-12 h-12 text-[#A855F7] mx-auto animate-pulse" />
        <h3 className="text-lg font-bold text-white">No Active Missions</h3>
        <p className="text-xs text-[#94A3B8] max-w-md mx-auto">
          Add an active milestone or deliverable to engage the tactical Mission Control environment.
        </p>
      </div>
    );
  }

  const riskLevel = activeDl.riskPercentage ?? 45;
  const criticalTasks = [
    { name: "Finalize core feature checklist", duration: "2.5h", status: "DONE" },
    { name: "Verify production cloud container build", duration: "1.2h", status: "DOING" },
    { name: "Write project pitch document", duration: "3.0h", status: "TODO" },
    { name: "Execute regression diagnostics & linter validation", duration: "0.8h", status: "TODO" }
  ];

  return (
    <div className="space-y-8" id="war-room-root">
      {/* Top Banner Ticker */}
      <div className="relative overflow-hidden p-4 rounded-2xl bg-black/60 border border-red-500/20 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-gradient-to-b from-red-500 to-rose-600" />
        <div className="flex items-center gap-3 relative z-10">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
          </span>
          <span className="text-[10px] font-mono font-black text-red-400 uppercase tracking-widest">
            WAR ROOM CRITICAL THREAT ENVIRONMENT ACTIVE
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="text-white/40">VECTOR STATE:</span>
          <span className="text-green-400 font-bold bg-green-500/10 px-2.5 py-0.5 rounded border border-green-500/20">SHIELDS ENGAGED</span>
        </div>
      </div>

      {/* Main Grid split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* NASA Control Main Dashboard (Left side: 8 cols) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Hero Countdown Panel */}
          <div className="relative overflow-hidden p-8 rounded-3xl bg-gradient-to-br from-[#151D30] to-[#0A0D18] border border-white/10 shadow-2xl flex flex-col items-center text-center space-y-6">
            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-red-500/5 blur-[120px] rounded-full pointer-events-none translate-x-20 -translate-y-20" />
            
            <div className="space-y-1.5">
              <span className="px-3 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-[10px] text-red-400 uppercase tracking-widest font-black font-mono">
                CRITICAL INTERCEPT WINDOW
              </span>
              <h2 className="text-xl font-bold tracking-tight text-white">{activeDl.title}</h2>
              <p className="text-xs text-[#94A3B8]">Target Submission Due: <span className="font-mono text-white">{activeDl.date}</span></p>
            </div>

            {/* Giant Sci-Fi Timer Countdown */}
            <div className="flex items-center justify-center gap-3 md:gap-5">
              {[
                { label: "HOURS", val: countdown.h },
                { label: "MINUTES", val: countdown.m },
                { label: "SECONDS", val: countdown.s }
              ].map((c, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className="min-w-[70px] md:min-w-[100px] p-4 rounded-2xl bg-black/50 border border-white/15 shadow-inner relative overflow-hidden flex items-center justify-center">
                    <span className="text-3xl md:text-5xl font-black font-mono text-white tracking-wider">
                      {c.val.toString().padStart(2, '0')}
                    </span>
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500/40 animate-pulse" />
                  </div>
                  <span className="text-[9px] text-[#94A3B8] font-bold tracking-widest uppercase mt-2 font-mono">
                    {c.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-4 justify-center pt-2">
              <div className="px-4 py-2 bg-white/5 border border-white/5 rounded-xl text-center">
                <span className="block text-[10px] text-[#94A3B8] uppercase tracking-wider font-semibold">Remaining Milestones</span>
                <span className="text-lg font-bold font-mono text-white">4 Pending</span>
              </div>
              <div className="px-4 py-2 bg-white/5 border border-white/5 rounded-xl text-center">
                <span className="block text-[10px] text-[#94A3B8] uppercase tracking-wider font-semibold">Calculated Effort Rate</span>
                <span className="text-lg font-bold font-mono text-yellow-400">7.8 hrs estimate</span>
              </div>
              <div className="px-4 py-2 bg-white/5 border border-white/5 rounded-xl text-center">
                <span className="block text-[10px] text-[#94A3B8] uppercase tracking-wider font-semibold">Triage Integrity</span>
                <span className="text-lg font-bold font-mono text-green-400">HIGH</span>
              </div>
            </div>
          </div>

          {/* NASA Operations Task Table */}
          <div className="p-6 rounded-2xl bg-[#131A2A] border border-white/5 space-y-6 shadow-xl">
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider">
                  <ListTodo className="w-4 h-4 text-purple-400" />
                  MISSION CONTROL TASK MATRIX
                </h3>
                <p className="text-[10px] text-[#94A3B8]">Sprint components allocated specifically to minimize submission latency.</p>
              </div>
              <span className="px-2.5 py-0.5 rounded bg-purple-500/15 border border-purple-500/20 text-[10px] font-mono text-purple-400 uppercase font-black tracking-widest">
                STAGE_01_ENGAGED
              </span>
            </div>

            <div className="space-y-3">
              {criticalTasks.map((t, idx) => (
                <div 
                  key={idx} 
                  className={`p-3.5 rounded-xl border flex justify-between items-center transition-all ${
                    t.status === "DONE" 
                      ? "bg-green-500/5 border-green-500/20" 
                      : t.status === "DOING"
                      ? "bg-yellow-500/5 border-yellow-500/20 shadow-md shadow-yellow-500/5"
                      : "bg-black/30 border-white/5"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      t.status === "DONE" 
                        ? "bg-green-500/25 text-[#22C55E]" 
                        : t.status === "DOING"
                        ? "bg-yellow-500/25 text-[#F59E0B] animate-spin"
                        : "bg-white/5 text-white/40"
                    }`}>
                      {t.status === "DONE" ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <RefreshCw className="w-3 h-3" />
                      )}
                    </div>
                    <span className={`text-xs font-bold ${t.status === "DONE" ? "text-[#94A3B8] line-through" : "text-white"}`}>
                      {t.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 font-mono">
                    <span className="text-[10px] text-[#94A3B8] font-bold uppercase">{t.duration}</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-widest ${
                      t.status === "DONE" 
                        ? "bg-green-500/10 text-[#22C55E]" 
                        : t.status === "DOING"
                        ? "bg-yellow-500/10 text-[#F59E0B] animate-pulse"
                        : "bg-white/5 text-white/50"
                    }`}>
                      {t.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tactical Indicators & NASA Terminal logs (Right side: 4 cols) */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Mission Telemetry Indicators */}
          <div className="p-6 rounded-2xl bg-[#131A2A] border border-white/5 space-y-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-[-20%] right-[-20%] w-32 h-32 bg-purple-500/5 blur-2xl rounded-full" />
            
            <h3 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider flex items-center gap-2">
              <Radar className="w-4 h-4 text-purple-400" />
              THREAT MATRIX INDICES
            </h3>

            <div className="space-y-4">
              {[
                { label: "MILITARY FAILURE RISK", val: riskLevel, color: "from-red-500 to-rose-600" },
                { label: "SUCCESS FEASIBILITY INDEX", val: activeDl.successProbability ?? 65, color: "from-emerald-500 to-teal-500" },
                { label: "RECOVERY ROADMAP FLOW", val: activeDl.recoveryPotential ?? 75, color: "from-blue-500 to-indigo-600" }
              ].map((index, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between items-center text-[11px] font-mono font-bold text-[#94A3B8]">
                    <span>{index.label}</span>
                    <span className="text-white">{index.val}%</span>
                  </div>
                  <div className="w-full h-2 bg-black/45 rounded-full overflow-hidden border border-white/5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${index.val}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={`h-full rounded-full bg-gradient-to-r ${index.color}`}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-white/5 border border-white/5 rounded-xl space-y-1.5 text-left text-[10px] text-[#94A3B8] leading-normal italic font-mono">
              ⚡ COMPLIANCE NOTE: The failure envelope calculates dynamic scope leakage, delayed commits, and local distraction patterns continuously.
            </div>
          </div>

          {/* NASA Command Ticker Terminal Logs */}
          <div className="p-6 rounded-2xl bg-black/80 border border-white/10 space-y-4 shadow-2xl font-mono relative">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <span className="text-xs text-red-500 flex items-center gap-2 uppercase font-black tracking-widest">
                <Terminal className="w-4 h-4 text-red-500 shrink-0" />
                TELEMETRY CONSOLE LOGS
              </span>
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            </div>

            <div className="space-y-3 min-h-[140px] text-[10px] text-[#94A3B8] leading-relaxed select-none">
              {consoleLogs.map((log, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-purple-400 select-none">&gt;</span>
                  <p className="truncate-2-lines">{log}</p>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-white/10 flex justify-between items-center">
              <span className="text-[9px] text-white/30">BAUD RATE: 115200 KBPS</span>
              <span className="text-[9px] text-green-400/80 uppercase font-bold animate-pulse">● SECURE GATEWAY ACTIVE</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
