
import React, { useState } from 'react';
import { StrategyPriorities, SavedCandidate } from './types';
import { useEvolution } from './hooks/useEvolution';
import { useGameLoop } from './hooks/useGameLoop';
import Board from './components/Board';
import HeroStats from './components/HeroStats';
import StrategyLab from './components/StrategyLab';
import NeuralTraining from './components/NeuralTraining';
import NeuralNetworkVis from './components/NeuralNetworkVis';
import InferenceDataView from './components/InferenceDataView';

const INITIAL_PRIORITIES: StrategyPriorities = {
  survival: 50,
  greed: 50,
  aggression: 20,
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'arena' | 'lab' | 'neural'>('arena');
  const [priorities] = useState<StrategyPriorities>(INITIAL_PRIORITIES);

  const {
    hiddenSize, numLayers, population, generation, history, isAutoEvolving, 
    isTraining, synthesisLogs, selectedSpecimenId, activeNeuralWeights,
    headlessMode, toggleHeadless,
    setIsAutoEvolving, resetEvolution, runEvolutionStep, loadBest, selectSpecimen
  } = useEvolution();

  const {
    gameState, setGameState, logs, setLogs, isAutoPlaying, setIsAutoPlaying, 
    lastDilemma, lastActivations, loading, useNeuralAgent,
    resetGame, step
  } = useGameLoop(activeNeuralWeights, priorities);

  const handleScenarioLoad = (state: any) => {
    setGameState(state);
    setLogs([]);
    setIsAutoPlaying(false);
    setActiveTab('arena');
  };

  const handleExportCandidate = (id: string) => {
    const member = population.find(m => m.id === id) || activeNeuralWeights;
    if (!member) return;
    const blob = new Blob([JSON.stringify({ version: "1.0", member, config: member.config || { hiddenSize, numLayers }, timestamp: Date.now() }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vindinium-agent-${member.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCandidate = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as SavedCandidate;
        // In a real app we'd push this into the population state via the hook
        alert("Imported: " + data.member.id + ". (Weights available in logs if active)");
      } catch (err) { alert("Invalid candidate file."); }
    };
    reader.readAsText(file);
  };

  if (!gameState) return null;

  return (
    <div className="min-h-screen bg-[#050810] text-slate-100 font-sans flex flex-col h-screen overflow-hidden">
      <header className="border-b border-white/5 bg-slate-900/60 backdrop-blur-xl z-[100] px-6 py-2 flex justify-between items-center shadow-2xl shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚛️</span>
            <h1 className="text-base font-black tracking-tighter text-white uppercase italic leading-none">
              Vindinium <span className="text-cyan-400 font-mono text-[8px] not-italic font-bold border border-cyan-500/20 px-1 py-0.5 rounded ml-1">CORE_PROX</span>
            </h1>
          </div>
          <div className="h-6 w-px bg-white/10"></div>
          <div className="flex items-center gap-5">
            <div className="flex flex-col">
              <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Topology</span>
              <div className="flex gap-1">
                <select value={hiddenSize} onChange={(e) => resetEvolution(parseInt(e.target.value), numLayers, population.length)} className="bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-[9px] font-mono font-bold text-cyan-400 outline-none">
                  {[8, 16, 32, 64, 128].map(s => <option key={s} value={s} className="bg-slate-900">{s}U</option>)}
                </select>
                <select value={numLayers} onChange={(e) => resetEvolution(hiddenSize, parseInt(e.target.value), population.length)} className="bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-[9px] font-mono font-bold text-cyan-400 outline-none">
                  {[1, 2, 3].map(l => <option key={l} value={l} className="bg-slate-900">{l}L</option>)}
                </select>
              </div>
            </div>
            <div className="flex flex-col">
               <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Evolve</span>
               <button onClick={() => setIsAutoEvolving(!isAutoEvolving)} className={`flex items-center gap-1.5 px-2 py-1 rounded border transition-all ${isAutoEvolving ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-slate-800 border-white/10 text-slate-400'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isAutoEvolving ? 'bg-cyan-400 animate-pulse' : 'bg-slate-600'}`}></span>
                <span className="text-[8px] font-black uppercase">{isAutoEvolving ? 'ON' : 'OFF'}</span>
              </button>
            </div>
            <div className="flex flex-col">
              <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Gen</span>
              <span className="text-[10px] font-mono text-white font-black">{generation}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Active Specimen</span>
              <span className="text-[9px] font-mono text-cyan-400 font-bold uppercase">{activeNeuralWeights?.id || 'NO_SIGNAL'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
           {activeTab === 'arena' && (
             <div className="flex bg-white/5 p-1 rounded-lg border border-white/10 gap-1 mr-2">
                <button onClick={() => step(true)} disabled={loading || gameState.finished || !activeNeuralWeights} className="px-3 py-1 bg-white text-slate-950 font-black rounded text-[8px] uppercase tracking-widest">Step</button>
                <button onClick={() => setIsAutoPlaying(!isAutoPlaying)} disabled={gameState.finished || !activeNeuralWeights} className={`px-3 py-1 font-black rounded text-[8px] border transition-all uppercase tracking-widest ${isAutoPlaying ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-500'}`}>{isAutoPlaying ? 'Stop' : 'Run'}</button>
                <button onClick={loadBest} className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 font-black rounded text-[8px] uppercase tracking-widest">Sync</button>
                <button onClick={resetGame} className="px-3 py-1 bg-slate-800/50 border border-slate-700 text-slate-400 font-black rounded text-[8px] uppercase tracking-widest">Clear</button>
             </div>
           )}
          <nav className="flex bg-black/40 p-1 rounded-lg border border-white/10 gap-1">
            {(['arena', 'lab', 'neural'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-1 rounded text-[8px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-slate-200 text-slate-950' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>{tab}</button>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-[1800px] mx-auto p-4 w-full flex flex-col gap-4 overflow-hidden h-full">
        {activeTab === 'arena' && (
          <div className="flex flex-col gap-4 h-full overflow-hidden">
            <HeroStats heroes={gameState.heroes} />
            <div className="flex gap-4 flex-1 overflow-hidden">
              <div className="flex-[5] flex flex-col bg-slate-900/20 rounded-[1.5rem] border border-white/5 items-center justify-center relative shadow-inner overflow-hidden">
                <Board state={gameState} isTurbo={useNeuralAgent && isAutoPlaying} />
              </div>

              <div className="flex-[3] flex flex-col gap-3 overflow-hidden h-full">
                <div className="p-4 bg-slate-900/60 border border-white/5 rounded-xl flex flex-col gap-3 shadow-lg shrink-0">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Match Telemetry</span>
                    <span className="text-[9px] font-mono text-white font-bold">{gameState.turn} / {gameState.maxTurns}</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-cyan-500 h-full transition-all duration-300" style={{ width: `${(gameState.turn / gameState.maxTurns) * 100}%` }}></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-1 pt-2 border-t border-white/5">
                    <div className="flex flex-col">
                      <span className="text-[7px] font-black text-slate-600 uppercase tracking-[0.2em]">Fitness Score</span>
                      <span className="text-xl font-mono text-cyan-400 font-black leading-none">{activeNeuralWeights?.fitness.toLocaleString() || '0'}</span>
                    </div>
                    <div className="text-right flex flex-col items-end">
                       <span className="text-[7px] font-black text-slate-600 uppercase tracking-[0.2em]">Status</span>
                       <span className={`block text-[9px] font-bold uppercase px-2 py-0.5 rounded ${activeNeuralWeights ? 'text-white' : 'text-slate-500'}`}>{activeNeuralWeights?.status.replace('_', ' ') || 'IDLE'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex-[2] bg-slate-900/60 border border-white/5 rounded-xl overflow-hidden flex flex-col shadow-lg shrink-0">
                   <div className="px-4 py-2 border-b border-white/5 bg-black/20 flex justify-between items-center">
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Neural Loop</span>
                      <span className="text-[7px] font-mono text-slate-600">INPUT -> POLICY</span>
                   </div>
                   <div className="flex-1 p-3 flex items-center justify-center min-h-0">
                      <NeuralNetworkVis activations={lastActivations} />
                   </div>
                </div>

                <div className="flex-[5] bg-slate-900/60 border border-white/5 rounded-xl overflow-hidden flex flex-col shadow-lg min-h-0">
                   <div className="px-4 py-2 border-b border-white/5 bg-black/20 shrink-0">
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Inference stream</span>
                   </div>
                   <div className="flex-1 overflow-y-auto p-4 no-scrollbar space-y-4">
                      {logs.filter(l => l.heroId === 1).map((log, i) => (
                        <div key={i} className={`p-4 rounded-xl border ${log.isManual ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-black/40 border-white/5'} transition-all hover:bg-black/60 shadow-md`}>
                          <div className="flex justify-between items-center mb-4">
                            <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">TURN {log.turn}</span>
                            <div className="flex items-center gap-2">
                               <span className="text-[8px] font-bold text-slate-600 italic">Confidence {(log.decision.confidence * 100).toFixed(0)}%</span>
                               <span className="text-[10px] font-mono text-cyan-400 font-black px-3 py-1 bg-cyan-500/10 rounded-md border border-cyan-500/10 uppercase tracking-tighter">{log.decision.move}</span>
                            </div>
                          </div>
                          
                          <InferenceDataView decision={log.decision} />
                          
                          <div className="mt-4 pt-4 border-t border-white/5">
                             <p className="text-[9px] text-slate-500 italic leading-snug">"{log.decision.reasoning}"</p>
                          </div>
                        </div>
                      ))}
                   </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'lab' && (
          <div className="max-w-4xl mx-auto w-full p-8 bg-slate-900/60 border border-white/5 rounded-[2rem] overflow-y-auto no-scrollbar shadow-2xl h-full">
            <header className="mb-6 border-b border-white/5 pb-4"><h2 className="text-2xl font-black italic tracking-tighter text-cyan-300 uppercase">Scenario_Forge</h2><p className="text-slate-500 text-xs mt-1 uppercase font-bold tracking-widest">Stress-test agent policies.</p></header>
            <StrategyLab onLoadScenario={handleScenarioLoad} activeAgent={activeNeuralWeights} />
          </div>
        )}
        {activeTab === 'neural' && (
           <div className="h-full overflow-y-auto no-scrollbar pb-12 h-full">
             <NeuralTraining 
              population={population} 
              generation={generation} 
              history={history} 
              isAutoEvolving={isAutoEvolving} 
              isTraining={isTraining} 
              selectedId={selectedSpecimenId} 
              hiddenSize={hiddenSize} 
              numLayers={numLayers} 
              headlessMode={headlessMode}
              onToggleHeadless={toggleHeadless}
              synthesisLogs={synthesisLogs} 
              onToggleAutoEvolve={() => setIsAutoEvolving(!isAutoEvolving)} 
              onManualStep={runEvolutionStep} 
              onSelectSpecimen={selectSpecimen} 
              onConfigChange={resetEvolution} 
              onExportCandidate={handleExportCandidate} 
              onImportCandidate={handleImportCandidate} 
             />
           </div>
        )}
      </main>
    </div>
  );
};

export default App;
