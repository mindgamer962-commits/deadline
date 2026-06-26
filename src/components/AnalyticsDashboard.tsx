import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { CheckSquare, Flame, BarChart2, ShieldAlert, Award } from "lucide-react";

interface AnalyticsDashboardProps {
  completedCount: number;
  savedCount: number;
  deadlinesCount: number;
}

export default function AnalyticsDashboard({
  completedCount = 8,
  savedCount = 4,
  deadlinesCount = 2
}: AnalyticsDashboardProps) {

  // Visual synthetic trend history
  const activeSeries = [
    { name: "Mon", riskThreshold: 85, successIndex: 35, savedQty: 0 },
    { name: "Tue", riskThreshold: 60, successIndex: 58, savedQty: 1 },
    { name: "Wed", riskThreshold: 75, successIndex: 48, savedQty: 1 },
    { name: "Thu", riskThreshold: 45, successIndex: 78, savedQty: 2 },
    { name: "Fri", riskThreshold: 30, successIndex: 85, savedQty: 3 },
    { name: "Sat", riskThreshold: 15, successIndex: 92, savedQty: 4 }
  ];

  return (
    <div className="p-6 rounded-2xl bg-[#131A2A] border border-white/5 space-y-6">
      
      {/* Title block */}
      <div>
        <h3 className="text-lg font-bold flex items-center gap-1.5 text-white">
          <BarChart2 className="w-5 h-5 text-[#C084FC]" />
          Productivity & Rescue Stats
        </h3>
        <p className="text-xs text-[#94A3B8]">
          Real-time metrics auditing your rescue counts and delivery rates.
        </p>
      </div>

      {/* KPI Numerical Metrics Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-1.5">
          <div className="flex justify-between items-center text-[#94A3B8]">
            <span className="text-[10px] uppercase font-bold tracking-widest">Tasks Completed</span>
            <CheckSquare className="w-4 h-4 text-[#22C55E]" />
          </div>
          <p className="text-2xl font-extrabold text-white">{completedCount + 12}</p>
          <span className="block text-[9px] text-[#22C55E]">+18% vs last week</span>
        </div>

        <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-1.5">
          <div className="flex justify-between items-center text-[#94A3B8]">
            <span className="text-[10px] uppercase font-bold tracking-widest">Deadlines Saved</span>
            <Flame className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-2xl font-extrabold text-white">{savedCount + 3}</p>
          <span className="block text-[9px] text-red-400">100% survival rate</span>
        </div>

        <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-1.5">
          <div className="flex justify-between items-center text-[#94A3B8]">
            <span className="text-[10px] uppercase font-bold tracking-widest">Active Tracked</span>
            <ShieldAlert className="w-4 h-4 text-[#C084FC]" />
          </div>
          <p className="text-2xl font-extrabold text-white">{deadlinesCount}</p>
          <span className="block text-[9px] text-[#A855F7]">Risk level: Safe</span>
        </div>

        <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-1.5">
          <div className="flex justify-between items-center text-[#94A3B8]">
            <span className="text-[10px] uppercase font-bold tracking-widest">Success Velocity</span>
            <Award className="w-4 h-4 text-yellow-400" />
          </div>
          <p className="text-2xl font-extrabold text-white">88/100</p>
          <span className="block text-[9px] text-yellow-400">Superior rating</span>
        </div>

      </div>

      {/* Chart visualization */}
      <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-3">
        <span className="block text-[10px] uppercase font-bold tracking-widest text-[#94A3B8] stroke-white/20">
          WEEKLY SURVIVAL TRENDS (FAILURE RISK VS SUCCESS INDEX)
        </span>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={activeSeries}>
              <defs>
                <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#7C3AED" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
              <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "#131A2A", 
                  borderColor: "rgba(255,255,255,0.1)", 
                  fontSize: "12px",
                  borderRadius: "8px" 
                }} 
              />
              <Area 
                type="monotone" 
                dataKey="successIndex" 
                stroke="#C084FC" 
                fillOpacity={1} 
                fill="url(#colorSuccess)" 
                strokeWidth={2}
                name="Success Index %"
              />
              <Area 
                type="monotone" 
                dataKey="riskThreshold" 
                stroke="#EF4444" 
                fillOpacity={1} 
                fill="url(#colorRisk)" 
                strokeWidth={1.5}
                name="Failure Risk %"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
