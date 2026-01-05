
import React, { useEffect, useRef, useState } from 'react';
import { PopulationMember, SynthesisLog } from '../types';

interface NeuralTrainingProps {
  population: PopulationMember[];
  generation: number;
  history: Array<{
    fitness: number;
    gold: number;
    mines: number;
    survival: number;
    exploration: number;
  }>;
  synthesisLogs: SynthesisLog[];
  isAutoEvolving: boolean;
  isTraining: boolean;
  selectedId: string | null;
  activeNeuralWeights: PopulationMember | null;
  hiddenSize: number;
  numLayers: number;
  onToggleAutoEvolve: () => void;
  onSelectSpecimen: (id: string) => void;
  onConfigChange: (size: number, layers: number) => void;
  onExportCandidate: (id: string) => void;
  onImportCandidate: (file: File) => void;
  fitnessWeights: { gold: number; mine: number; survival: number; exploration: number };
  onSaveToLocalStorage: (name?: string, member?: PopulationMember) => void;
  gamesPerSecond: number;
  specimensPerSecond: number;
  generationsPerSecond: number;
}

const NeuralTraining: React.FC<NeuralTrainingProps> = ({ 
  population, 
  generation, 
  history, 
  synthesisLogs,
  isAutoEvolving, 
  isTraining,
  selectedId,
  activeNeuralWeights,
  hiddenSize,
  numLayers,
  onToggleAutoEvolve,
  onSelectSpecimen,
  onConfigChange,
  onExportCandidate,
  onImportCandidate,
  fitnessWeights,
  onSaveToLocalStorage,
  gamesPerSecond,
  specimensPerSecond,
  generationsPerSecond
}) => {
  const minHistoryValue = 0;
  const maxHistoryValue = 100;
  const historyRange = 100;
  const activeSpecimen = activeNeuralWeights || population.find(p => p.id === selectedId) || population.sort((a, b) => b.fitness - a.fitness)[0];
  const currentModelCost = activeSpecimen ? hiddenSize * numLayers * (activeSpecimen.gamesPlayed ?? 0) : 0;
  const [poolSnapshot, setPoolSnapshot] = useState<PopulationMember[]>(population);
  const lastPoolRefreshGenRef = useRef<number | null>(null);
  const policyHistoryRef = useRef<number[]>([]);
  const lastPolicyGenRef = useRef<number | null>(null);
  const [displayPolicyAvg, setDisplayPolicyAvg] = useState<number | null>(null);
  const [displayPolicySem, setDisplayPolicySem] = useState<number | null>(null);
  const [displayPolicyN, setDisplayPolicyN] = useState<number | null>(null);

  useEffect(() => {
    if (lastPoolRefreshGenRef.current === null || generation % 4 === 0) {
      if (lastPoolRefreshGenRef.current !== generation) {
        lastPoolRefreshGenRef.current = generation;
        setPoolSnapshot(population);
      }
    }
  }, [population, generation]);

  useEffect(() => {
    if (!activeSpecimen) return;
    if (lastPolicyGenRef.current === generation) return;
    lastPolicyGenRef.current = generation;

    const policyValue =
      activeSpecimen.fitnessMean !== undefined ? activeSpecimen.fitnessMean : activeSpecimen.fitness;
    policyHistoryRef.current = [...policyHistoryRef.current, policyValue].slice(-16);

    if (displayPolicyAvg === null || generation % 4 === 0) {
      const window = policyHistoryRef.current;
      const avg = window.reduce((sum, v) => sum + v, 0) / Math.max(1, window.length);

      const sem =
        activeSpecimen.displayVariance !== undefined &&
        activeSpecimen.displayVariance > 0 &&
        activeSpecimen.fitnessSamples !== undefined &&
        activeSpecimen.fitnessSamples > 0
          ? Math.sqrt(activeSpecimen.displayVariance) / Math.sqrt(activeSpecimen.fitnessSamples)
          : null;

      setDisplayPolicyAvg(avg);
      setDisplayPolicySem(sem);
      setDisplayPolicyN(activeSpecimen.fitnessSamples ?? null);
    }
  }, [activeSpecimen, generation, displayPolicyAvg]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-in fade-in duration-700">
      
      {/* Top Section: Dashboard Header & Stats */}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-slate-900/40 p-6 rounded-3xl border border-white/5 backdrop-blur-sm shadow-xl overflow-hidden flex flex-col min-h-[160px]">
            <div className="flex justify-between items-center mb-4">
                <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Average Population Fitness</div>
                <div className="flex items-center gap-4">
                  {gamesPerSecond > 0 && (
                    <div className="text-[9px] font-mono text-emerald-400 font-bold">
                      {gamesPerSecond.toFixed(1)} games/s
                    </div>
                  )}
                  {specimensPerSecond > 0 && (
                    <div className="text-[9px] font-mono text-blue-400 font-bold">
                      {specimensPerSecond.toFixed(1)} specs/s
                    </div>
                  )}
                  {generationsPerSecond > 0 && (
                    <div className="text-[9px] font-mono text-purple-400 font-bold">
                      {generationsPerSecond.toFixed(2)} gen/s
                    </div>
                  )}
                  {currentModelCost > 0 && (
                    <div className="text-[9px] font-mono text-orange-400 font-bold">
                      {(currentModelCost / 1000000).toFixed(3)} Mcost
                    </div>
                  )}
                  <div className="text-[9px] font-mono text-cyan-400 font-bold">{history.length} EVALUATIONS</div>
                </div>
            </div>
            <div className="relative h-24">
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                {history.length > 0 && (
                  <>
                    {/* Fitness line (cyan) */}
                    <polyline
                      fill="none"
                      stroke="rgb(6 182 212)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.9"
                      vectorEffect="non-scaling-stroke"
                      points={history.map((entry, i) => {
                        const x = (i / Math.max(1, history.length - 1)) * 100;
                        const y = 100 - (((entry.fitness - minHistoryValue) / historyRange) * 100);
                        return `${x},${y}`;
                      }).join(' ')}
                    />
                    <polyline
                      fill="none"
                      stroke="rgb(6 182 212)"
                      strokeWidth="1"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.3"
                      vectorEffect="non-scaling-stroke"
                      points={history.map((entry, i) => {
                        const x = (i / Math.max(1, history.length - 1)) * 100;
                        const y = 100 - (((entry.fitness - minHistoryValue) / historyRange) * 100);
                        return `${x},${y}`;
                      }).join(' ')}
                      filter="blur(2px)"
                    />
                    {/* Gold line (amber) */}
                    <polyline
                      fill="none"
                      stroke="rgb(251 191 36)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.7"
                      vectorEffect="non-scaling-stroke"
                      points={history.map((entry, i) => {
                        const x = (i / Math.max(1, history.length - 1)) * 100;
                        const y = 100 - (((entry.gold - minHistoryValue) / historyRange) * 100);
                        return `${x},${y}`;
                      }).join(' ')}
                    />
                    {/* Mines line (emerald) */}
                    <polyline
                      fill="none"
                      stroke="rgb(52 211 153)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.7"
                      vectorEffect="non-scaling-stroke"
                      points={history.map((entry, i) => {
                        const x = (i / Math.max(1, history.length - 1)) * 100;
                        const y = 100 - (((entry.mines - minHistoryValue) / historyRange) * 100);
                        return `${x},${y}`;
                      }).join(' ')}
                    />
                    {/* Survival line (blue) */}
                    <polyline
                      fill="none"
                      stroke="rgb(96 165 250)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.7"
                      vectorEffect="non-scaling-stroke"
                      points={history.map((entry, i) => {
                        const x = (i / Math.max(1, history.length - 1)) * 100;
                        const y = 100 - (((entry.survival - minHistoryValue) / historyRange) * 100);
                        return `${x},${y}`;
                      }).join(' ')}
                    />
                    {/* Exploration line (red) */}
                    <polyline
                      fill="none"
                      stroke="rgb(248 113 113)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.7"
                      vectorEffect="non-scaling-stroke"
                      points={history.map((entry, i) => {
                        const x = (i / Math.max(1, history.length - 1)) * 100;
                        const y = 100 - (((entry.exploration - minHistoryValue) / historyRange) * 100);
                        return `${x},${y}`;
                      }).join(' ')}
                    />
                  </>
                )}
              </svg>
            </div>
            {history.length > 0 && (
              <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 pt-3 border-t border-white/5">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 bg-cyan-400"></div>
                  <span className="text-[7px] font-mono text-slate-500 uppercase">Fitness</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 bg-amber-400"></div>
                  <span className="text-[7px] font-mono text-slate-500 uppercase">Gold</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 bg-emerald-400"></div>
                  <span className="text-[7px] font-mono text-slate-500 uppercase">Mines</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 bg-blue-400"></div>
                  <span className="text-[7px] font-mono text-slate-500 uppercase">Survival</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 bg-red-400"></div>
                  <span className="text-[7px] font-mono text-slate-500 uppercase">Exploration</span>
                </div>
              </div>
            )}
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
                   Σ (G*{fitnessWeights.gold.toFixed(1)} + M*{fitnessWeights.mine.toFixed(1)} + S*{fitnessWeights.survival.toFixed(1)} + E*{fitnessWeights.exploration.toFixed(1)})
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
                    <MetricCard label="survival" value={activeSpecimen.fitnessBreakdown.survival} weight={fitnessWeights.survival} color="blue" desc="HP management and Tavern frequency." />
                    <MetricCard label="Map Exploration" value={activeSpecimen.fitnessBreakdown.exploration ?? 0} weight={fitnessWeights.exploration} color="red" desc="Unique tiles visited minus staying still penalty." />
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
                {isTraining && activeSpecimen?.status !== 'Elite_Specimen' ? '---' : (
                  <>
                    {(displayPolicyAvg ?? (activeSpecimen?.fitnessMean ?? activeSpecimen?.fitness))?.toFixed(0)}
                    {displayPolicySem !== null && (
                      <span className="text-slate-500 text-[12px] ml-2 font-normal">
                        ±{displayPolicySem.toFixed(2)}
                      </span>
                    )}
                    {displayPolicyN !== null && (
                      <span className="text-slate-600 text-[12px] ml-2 font-normal">
                        n={displayPolicyN}
                      </span>
                    )}
                    <span className="text-cyan-500 text-[10px] ml-1">PTS</span>
                  </>
                )}
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
          Neural Pool ({poolSnapshot.length})
          <div className="h-px flex-1 bg-white/5"></div>
        </h4>
        <div className={`grid gap-4 ${poolSnapshot.length <= 4 ? 'grid-cols-4' : 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-8'}`}>
          {poolSnapshot.map((member) => {
            const isElite = member.status === 'Elite_Specimen';
            const isActive = (activeSpecimen?.id === member.id) || (!selectedId && isElite);
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
