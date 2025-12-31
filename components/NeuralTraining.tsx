
import React from 'react';
import { PopulationMember, SynthesisLog } from '../types';

interface NeuralTrainingProps {
  population: PopulationMember[];
  generation: number;
  history: number[];
  synthesisLogs: SynthesisLog[];
  isAutoEvolving: boolean;
  isTraining: boolean;
  selectedId: string | null;
  hiddenSize: number;
  numLayers: number;
  headlessMode: boolean;
  onToggleHeadless: () => void;
  onToggleAutoEvolve: () => void;
  onManualStep: () => void;
  onSelectSpecimen: (id: string) => void;
  onConfigChange: (size: number, layers: number) => void;
  onExportCandidate: (id: string) => void;
  onImportCandidate: (file: File) => void;
  fitnessWeights: { gold: number; mine: number; survival: number; combat: number };
}

const NeuralTraining: React.FC<NeuralTrainingProps> = ({ 
  population, 
  generation, 
  history, 
  synthesisLogs,
  isAutoEvolving, 
  isTraining,
  selectedId,
  hiddenSize,
  numLayers,
  headlessMode,
  onToggleHeadless,
  onToggleAutoEvolve,
  onManualStep,
  onSelectSpecimen,
  onConfigChange,
  onExportCandidate,
  onImportCandidate,
  fitnessWeights
}) => {
  const maxHistoryValue = Math.max(...history, 1);
  const activeSpecimen = population.find(p => p.id === selectedId) || population.sort((a, b) => b.fitness - a.fitness)[0];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-in fade-in duration-700">
      
      {/* Top Section: Dashboard Header & Stats */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-1 bg-slate-900/40 p-6 rounded-3xl border border-white/5 backdrop-blur-sm shadow-xl flex flex-col justify-between h-[180px]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-2.5 h-2.5 rounded-full ${isTraining ? 'bg-indigo-500 animate-pulse' : (isAutoEvolving ? 'bg-cyan-500 animate-pulse' : 'bg-slate-700')}`}></span>
              <h2 className="text-2xl font-black italic tracking-tighter text-white uppercase">Evolver_V1</h2>
            </div>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest leading-relaxed mb-4">
              {headlessMode ? 'Headless Simulation' : 'Heuristic Training'}
            </p>
          </div>
          
          <div className="space-y-2">
             <button 
              onClick={onToggleHeadless} 
              className={`w-full py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${headlessMode ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-slate-800 border-white/10 text-slate-400'}`}
             >
               {headlessMode ? 'Switch to Heuristic' : 'Enable Headless (4-Hero)'}
             </button>
             <button 
                onClick={onManualStep} 
                disabled={isTraining} 
                className={`w-full py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${isTraining ? 'bg-slate-800 text-slate-500 border-white/5 cursor-not-allowed' : 'bg-white text-slate-950 hover:scale-[1.02]'}`}
             >
               {isTraining ? 'Processing...' : 'Force Generation'}
             </button>
          </div>
        </div>

        <div className="xl:col-span-3 bg-slate-900/40 p-6 rounded-3xl border border-white/5 backdrop-blur-sm shadow-xl overflow-hidden flex flex-col min-h-[160px]">
            <div className="flex justify-between items-center mb-4">
                <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Average Population Fitness</div>
                <div className="text-[9px] font-mono text-cyan-400 font-bold">{history.length} EVALUATIONS</div>
            </div>
            <div className="flex-1 flex items-end gap-[1px] h-24 px-1">
              {history.map((val, i) => {
                const h = (val / maxHistoryValue) * 100;
                return (
                  <div 
                    key={i} 
                    className={`flex-1 transition-all rounded-t-[1px] ${headlessMode ? 'bg-indigo-500/30 hover:bg-indigo-400' : 'bg-cyan-500/20 hover:bg-cyan-400'}`} 
                    style={{ height: `${Math.max(4, h)}%` }}
                  ></div>
                );
              })}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Fitness Analytical Engine */}
        <div className="lg:col-span-8 bg-slate-900/60 p-8 rounded-[2.5rem] border border-cyan-500/20 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col gap-6">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase leading-none">Fitness_Engine</h3>
                <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                  Tactical Index for {activeSpecimen?.id}
                </p>
              </div>
              <div className="p-2.5 bg-black/40 border border-white/10 rounded-xl">
                 <div className="text-[7px] font-black text-slate-600 uppercase tracking-widest mb-1">Neural Policy Weighting</div>
                 <div className="text-[10px] font-mono font-bold text-cyan-400/80">
                   Σ (G*{fitnessWeights.gold.toFixed(1)} + M*{fitnessWeights.mine.toFixed(1)} + S*{fitnessWeights.survival.toFixed(1)} + A*{fitnessWeights.combat.toFixed(1)})
                 </div>
              </div>
            </div>

            <div className="w-full">
              {activeSpecimen?.fitnessBreakdown ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <MetricCard label="Gold Accumulation" value={activeSpecimen.fitnessBreakdown.gold} weight={fitnessWeights.gold} color="amber" desc="Efficiency of gold collection per turn." />
                    <MetricCard label="Asset Density" value={activeSpecimen.fitnessBreakdown.mines} weight={fitnessWeights.mine} color="emerald" desc="Mine acquisition and retention rates." />
                  </div>
                  <div className="space-y-4">
                    <MetricCard label="System Resilience" value={activeSpecimen.fitnessBreakdown.survival} weight={fitnessWeights.survival} color="blue" desc="HP management and Tavern frequency." />
                    <MetricCard label="Combat Dominance" value={activeSpecimen.fitnessBreakdown.combat} weight={fitnessWeights.combat} color="red" desc="Lethality and aggressive positioning." />
                  </div>
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center text-slate-700 font-black uppercase tracking-[0.3em] animate-pulse text-[10px]">Awaiting Telemetry...</div>
              )}
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4 bg-black/40 px-5 py-2.5 rounded-2xl border border-white/5 font-mono text-xs">
               <span className="text-slate-500 italic">Policy Fitness:</span>
               <span className="text-white font-black text-3xl ml-4">
                {isTraining && activeSpecimen?.status !== 'Elite_Specimen' ? '---' : activeSpecimen?.fitness.toLocaleString()}
                <span className="text-cyan-500 text-[10px] ml-1">PTS</span>
               </span>
            </div>
            <div className="text-right">
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Weights: {hiddenSize}U x {numLayers}L</span>
            </div>
          </div>
        </div>

        {/* Synthesis Logs */}
        <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="bg-slate-900/40 p-6 rounded-3xl border border-white/5 backdrop-blur-sm shadow-xl flex-1 max-h-[480px]">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 border-b border-white/5 pb-2">Synthesis Stream</h3>
                <div className="space-y-3 overflow-y-auto no-scrollbar pr-1 h-[calc(100%-40px)]">
                    {synthesisLogs.map((log, i) => (
                        <div key={i} className="p-3 rounded-xl bg-black/30 border border-white/5">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[8px] font-mono text-cyan-400 font-bold">GEN_{log.generation}</span>
                                <span className={`text-[8px] font-black uppercase ${log.totalFitnessDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {log.totalFitnessDelta >= 0 ? '+' : ''}{log.totalFitnessDelta.toFixed(0)} Δ
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[7px] font-mono text-slate-500 uppercase">
                                <div className="flex justify-between"><span>Gold</span><span className={log.deltas.gold >= 0 ? 'text-emerald-500' : 'text-red-500'}>{log.deltas.gold >= 0 ? '+' : ''}{log.deltas.gold}</span></div>
                                <div className="flex justify-between"><span>Mine</span><span className={log.deltas.mines >= 0 ? 'text-emerald-500' : 'text-red-500'}>{log.deltas.mines >= 0 ? '+' : ''}{log.deltas.mines}</span></div>
                                <div className="flex justify-between"><span>Life</span><span className={log.deltas.survival >= 0 ? 'text-emerald-500' : 'text-red-500'}>{log.deltas.survival >= 0 ? '+' : ''}{log.deltas.survival}</span></div>
                                <div className="flex justify-between"><span>Atk</span><span className={log.deltas.combat >= 0 ? 'text-emerald-500' : 'text-red-500'}>{log.deltas.combat >= 0 ? '+' : ''}{log.deltas.combat}</span></div>
                            </div>
                        </div>
                    ))}
                    {synthesisLogs.length === 0 && (
                        <div className="h-full flex items-center justify-center text-slate-700 font-black uppercase text-[9px] italic tracking-widest text-center">
                            Awaiting Pulse
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>

      {/* Population Grid */}
      <div className="space-y-4">
        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-4">
          Neural Pool ({population.length})
          <div className="h-px flex-1 bg-white/5"></div>
        </h4>
        <div className={`grid gap-4 ${population.length <= 4 ? 'grid-cols-4' : 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-8'}`}>
          {population.map((member) => {
            const isElite = member.status === 'Elite_Specimen';
            const isActive = selectedId === member.id || (!selectedId && isElite);
            const displayFitness = member.displayFitness ?? member.fitness;
            
            return (
              <div 
                  key={member.id} 
                  onClick={() => onSelectSpecimen(member.id)}
                  className={`p-4 rounded-2xl border flex flex-col justify-between cursor-pointer transition-all duration-300 min-h-[100px] ${
                      isActive 
                      ? 'bg-slate-900 border-cyan-500/60 ring-1 ring-cyan-500/20 shadow-lg shadow-cyan-500/5' 
                      : 'bg-slate-900/40 border-white/5 hover:border-white/20'
                  }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[8px] font-mono font-bold ${isActive ? 'text-cyan-400' : 'text-slate-500'}`}>S_{member.id.split('-')[1].replace('M', '')}</span>
                  {isElite && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"></span>}
                </div>
                <div>
                  <div className="text-[14px] font-mono font-black text-white">
                    {displayFitness.toLocaleString()}
                  </div>
                  <div className="text-[7px] text-slate-600 font-black uppercase mt-0.5 tracking-tighter">
                    {member.status.replace('_', ' ')}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ label, value, weight, color, desc }: { label: string, value: number, weight: number, color: string, desc: string }) => {
  const colors: Record<string, string> = {
    amber: 'bg-amber-400 shadow-amber-500/20',
    emerald: 'bg-emerald-400 shadow-emerald-500/20',
    blue: 'bg-blue-400 shadow-blue-500/20',
    red: 'bg-red-400 shadow-red-500/20'
  };
  const textColors: Record<string, string> = {
    amber: 'text-amber-400',
    emerald: 'text-emerald-400',
    blue: 'text-blue-400',
    red: 'text-red-400'
  };

  return (
    <div className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-2 group transition-all hover:bg-black/50">
      <div className="flex justify-between items-start">
        <div className="space-y-0.5">
          <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{label}</h4>
          <div className="text-lg font-black text-white">{value} <span className="text-[9px] text-slate-600 font-normal">/ 100</span></div>
        </div>
        <div className={`px-1.5 py-0.5 rounded-[4px] text-[8px] font-mono font-black ${textColors[color]} bg-white/5 border border-current opacity-70`}>x{weight.toFixed(1)}</div>
      </div>
      <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
        <div className={`${colors[color]} h-full transition-all duration-700`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      <p className="text-[7px] text-slate-600 italic uppercase tracking-tight">{desc}</p>
    </div>
  );
};

export default NeuralTraining;
