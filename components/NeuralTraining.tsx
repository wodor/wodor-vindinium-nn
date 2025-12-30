
import React, { useMemo } from 'react';
import { PopulationMember } from '../types';

interface NeuralTrainingProps {
  onDeploy: (modelId: string) => void;
  generation: number;
  avgFitness: number;
  population: PopulationMember[];
  isTurbo?: boolean;
}

const NeuralTraining: React.FC<NeuralTrainingProps> = ({ 
  onDeploy, 
  generation, 
  avgFitness, 
  population,
  isTurbo = false
}) => {
  const networkGraph = useMemo(() => {
    const visionInputs = 25; 
    const statInputs = 8;    
    const radarInputs = 8;
    const inputCount = visionInputs + statInputs + radarInputs;
    const hiddenCount = 12;  
    const outputCount = 5;

    return (
      <svg viewBox="0 0 400 280" className={`w-full h-auto transition-opacity duration-500 ${isTurbo ? 'opacity-100' : 'opacity-80'}`}>
        {/* Connections */}
        {Array.from({ length: 15 }).map((_, i) => {
          const inputIdx = Math.floor(Math.random() * inputCount);
          return Array.from({ length: hiddenCount }).map((_, j) => (
            <line 
              key={`l1-${inputIdx}-${j}`}
              x1={60} y1={15 + inputIdx * 6}
              x2={200} y2={40 + j * 16}
              stroke={isTurbo ? (inputIdx < 25 ? "rgba(34, 211, 238, 0.2)" : inputIdx < 33 ? "rgba(245, 158, 11, 0.2)" : "rgba(168, 85, 247, 0.2)") : "white"}
              strokeWidth="0.3"
              opacity={0.2}
              className="animate-pulse"
              style={{ animationDelay: `${Math.random() * 2}s` }}
            />
          ))
        })}
        
        {/* Input Nodes: Vision Group (Cyan) */}
        {Array.from({ length: visionInputs }).map((_, i) => (
          <circle key={`vis-${i}`} cx={60} cy={15 + i * 6} r="2" fill={isTurbo ? "#0891b2" : "#64748b"} />
        ))}
        {/* Input Nodes: Stats Group (Amber) */}
        {Array.from({ length: statInputs }).map((_, i) => (
          <circle key={`stat-${i}`} cx={60} cy={15 + (visionInputs + i) * 6 + 6} r="2.5" fill={isTurbo ? "#f59e0b" : "#b45309"} />
        ))}
        {/* Input Nodes: Radar Group (Purple) */}
        {Array.from({ length: radarInputs }).map((_, i) => (
          <circle key={`rad-${i}`} cx={60} cy={15 + (visionInputs + statInputs + i) * 6 + 12} r="2.5" fill={isTurbo ? "#a855f7" : "#7e22ce"} />
        ))}

        {/* Hidden Layer Nodes */}
        {Array.from({ length: hiddenCount }).map((_, i) => (
          <circle key={`hid-${i}`} cx={200} cy={40 + i * 16} r="4" fill={isTurbo ? "#22d3ee" : "#10b981"} />
        ))}

        {/* Output Layer Nodes */}
        {Array.from({ length: outputCount }).map((_, i) => (
          <circle key={`out-${i}`} cx={340} cy={70 + i * 30} r="5" fill="#f8fafc" className={isTurbo ? 'animate-pulse' : ''} />
        ))}

        {/* Labels */}
        <text x="5" y="80" transform="rotate(-90 5 80)" fill="#64748b" fontSize="7" fontWeight="black">5x5 VISION</text>
        <text x="5" y="180" transform="rotate(-90 5 180)" fill="#f59e0b" fontSize="7" fontWeight="black">HERO STATS</text>
        <text x="5" y="250" transform="rotate(-90 5 250)" fill="#a855f7" fontSize="7" fontWeight="black">LONG RADAR</text>
        <text x="350" y="135" fill="#f8fafc" fontSize="8" fontWeight="bold">MOVE VECTOR</text>
      </svg>
    );
  }, [generation, isTurbo]);

  return (
    <div className="space-y-6">
      <div className={`border rounded-2xl p-5 space-y-4 transition-all duration-500 bg-cyan-900/10 border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.05)]`}>
        <div className="flex justify-between items-end">
          <div>
            <div className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 text-cyan-400`}>
              Integrated Topology v4
            </div>
            <h2 className="text-2xl font-black text-white tracking-tighter flex items-center gap-2">
              Neural Network
              <span className="text-[10px] bg-cyan-400 text-slate-950 px-2 py-0.5 rounded-full uppercase font-bold tracking-tighter">Radar Enabled</span>
            </h2>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Generation</div>
            <div className={`text-xl font-mono font-bold text-cyan-400`}>#{generation}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
            <div className="text-[9px] text-slate-500 font-bold uppercase mb-2">Mean Fitness</div>
            <div className="text-lg font-mono font-bold text-white">{avgFitness.toFixed(2)}</div>
          </div>
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
            <div className="text-[9px] text-slate-500 font-bold uppercase mb-2">Total Inputs</div>
            <div className="text-lg font-mono font-bold text-white">41 Neurons</div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Active Population</h3>
        {population.map((agent, i) => (
          <div key={agent.id} className={`p-4 rounded-xl border flex items-center justify-between transition-all group ${
            agent.status === 'Elite' ? 'bg-cyan-500/5 border-cyan-500/30 shadow-sm' : 
            agent.status === 'Pruned' ? 'bg-slate-900/20 border-slate-800 opacity-40' : 'bg-slate-900/40 border-slate-800'
          }`}>
            <div className="flex items-center gap-4">
              <div className="text-xs font-mono text-slate-500">0{i+1}</div>
              <div>
                <div className="text-xs font-black text-white">{agent.id}</div>
                <div className="text-[9px] font-bold text-slate-500 uppercase">{agent.status}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <div className="text-[8px] text-slate-500 font-bold uppercase">Fitness</div>
                <div className="text-xs font-mono font-bold">{Math.round(agent.fitness)}</div>
              </div>
              
              {agent.status !== 'Pruned' && (
                <button 
                  onClick={() => onDeploy(agent.id)}
                  className={`px-3 py-1.5 text-slate-950 text-[9px] font-black uppercase rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-cyan-400`}
                >
                  Deploy Model
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className={`p-5 rounded-2xl border space-y-4 transition-all duration-500 bg-cyan-900/20 border-cyan-500/20`}>
        <div className="flex justify-between items-center">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Network Topology</h3>
          <div className="text-[8px] font-black text-purple-400 uppercase tracking-widest animate-pulse">Radar Active: 360° Scan</div>
        </div>
        <div className="bg-black/50 rounded-xl p-4 border border-slate-800 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/5 to-transparent animate-[shimmer_2s_infinite]"></div>
          {networkGraph}
        </div>
        <div className="space-y-2">
            <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
              The agent now uses <span className="text-purple-400 font-bold">Relative Radar</span> to navigate toward distant targets outside its 5x5 vision. 
            </p>
            <p className="text-[9px] text-slate-500 leading-relaxed italic">
              Inputs: Vision (25), Stats (8), Radar (8). Total: 41. Hidden: 16. Output: 5.
            </p>
        </div>
      </div>
      
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default NeuralTraining;
