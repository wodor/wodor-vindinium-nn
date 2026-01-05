
import React, { useState, useMemo, useCallback } from 'react';
import { StrategyPriorities, SavedCandidate, PopulationMember } from './types';
import { useEvolution } from './hooks/useEvolution';
import { useGameLoop } from './hooks/useGameLoop';
import { loadNNFromLocalStorage, getAllSavedNNs } from './services/nnStorage';
import Board from './components/Board';
import HeroStats from './components/HeroStats';
import StrategyLab from './components/StrategyLab';
import NeuralTraining from './components/NeuralTraining';
import NeuralNetworkVis from './components/NeuralNetworkVis';
import InferenceDataView from './components/InferenceDataView';
import SavedNNsPanel from './components/SavedNNsPanel';

const INITIAL_PRIORITIES: StrategyPriorities = {
  survival: 50,
  greed: 50,
  aggression: 20,
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'arena' | 'lab' | 'neural'>('arena');
  const priorities = INITIAL_PRIORITIES;
  const [heroNeuralWeights, setHeroNeuralWeights] = useState<Map<number, PopulationMember | null>>(new Map());
  const [heroSavedNNIds, setHeroSavedNNIds] = useState<Map<number, string>>(new Map());
  const [isPanelExpanded, setIsPanelExpanded] = useState(true);

  const {
    hiddenSize, numLayers, population, generation, history, isAutoEvolving, 
    isTraining, synthesisLogs, selectedSpecimenId, activeNeuralWeights,
    fitnessWeights, updateFitnessWeights,
    baseSimulations, eliteSimulations, setBaseSimulations, setEliteSimulations,
    compCostLimit, setCompCostLimit, currentCompCost,
    setIsAutoEvolving, resetEvolution, runEvolutionStep, loadBest, selectSpecimen,
    saveToLocalStorage, loadToArena, loadToNN, deleteFromLocalStorage, refreshSavedNNs,
    evaluateAgainstRandoms, isEvaluating, evaluationResults, savedNNs, loadedNNInfo,
    setHiddenSize, setNumLayers, toggleStar, gamesPerSecond, specimensPerSecond, generationsPerSecond
  } = useEvolution();

  const {
    gameState, setGameState, logs, setLogs, isAutoPlaying, setIsAutoPlaying, 
    lastDilemma, lastActivations, loading, useNeuralAgent,
    resetGame, step
  } = useGameLoop(heroNeuralWeights, priorities);

  const loadNNToHero = useCallback((heroId: number, nnId: string) => {
    const savedNN = savedNNs.find(nn => nn.id === nnId);
    const saved = loadNNFromLocalStorage(nnId);
    if (saved && savedNN) {
      const loadedConfig = saved.config || { hiddenSize, numLayers };
      const loadedGeneration = saved.generation || 0;
      
      const eliteMember: PopulationMember = {
        ...saved,
        id: `G${loadedGeneration}-M0`,
        status: 'Elite_Specimen',
        generation: loadedGeneration,
        config: loadedConfig,
        fitness: saved.fitness || saved.displayFitness || 0,
        displayFitness: saved.displayFitness || saved.fitness || 0,
        displayBreakdown: saved.displayBreakdown || saved.fitnessBreakdown
      };
      
      setHeroNeuralWeights(prev => {
        const newMap = new Map(prev);
        newMap.set(heroId, eliteMember);
        return newMap;
      });
      
      setHeroSavedNNIds(prev => {
        const newMap = new Map(prev);
        newMap.set(heroId, nnId);
        return newMap;
      });
      
      if (heroId === 1) {
        loadToArena(nnId);
      }
    }
  }, [savedNNs, hiddenSize, numLayers, loadToArena]);

  const hero1NN = heroNeuralWeights.get(1);
  const displayedNNInfo = hero1NN ? loadedNNInfo : null;

  const resetHeroToRandom = useCallback((heroId: number) => {
    setHeroNeuralWeights(prev => {
      const newMap = new Map(prev);
      newMap.set(heroId, null);
      return newMap;
    });
    setHeroSavedNNIds(prev => {
      const newMap = new Map(prev);
      newMap.delete(heroId);
      return newMap;
    });
  }, []);

  const hero1Logs = useMemo(() => logs.filter(l => l.heroId === 1), [logs]);

  const handleScenarioLoad = (state: any, gherkin?: string) => {
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
                <select 
                  value={hiddenSize} 
                  onChange={(e) => {
                    const newSize = parseInt(e.target.value);
                    if (!isNaN(newSize) && newSize !== hiddenSize) {
                      resetEvolution(newSize, numLayers, population.length);
                    }
                  }}
                  disabled={isTraining}
                  className="bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-[9px] font-mono font-bold text-cyan-400 outline-none cursor-pointer hover:bg-black/60 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {[8, 16, 32, 64, 128, 256].map(s => <option key={s} value={s} className="bg-slate-900">{s}U</option>)}
                </select>
                <select 
                  value={numLayers} 
                  onChange={(e) => {
                    const newLayers = parseInt(e.target.value);
                    if (!isNaN(newLayers) && newLayers !== numLayers) {
                      resetEvolution(hiddenSize, newLayers, population.length);
                    }
                  }}
                  disabled={isTraining}
                  className="bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-[9px] font-mono font-bold text-cyan-400 outline-none cursor-pointer hover:bg-black/60 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {[1, 2, 3, 4].map(l => <option key={l} value={l} className="bg-slate-900">{l}L</option>)}
                </select>
              </div>
            </div>
            <div className="flex flex-col">
               <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Weights</span>
               <div className="flex gap-1">
                 {(['gold','mine','survival','exploration'] as const).map(key => (
                   <div key={key} className="flex flex-col items-center">
                     <span className="text-[6px] font-black text-slate-600 uppercase tracking-widest leading-none mb-0.5">{key[0].toUpperCase()}</span>
                     <input
                       type="number"
                       step="0.1"
                       value={fitnessWeights[key]}
                       onChange={(e) => updateFitnessWeights({ [key]: parseFloat(e.target.value) || 0 })}
                       className="w-14 bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-[9px] font-mono font-bold text-cyan-400 outline-none"
                       aria-label={`${key}-weight`}
                     />
                   </div>
                 ))}
               </div>
            </div>
            <div className="flex flex-col">
               <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Simulations</span>
               <div className="flex gap-1">
                 <div className="flex flex-col items-center">
                   <span className="text-[6px] font-black text-slate-600 uppercase tracking-widest leading-none mb-0.5">Base</span>
                   <input
                     type="number"
                     step="1"
                     min="1"
                     value={baseSimulations}
                     onChange={(e) => setBaseSimulations(Math.max(1, parseInt(e.target.value) || 1))}
                     className="w-14 bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-[9px] font-mono font-bold text-cyan-400 outline-none"
                     aria-label="base-simulations"
                   />
                 </div>
                 <div className="flex flex-col items-center">
                   <span className="text-[6px] font-black text-slate-600 uppercase tracking-widest leading-none mb-0.5">Elite</span>
                   <input
                     type="number"
                     step="1"
                     min="1"
                     value={eliteSimulations}
                     onChange={(e) => setEliteSimulations(Math.max(1, parseInt(e.target.value) || 1))}
                     className="w-14 bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-[9px] font-mono font-bold text-cyan-400 outline-none"
                     aria-label="elite-simulations"
                   />
                 </div>
               </div>
            </div>
            <div className="flex flex-col">
               <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Comp Cost Limit</span>
               <div className="flex gap-1 items-center">
                 <input
                   type="number"
                   step="0.1"
                   min="0"
                   value={compCostLimit}
                   onChange={(e) => setCompCostLimit(Math.max(0, parseFloat(e.target.value) || 0))}
                   disabled={isTraining}
                   className="w-14 bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-[9px] font-mono font-bold text-cyan-400 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                   aria-label="comp-cost-limit"
                 />
                 <span className="text-[8px] font-mono text-slate-500 uppercase">Mcost</span>
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
              <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Save NN</span>
              <button 
                onClick={() => {
                  const bestMember = population.length > 0 
                    ? [...population].sort((a, b) => (b.displayFitness ?? b.fitness) - (a.displayFitness ?? a.fitness))[0]
                    : activeNeuralWeights;
                  if (bestMember) {
                    saveToLocalStorage(undefined, bestMember);
                  }
                }}
                disabled={!activeNeuralWeights && population.length === 0}
                className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest transition-all ${(!activeNeuralWeights && population.length === 0) ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20'}`}
              >
                Save
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
           {activeTab === 'arena' && (
             <div className="flex bg-white/5 p-1 rounded-lg border border-white/10 gap-1 mr-2">
                <button onClick={() => step(true)} disabled={loading || gameState.finished} className="px-3 py-1 bg-white text-slate-950 font-black rounded text-[8px] uppercase tracking-widest">Step</button>
                <button onClick={() => setIsAutoPlaying(!isAutoPlaying)} disabled={gameState.finished} className={`px-3 py-1 font-black rounded text-[8px] border transition-all uppercase tracking-widest ${isAutoPlaying ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-500'}`}>{isAutoPlaying ? 'Stop' : 'Run'}</button>
                <button onClick={() => {
                  resetGame();
                }} className="px-3 py-1 bg-slate-800/50 border border-slate-700 text-slate-400 font-black rounded text-[8px] uppercase tracking-widest">Clear</button>
             </div>
           )}
          <nav className="flex bg-black/40 p-1 rounded-lg border border-white/10 gap-1">
            {(['arena', 'lab', 'neural'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-1 rounded text-[8px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-slate-200 text-slate-950' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>{tab}</button>
            ))}
          </nav>
        </div>
      </header>

      <main className={`flex-1 max-w-[1800px] mx-auto p-4 w-full flex flex-col gap-4 overflow-hidden h-full relative transition-all duration-300 ${isPanelExpanded ? 'pr-[400px]' : 'pr-16'}`}>
        {activeTab === 'arena' && (
          <div className="flex flex-col gap-4 h-full overflow-hidden">
            <div className="flex items-center justify-between bg-slate-900/60 border border-white/5 rounded-xl p-4">
              <div className="flex flex-col">
                <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Active Specimen</span>
                <span className="text-[9px] font-mono text-cyan-400 font-bold uppercase">{heroNeuralWeights.get(1)?.id || 'NO_SIGNAL'}</span>
              </div>
            </div>
            <HeroStats 
              heroes={gameState.heroes} 
              heroNeuralWeights={heroNeuralWeights} 
              savedNNs={savedNNs} 
              heroSavedNNIds={heroSavedNNIds} 
              onResetHero={resetHeroToRandom}
              population={population}
              activeNeuralWeights={activeNeuralWeights}
              onLoadNNToHero={loadNNToHero}
              onLoadCurrentToHero={(heroId, member) => {
                saveToLocalStorage(undefined, member);
                const updatedNNs = getAllSavedNNs();
                const newlySavedNN = updatedNNs
                  .filter(nn => 
                    nn.member.generation === member.generation && 
                    nn.member.config?.hiddenSize === member.config?.hiddenSize &&
                    nn.member.config?.numLayers === member.config?.numLayers &&
                    Math.abs((nn.member.fitness || nn.member.displayFitness || 0) - (member.fitness || member.displayFitness || 0)) < 1
                  )
                  .sort((a, b) => b.timestamp - a.timestamp)[0];
                
                setHeroNeuralWeights(prev => {
                  const newMap = new Map(prev);
                  newMap.set(heroId, member);
                  return newMap;
                });
                setHeroSavedNNIds(prev => {
                  const newMap = new Map(prev);
                  if (newlySavedNN) {
                    newMap.set(heroId, newlySavedNN.id);
                  } else {
                    newMap.delete(heroId);
                  }
                  return newMap;
                });
              }}
            />
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
                      <span className="text-xl font-mono text-cyan-400 font-black leading-none">{(hero1NN?.fitness ?? 0).toLocaleString()}</span>
                    </div>
                    <div className="text-right flex flex-col items-end">
                       <span className="text-[7px] font-black text-slate-600 uppercase tracking-[0.2em]">Status</span>
                       <span className={`block text-[9px] font-bold uppercase px-2 py-0.5 rounded ${hero1NN ? 'text-white' : 'text-slate-500'}`}>{hero1NN?.status?.replace('_', ' ') || 'IDLE'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex-[2] bg-slate-900/60 border border-white/5 rounded-xl overflow-hidden flex flex-col shadow-lg shrink-0">
                   <div className="px-4 py-2 border-b border-white/5 bg-black/20 flex justify-between items-center">
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Neural Loop</span>
                      <span className="text-[7px] font-mono text-slate-600">INPUT → POLICY</span>
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
                      {hero1Logs.map((log, i) => (
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
            <StrategyLab 
              onLoadScenario={handleScenarioLoad} 
              activeAgent={activeNeuralWeights}
            />
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
              activeNeuralWeights={activeNeuralWeights}
              hiddenSize={hiddenSize} 
              numLayers={numLayers} 
              synthesisLogs={synthesisLogs} 
              onToggleAutoEvolve={() => setIsAutoEvolving(!isAutoEvolving)} 
              onSelectSpecimen={selectSpecimen} 
              onConfigChange={resetEvolution} 
              onExportCandidate={handleExportCandidate} 
             onImportCandidate={handleImportCandidate}
             fitnessWeights={fitnessWeights}
             onSaveToLocalStorage={saveToLocalStorage}
             gamesPerSecond={gamesPerSecond}
             specimensPerSecond={specimensPerSecond}
             generationsPerSecond={generationsPerSecond}
             />
           </div>
        )}
      </main>
      <SavedNNsPanel
        savedNNs={savedNNs}
        activeAgent={activeNeuralWeights}
        onLoadToArena={loadToArena}
        onLoadToHero={loadNNToHero}
        onDeleteFromLocalStorage={deleteFromLocalStorage}
        onEvaluate={evaluateAgainstRandoms}
        onLoadToTraining={(id) => {
          loadToNN(id);
          setActiveTab('neural');
        }}
        onToggleStar={toggleStar}
        isEvaluating={isEvaluating}
        evaluationResults={evaluationResults}
        isExpanded={isPanelExpanded}
        onToggleExpanded={() => setIsPanelExpanded(!isPanelExpanded)}
      />
    </div>
  );
};

export default App;
