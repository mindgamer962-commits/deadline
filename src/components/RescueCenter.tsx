import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { User } from "firebase/auth";
import { 
  Flame, Clock, ShieldCheck, ShieldAlert, HeartCrack, Rocket, 
  Trash2, Plus, Sparkles, LogOut, ChevronRight, CheckCircle2, 
  Tv, Timer, ListTodo, Route, Lightbulb, Brain
} from "lucide-react";
import { Deadline, RescuePlan } from "../types";

// Helper to classify deadlines into 8 required categories & colorings
function getCategoryAndIcon(title: string) {
  const t = (title || "").toLowerCase();
  if (t.includes("exam") || t.includes("test") || t.includes("quiz") || t.includes("midterm") || t.includes("final") || t.includes("study") || t.includes("revision") || t.includes("course")) {
    return { name: "Exam", color: "text-purple-400 bg-purple-500/10 border-purple-500/20" };
  }
  if (t.includes("interview") || t.includes("mock") || t.includes("hiring") || t.includes("recruiter") || t.includes("career") || t.includes("job") || t.includes("screening")) {
    return { name: "Interview", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
  }
  if (t.includes("hackathon") || t.includes("hack") || t.includes("jam") || t.includes("devpost") || t.includes("ideathon")) {
    return { name: "Hackathon", color: "text-orange-400 bg-orange-500/10 border-orange-500/20" };
  }
  if (t.includes("meeting") || t.includes("sync") || t.includes("standup") || t.includes("briefing") || t.includes("call") || t.includes("presentation") || t.includes("review") || t.includes("demo")) {
    return { name: "Meeting", color: "text-pink-400 bg-pink-500/10 border-pink-500/20" };
  }
  if (t.includes("bill") || t.includes("payment") || t.includes("pay") || t.includes("rent") || t.includes("invoice") || t.includes("subscription") || t.includes("tax")) {
    return { name: "Bill Payment", color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" };
  }
  if (t.includes("assignment") || t.includes("homework") || t.includes("essay") || t.includes("report") || t.includes("paper") || t.includes("turn in") || t.includes("submit") || t.includes("pset") || t.includes("p-set")) {
    return { name: "Assignment", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" };
  }
  if (t.includes("project") || t.includes("mvp") || t.includes("app") || t.includes("website") || t.includes("feature") || t.includes("build") || t.includes("deploy") || t.includes("repo") || t.includes("v1")) {
    return { name: "Project", color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" };
  }
  return { name: "Personal Goal", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" };
}

interface RescueCenterProps {
  user: User | null;
  score: number;
  status: "SAFE" | "AT RISK" | "CRITICAL";
  briefing: {
    priorities: string[];
    riskAlerts: string[];
    recommendedActions: string[];
    focusAreas: string[];
  };
  deadlines: Deadline[];
  onAddDeadlineClick: () => void;
  onDeleteDeadline: (id: string) => void;
  onSaveDeadlineClick: (deadline: Deadline) => void;
  onSignOut: () => void;
}

export default function RescueCenter({
  user,
  score,
  status,
  briefing,
  deadlines,
  onAddDeadlineClick,
  onDeleteDeadline,
  onSaveDeadlineClick,
  onSignOut
}: RescueCenterProps) {
  
  // Status Color Map
  const statusColors = {
    SAFE: {
      text: "text-[#22C55E]",
      bg: "bg-[#22C55E]/10",
      border: "border-[#22C55E]/20",
      glow: "shadow-[#22C55E]/10",
      icon: <ShieldCheck className="w-5 h-5 text-[#22C55E]" />,
      desc: "Workload is manageable. Keep executing consistently!"
    },
    "AT RISK": {
      text: "text-[#F59E0B]",
      bg: "bg-[#F59E0B]/10",
      border: "border-[#F59E0B]/20",
      glow: "shadow-[#F59E0B]/10",
      icon: <Clock className="w-5 h-5 text-[#F59E0B]" />,
      desc: "Warning: Impending deadlines require immediate acceleration!"
    },
    CRITICAL: {
      text: "text-[#EF4444]",
      bg: "bg-[#EF4444]/10",
      border: "border-[#EF4444]/20",
      glow: "shadow-[#EF4444]/25 animate-pulse",
      icon: <ShieldAlert className="w-5 h-5 text-[#EF4444]" />,
      desc: "EMERGENCY: Immediate strategic scope triage is mandatory!"
    }
  };

  const activeStatus = statusColors[status] || statusColors.SAFE;
  
  // Calculate gauge dashoffset for SVG ring (radius 40, circumference ~251.2)
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="space-y-8">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 rounded-2xl bg-[#131A2A] border border-white/5 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#7C3AED]/40">
            <img 
              src={user?.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80"} 
              alt="Avatar"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-1.5">
              <span>Greetings, {user?.displayName || "Deadline Champ"}</span>
              <Sparkles className="w-4 h-4 text-[#C084FC]" />
            </h2>
            <p className="text-xs text-[#94A3B8]">
              Your AI-Agent is loaded and actively scouring failure trajectories.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={onAddDeadlineClick}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#A855F7] hover:shadow-lg hover:shadow-purple-500/10 text-white font-medium text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Deadline</span>
          </button>
          
          <button
            onClick={onSignOut}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 hover:text-red-400 text-[#94A3B8] transition-all cursor-pointer border border-white/5"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Stats Cockpit */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Score Ring Gauge */}
        <div className="lg:col-span-4 p-6 rounded-2xl bg-[#131A2A] border border-white/5 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-[#7C3AED]/20" />
          
          <span className="text-xs uppercase font-extrabold tracking-widest text-[#94A3B8] mb-4">
            RESCUE SCORE INDEX
          </span>

          <div className="relative flex items-center justify-center w-40 h-40">
            {/* SVG Progress Ring */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="80"
                cy="80"
                r={radius}
                className="stroke-white/5 fill-transparent"
                strokeWidth="10"
              />
              <circle
                cx="80"
                cy="80"
                r={radius}
                className="stroke-[#7C3AED] fill-transparent"
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{ 
                  filter: `drop-shadow(0px 0px 8px ${status === "CRITICAL" ? "#EF4444" : "#7C3AED"})`,
                  stroke: status === "CRITICAL" ? "#EF4444" : status === "AT RISK" ? "#F59E0B" : "#22C55E",
                  transition: "stroke-dashoffset 0.8s ease-in-out" 
                }}
              />
            </svg>
            <div className="absolute text-center">
              <span className="block text-4xl font-extrabold">{score}</span>
              <span className="text-[10px] text-[#94A3B8] uppercase tracking-wider font-semibold">
                out of 100
              </span>
            </div>
          </div>

          <div className={`mt-6 px-4 py-1.5 rounded-full ${activeStatus.bg} ${activeStatus.border} border flex items-center gap-1.5`}>
            {activeStatus.icon}
            <span className={`text-xs font-black uppercase tracking-widest ${activeStatus.text}`}>
              {status}
            </span>
          </div>
          
          <p className="text-xs text-[#94A3B8] text-center mt-3 font-light px-2">
            {activeStatus.desc}
          </p>
        </div>

        {/* Daily Briefing Card */}
        <div className="lg:col-span-8 p-6 rounded-2xl bg-[#131A2A] border border-white/5 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#7C3AED]/5 blur-3xl pointer-events-none" />
          
          <div>
            <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
              <span className="text-xs uppercase font-extrabold tracking-widest text-[#94A3B8] flex items-center gap-1.5">
                <Rocket className="w-4 h-4 text-[#C084FC]" />
                DAILY RESCUE BRIEFING
              </span>
              <span className="text-[10px] bg-white/5 text-[#A855F7] px-2 py-0.5 rounded font-mono font-medium">
                Update Loop: Active
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="block text-[11px] font-extrabold text-[#C084FC] tracking-widest uppercase mb-1">
                  TODAY'S PRIORITIES
                </span>
                <ul className="space-y-1.5">
                  {briefing.priorities.map((item, idx) => (
                    <li key={idx} className="text-xs text-white flex items-start gap-2">
                      <span className="text-[#7C3AED] font-bold">▪</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <span className="block text-[11px] font-extrabold text-red-400 tracking-widest uppercase mb-1">
                  RISK ALERTS
                </span>
                <ul className="space-y-1.5">
                  {briefing.riskAlerts.map((item, idx) => (
                    <li key={idx} className="text-xs text-[#94A3B8] flex items-start gap-2">
                      <span className="text-red-500 font-bold">▪</span>
                      <span className="text-red-300">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-black/20 border border-white/5">
              <span className="block text-[9px] uppercase font-bold text-[#94A3B8] tracking-widest mb-1">
                RECOMMENDED ACTION
              </span>
              <p className="text-xs text-white leading-relaxed">
                {briefing.recommendedActions[0] || "Compile initial code scaffold and secure baseline deployment link."}
              </p>
            </div>
            
            <div className="p-3 rounded-xl bg-black/20 border border-white/5">
              <span className="block text-[9px] uppercase font-bold text-[#94A3B8] tracking-widest mb-1">
                FOCUS STREAK AREA
              </span>
              <p className="text-xs text-white leading-relaxed">
                {briefing.focusAreas[0] || "Tackle high difficulty modules in uninterrupted 50-minute Pomodoro zones."}
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Active Deadlines Recovery Desk */}
      <div className="p-6 rounded-2xl bg-[#131A2A] border border-white/5">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-bold">Active Tracked Deadlines</h3>
            <p className="text-xs text-[#94A3B8]">
              Manage target delivery dates and calculate instant triage roadmaps.
            </p>
          </div>
          <span className="text-xs bg-white/5 text-white/60 px-2.5 py-1 rounded-lg font-bold font-mono">
            {deadlines.length} Active
          </span>
        </div>

        {deadlines.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-xl bg-black/10">
            <Flame className="w-10 h-10 text-white/25 mb-3" />
            <p className="text-sm font-semibold text-white/50">No Active Deadlines Tracked yet.</p>
            <p className="text-xs text-[#94A3B8] mt-1 text-center max-w-sm px-4">
              Add your upcoming hackathons, exam dates, or assignments to start predicting risk.
            </p>
            <button
              onClick={onAddDeadlineClick}
              className="mt-4 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium text-xs border border-white/10 cursor-pointer"
            >
              Configure First Deadline
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {deadlines.map((item) => {
              const daysLeft = Math.round((new Date(item.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              const displayDays = daysLeft > 0 ? `${daysLeft} days` : daysLeft === 0 ? "Today" : "Overdue";
              
              const isAtCriticalRisk = (item.riskPercentage ?? 0) > 80;

              return (
                <div 
                  key={item.id} 
                  className={`p-5 rounded-xl bg-black/20 border ${isAtCriticalRisk ? 'border-red-500/30 bg-red-950/5' : 'border-white/5'} flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all hover:bg-black/30 relative overflow-hidden`}
                >
                  {isAtCriticalRisk && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 shadow-md shadow-red-500/50" />
                  )}
                  
                  <div className="space-y-2 flex-grow">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-white text-base">{item.title}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-widest ${
                        item.priority === "CRITICAL" ? "bg-red-500/20 text-red-400" :
                        item.priority === "HIGH" ? "bg-orange-500/20 text-orange-400" :
                        item.priority === "MEDIUM" ? "bg-yellow-500/20 text-yellow-400" :
                        "bg-blue-500/20 text-blue-400"
                      }`}>
                        {item.priority}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border uppercase tracking-widest flex items-center gap-1 ${
                        getCategoryAndIcon(item.title).color
                      }`}>
                        <Brain className="w-2.5 h-2.5" />
                        {getCategoryAndIcon(item.title).name}
                      </span>
                      {isAtCriticalRisk && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-widest bg-red-600 text-white animate-pulse">
                          CRITICAL RISK
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#94A3B8]">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#C084FC]" />
                        <span>Due Date: {new Date(item.date).toLocaleDateString()} ({displayDays})</span>
                      </span>
                      <span>•</span>
                      <span>Progress: {item.progress}%</span>
                      <span>•</span>
                      <span>Effort Score: {item.estimatedEffort}/10</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full max-w-md h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-[#7C3AED] to-[#C084FC]"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto self-stretch md:self-auto justify-end">
                    <div className="text-right shrink-0 mr-2 hidden sm:block">
                      <span className="block text-[10px] text-[#94A3B8] uppercase font-bold">Failure Probability</span>
                      <span className={`text-base font-black ${
                        (item.riskPercentage ?? 0) > 75 ? 'text-red-400' :
                        (item.riskPercentage ?? 0) > 45 ? 'text-orange-400' :
                        'text-green-400'
                      }`}>
                        {item.riskPercentage ?? 25}%
                      </span>
                    </div>

                    <button
                      onClick={() => onSaveDeadlineClick(item)}
                      className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all uppercase tracking-wider animate-pulse hover:animate-none"
                    >
                      <span>🚨 SAVE DEADLINE</span>
                    </button>

                    <button
                      onClick={() => onDeleteDeadline(item.id)}
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-red-500/15 text-[#94A3B8] hover:text-red-400 border border-white/5 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
