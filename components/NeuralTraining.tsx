
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
  onToggleAutoEvolve: () => void;
  onManualStep: () => void;
  onSelectSpecimen: (id: string) => void;
  onConfigChange: (size: number, layers: number) => void;
  onExportCandidate: (id: string) => void;
  onImportCandidate: (file: File) => void;
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
  onToggleAutoEvolve,
  onManualStep,
  onSelectSpecimen,
  onConfigChange,
  onExportCandidate,
  onImportCandidate
}) => {
  const maxHistoryValue = Math.max(...history, 1);
  const activeSpecimen = population.find(p => p.id === selectedId) || population.sort((a, b) => b.fitness - a.fitness)[0];

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 animate-in fade-in duration-1000">
      
      {/* Top Hero Section: Title and Historical Graph */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-1 bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800/50 backdrop-blur-sm shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-3 h-3 rounded-full ${isAutoEvolving ? 'bg-cyan-500 animate-pulse shadow-[0_0_10px_rgba(34,211,238,0.8)]' : 'bg-slate-700'}`}></span>
              <h2 className="text-3xl font-black italic tracking-tighter text-white uppercase">Neural_Evolver</h2>
            </div>
            <p className="text-slate-500 text-xs font-medium leading-relaxed mb-6">
              Weight synthesis active. Mutation Rate: 20%. Sigma: 0.08.
            </p>
          </div>
          
          <div className="space-y-3">
             <label className="flex items-center justify-center gap-2 w-full cursor-pointer px-6 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-[10px] font-black text-emerald-500 hover:bg-emerald-500/20 transition-all uppercase tracking-widest">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                Import Weights
                <input type="file" className="hidden" accept=".json" onChange={(e) => e.target.files?.[0] && onImportCandidate(e.target.files[0])} />
             </label>
             <button onClick={onManualStep} className="w-full py-3 bg-white text-slate-950 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all">Manual Synthesis Step</button>
          </div>
        </div>

        <div className="xl:col-span-2 bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800/50 backdrop-blur-sm shadow-2xl overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Historical Fitness progression</div>
                <div className="text-[10px] font-mono text-cyan-400 font-bold">{history.length} EVALS</div>
            </div>
            <div className="flex-1 flex items-end gap-[2px] h-32 px-1">
              {history.map((val, i) => {
                const h = (val / maxHistoryValue) * 100;
                return (
                  <div 
                    key={i} 
                    className="flex-1 bg-cyan-500/20 hover:bg-cyan-400 transition-all rounded-t-sm" 
                    style={{ height: `${Math.max(4, h)}%` }}
                  ></div>
                );
              })}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Fitness Analytical Engine */}
        <div className="lg:col-span-8 bg-slate-900/60 p-10 rounded-[3.5rem] border border-cyan-500/20 shadow-[0_0_50px_rgba(34,211,238,0.05)] backdrop-blur-xl">
          <div className="flex flex-col gap-8">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <h3 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none">Fitness_Engine</h3>
                <p className="text-slate-500 text-sm leading-relaxed font-medium">
                  Real-time behavior index for Specimen {activeSpecimen?.id}. Normalized to 100.
                </p>
              </div>
              <div className="hidden sm:block p-3 bg-black/40 border border-white/5 rounded-2xl">
                 <div className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em] mb-1">Strategy Formula</div>
                 <div className="text-[10px] font-mono font-bold text-cyan-400/80">
                   Σ (G*1.0 + M*15.0 + S*0.5 + A*4.0)
                 </div>
              </div>
            </div>

            <div className="w-full">
              {activeSpecimen?.fitnessBreakdown ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <MetricCard 
                      label="Gold Performance" 
                      value={activeSpecimen.fitnessBreakdown.gold} 
                      weight={1.0} 
                      color="amber" 
                      unit="Index" 
                      desc="Total gold accumulated relative to turn count."
                    />
                    <MetricCard 
                      label="Asset Acquisition" 
                      value={activeSpecimen.fitnessBreakdown.mines} 
                      weight={15.0} 
                      color="emerald" 
                      unit="Index" 
                      desc="Mining efficiency and ownership duration."
                    />
                  </div>
                  <div className="space-y-6">
                    <MetricCard 
                      label="Survival Efficiency" 
                      value={activeSpecimen.fitnessBreakdown.survival} 
                      weight={0.5} 
                      color="blue" 
                      unit="Index" 
                      desc="Average HP maintained vs lifecycle length."
                    />
                    <MetricCard 
                      label="Aggression Factor" 
                      value={activeSpecimen.fitnessBreakdown.combat} 
                      weight={4.0} 
                      color="red" 
                      unit="Index" 
                      desc="Successful hero engagements and damage dealt."
                    />
                  </div>
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-slate-700 font-black uppercase tracking-[0.5em] animate-pulse">Initializing Sensors...</div>
              )}
            </div>
          </div>
          
          <div className="mt-10 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4 bg-black/40 px-6 py-3 rounded-2xl border border-white/5 font-mono text-sm">
               <span className="text-slate-500 italic">Score Calculation:</span>
               <span className="text-cyan-400 font-bold">Σ (Perf_Score * Weight)</span>
            </div>
            <div className="flex items-end gap-3">
              <span className="text-5xl font-black text-white tracking-tighter">{activeSpecimen?.fitness.toLocaleString()}<span className="text-cyan-500 text-sm italic ml-2">PTS</span></span>
            </div>
          </div>
        </div>

        {/* Synthesis Logic Logs - Transparency into internals */}
        <div className="lg:col-span-4 space-y-8">
            <div className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800/50 backdrop-blur-sm shadow-xl flex flex-col h-[400px]">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">Synaptic Synthesis Log</h3>
                <div className="flex-1 overflow-y-auto pr-2 space-y-4 no-scrollbar">
                    {synthesisLogs.map((log, i) => (
                        <div key={i} className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-[9px] font-mono text-cyan-400 font-bold">GEN_{log.generation} SYNT</span>
                                <span className={`text-[9px] font-black uppercase ${log.totalFitnessDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {log.totalFitnessDelta >= 0 ? '+' : ''}{log.totalFitnessDelta.toFixed(0)} FIT
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[8px] font-mono text-slate-500 uppercase">
                                <div className="flex justify-between">
                                    <span>Gold_Δ</span>
                                    <span className={log.deltas.gold >= 0 ? 'text-emerald-500' : 'text-red-500'}>{log.deltas.gold >= 0 ? '+' : ''}{log.deltas.gold}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Mine_Δ</span>
                                    <span className={log.deltas.mines >= 0 ? 'text-emerald-500' : 'text-red-500'}>{log.deltas.mines >= 0 ? '+' : ''}{log.deltas.mines}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Surv_Δ</span>
                                    <span className={log.deltas.survival >= 0 ? 'text-emerald-500' : 'text-red-500'}>{log.deltas.survival >= 0 ? '+' : ''}{log.deltas.survival}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Atk_Δ</span>
                                    <span className={log.deltas.combat >= 0 ? 'text-emerald-500' : 'text-red-500'}>{log.deltas.combat >= 0 ? '+' : ''}{log.deltas.combat}</span>
                                </div>
                            </div>
                            <div className="h-0.5 w-full bg-white/5 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${log.totalFitnessDelta >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`} 
                                  style={{ width: `${Math.min(100, Math.abs(log.totalFitnessDelta) / 10)}%` }}
                                />
                            </div>
                        </div>
                    ))}
                    {synthesisLogs.length === 0 && (
                        <div className="h-full flex items-center justify-center text-slate-700 font-black uppercase text-[10px] italic tracking-widest text-center">
                            Initializing <br/> Synthesis Stream...
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-cyan-500/5 p-6 rounded-[2rem] border border-cyan-500/20 backdrop-blur-sm">
                <h4 className="text-[10px] font-black text-cyan-500 uppercase tracking-widest mb-3">Training Protocol</h4>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                   Every synthesis step runs a simulated batch of matches. <span className="text-slate-300">Gold Performance</span> is normalized against total available resources, while <span className="text-slate-300">Asset Acquisition</span> heavily weights early-game mine captures. Specimen mutation is based on elite-weighted crossover.
                </p>
            </div>
        </div>
      </div>

      {/* Population Explorer */}
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">Synaptic Population</h4>
          <div className="h-px flex-1 bg-gradient-to-r from-slate-800 to-transparent"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {population.map((member) => {
            const isElite = member.status === 'Elite_Specimen';
            const isActive = selectedId === member.id || (!selectedId && isElite);
            
            return (
              <div 
                  key={member.id} 
                  className={`p-6 rounded-3xl border space-y-4 relative overflow-hidden group transition-all duration-500 shadow-xl ${
                      isActive 
                      ? 'bg-slate-900/90 border-cyan-500/60 ring-2 ring-cyan-500/20' 
                      : 'bg-slate-900/60 border-slate-800/50 hover:bg-slate-900/80 hover:border-slate-700'
                  }`}
              >
                {isActive && <div className="absolute top-0 right-0 px-3 py-1 bg-cyan-500 text-[8px] font-black text-slate-950 uppercase tracking-widest rounded-bl-xl">ACTIVE</div>}
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-mono text-slate-500 font-bold">{member.id}</span>
                  <button onClick={() => onExportCandidate(member.id)} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>
                </div>
                <div>
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Fitness_Index</div>
                  <div className="text-2xl font-mono text-white font-black">{member.fitness.toLocaleString()}</div>
                </div>
                <div className="space-y-4 pt-2">
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-1000 ${isElite ? 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]' : 'bg-slate-600'}`} style={{ width: `${Math.min(100, (member.fitness / (Math.max(...population.map(p => p.fitness), 1))) * 100)}%` }}></div>
                    </div>
                    <button onClick={() => onSelectSpecimen(member.id)} disabled={isActive} className={`w-full py-2.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all ${isActive ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10 hover:text-white'}`}>
                      {isActive ? 'Deployed' : 'Deploy'}
                    </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Network Topology */}
      <div className="p-10 rounded-[3rem] bg-slate-950/50 border border-slate-800/80 border-dashed backdrop-blur-md">
        <div className="flex items-center gap-4 mb-8">
          <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">Network Topology Schema</h4>
          <div className="h-px flex-1 bg-gradient-to-r from-slate-800 to-transparent"></div>
        </div>
        <div className="flex flex-wrap justify-center items-center gap-8 text-center">
          <TopologyNode label="Input" size={48} sub="Vision + Radar" />
          <div className="text-slate-800 font-black text-2xl">→</div>
          <TopologyNode label="Hidden" size={hiddenSize} sub={`x${numLayers} Layers`} />
          <div className="text-slate-800 font-black text-2xl">→</div>
          <TopologyNode label="Output" size={5} sub="Action Logits" />
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ label, value, weight, color, unit, desc }: { label: string, value: number, weight: number, color: string, unit: string, desc: string }) => {
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
    <div className="p-5 rounded-2xl bg-black/30 border border-white/5 space-y-3 group hover:border-white/10 transition-all">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</h4>
          <div className="text-lg font-bold text-white">{value} <span className="text-[10px] text-slate-600 font-normal">/ 100</span></div>
        </div>
        <div className={`px-2 py-0.5 rounded text-[9px] font-mono font-black ${textColors[color]} bg-white/5 border border-current opacity-60`}>x{weight.toFixed(1)}</div>
      </div>
      <div className="h-1.5 bg-slate-800/50 rounded-full overflow-hidden">
        <div className={`${colors[color]} h-full transition-all duration-1000 shadow-[0_0_8px_rgba(0,0,0,0.5)]`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      <div className="flex justify-between items-center pt-1">
        <p className="text-[8px] text-slate-600 italic uppercase tracking-tight">{desc}</p>
        <div className="text-right text-[10px] font-mono text-slate-400">Contrib: <span className="text-white font-bold">{(value * weight).toFixed(0)}</span></div>
      </div>
    </div>
  );
};

const TopologyNode = ({ label, size, sub }: { label: string, size: number, sub: string }) => (
  <div className="p-8 rounded-3xl bg-slate-900/30 border border-white/5 group hover:border-cyan-500/20 transition-all min-w-[140px]">
    <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-3">{label}</div>
    <div className="text-5xl font-mono font-black text-white group-hover:text-cyan-400 transition-colors">{size}</div>
    <p className="text-[9px] text-slate-600 mt-2 italic">{sub}</p>
  </div>
);

export default NeuralTraining;
