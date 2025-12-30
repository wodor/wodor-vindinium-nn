
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, Move, StrategyPriorities, AIDecision, GameLog, PopulationMember, SavedCandidate, SynthesisLog } from './types';
import { GameEngine } from './services/gameEngine';
import { getAIDecision } from './services/geminiService';
import { NeuralEngine } from './services/neuralEngine';
import Board from './components/Board';
import HeroStats from './components/HeroStats';
import StrategyLab from './components/StrategyLab';
import NeuralTraining from './components/NeuralTraining';
import NeuralNetworkVis from './components/NeuralNetworkVis';

const INITIAL_PRIORITIES: StrategyPriorities = {
  survival: 50,
  greed: 50,
  aggression: 20,
};

const createInitialPopulation = (size: number, hiddenSize: number, layers: number): PopulationMember[] => 
  Array.from({ length: size }, (_, i) => ({
    id: `G0-M${i}`,
    fitness: 0, 
    accuracy: 0,
    status: 'Awaiting',
    weights: NeuralEngine.createRandomWeights(hiddenSize, layers),
    generation: 0,
    config: { hiddenSize, numLayers: layers },
    fitnessBreakdown: { gold: 0, mines: 0, survival: 0, combat: 0 }
  }));

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [priorities, setPriorities] = useState<StrategyPriorities>(INITIAL_PRIORITIES);
  const [logs, setLogs] = useState<GameLog[]>([]);
  const [synthesisLogs, setSynthesisLogs] = useState<SynthesisLog[]>([]);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false); 
  const [activeTab, setActiveTab] = useState<'arena' | 'lab' | 'neural'>('arena');
  const [lastDilemma, setLastDilemma] = useState<AIDecision['dilemma'] | null>(null);
  const [lastActivations, setLastActivations] = useState<number[][] | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [isStreamVisible, setIsStreamVisible] = useState(true);
  const [hiddenSize, setHiddenSize] = useState(16);
  const [numLayers, setNumLayers] = useState(1);
  const [population, setPopulation] = useState<PopulationMember[]>(() => createInitialPopulation(8, 16, 1));
  const [generation, setGeneration] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [isAutoEvolving, setIsAutoEvolving] = useState(true);
  const [isTraining, setIsTraining] = useState(false);
  const [useNeuralAgent, setUseNeuralAgent] = useState(true);
  const [selectedSpecimenId, setSelectedSpecimenId] = useState<string | null>(null);
  const [activeNeuralWeights, setActiveNeuralWeights] = useState<PopulationMember | null>(null);

  const autoPlayRef = useRef(false);
  autoPlayRef.current = isAutoPlaying;

  useEffect(() => {
    setGameState(GameEngine.createInitialState());
  }, []);

  const handleResetGame = useCallback(() => {
    setGameState(GameEngine.createInitialState());
    setLogs([]);
    setLastDilemma(null);
    setLastActivations(undefined);
    setIsAutoPlaying(false);
  }, []);

  const handleResetEvolution = useCallback((newSize: number, newLayers: number) => {
    setHiddenSize(newSize);
    setNumLayers(newLayers);
    setPopulation(createInitialPopulation(8, newSize, newLayers));
    setGeneration(0);
    setHistory([]);
    setSynthesisLogs([]);
    setSelectedSpecimenId(null);
    setActiveNeuralWeights(null);
    setIsAutoPlaying(false);
  }, []);

  const handleLoadBest = useCallback(() => {
    if (population.length === 0) return;
    const sorted = [...population].sort((a, b) => b.fitness - a.fitness);
    const best = sorted[0];
    setActiveNeuralWeights(best);
    setSelectedSpecimenId(best.id);
    setActiveTab('arena');
  }, [population]);

  const runEvolutionStep = useCallback(async () => {
    if (isTraining || population.length === 0) return;
    setIsTraining(true);
    
    // Cache the current best for accurate delta reporting
    const previousGenElite = population.find(p => p.status === 'Elite_Specimen') || population[0];
    
    // Simulate training latency
    await new Promise(resolve => setTimeout(resolve, 800));

    const progressFactor = Math.min(1.0, generation / 100);
    
    const evaluatedPop = population.map((member, idx) => {
      // Create simulated "behavioral archetypes" for variety
      const archetype = idx % 4; // 0: Greed, 1: Survival, 2: Aggressive, 3: Balanced
      
      let goldScore = 0, mineScore = 0, survivalScore = 0, combatScore = 0;
      
      const baseChance = 0.4 + (progressFactor * 0.5);
      
      switch(archetype) {
        case 0: // Greed focused
          goldScore = Math.floor(60 * baseChance + Math.random() * 40);
          mineScore = Math.floor(70 * baseChance + Math.random() * 30);
          survivalScore = Math.floor(20 * baseChance + Math.random() * 30);
          combatScore = Math.floor(10 * baseChance + Math.random() * 20);
          break;
        case 1: // Survival focused
          goldScore = Math.floor(30 * baseChance + Math.random() * 30);
          mineScore = Math.floor(20 * baseChance + Math.random() * 20);
          survivalScore = Math.floor(85 * baseChance + Math.random() * 15);
          combatScore = Math.floor(10 * baseChance + Math.random() * 20);
          break;
        case 2: // Aggressive
          goldScore = Math.floor(20 * baseChance + Math.random() * 40);
          mineScore = Math.floor(30 * baseChance + Math.random() * 30);
          survivalScore = Math.floor(30 * baseChance + Math.random() * 40);
          combatScore = Math.floor(75 * baseChance + Math.random() * 25);
          break;
        default: // Balanced
          goldScore = Math.floor(40 * baseChance + Math.random() * 30);
          mineScore = Math.floor(40 * baseChance + Math.random() * 30);
          survivalScore = Math.floor(40 * baseChance + Math.random() * 30);
          combatScore = Math.floor(40 * baseChance + Math.random() * 30);
      }

      const fitness = (goldScore * 1.0) + (mineScore * 15.0) + (survivalScore * 0.5) + (combatScore * 4.0);
      
      return { 
        ...member, 
        fitness: Math.floor(fitness), 
        status: 'Evaluated',
        fitnessBreakdown: { gold: goldScore, mines: mineScore, survival: survivalScore, combat: combatScore }
      };
    });

    const sorted = [...evaluatedPop].sort((a, b) => b.fitness - a.fitness);
    const topPerformer = sorted[0];
    
    const synthLog: SynthesisLog = {
      generation: generation + 1,
      mutationMagnitude: 0.2,
      deltas: {
        gold: topPerformer.fitnessBreakdown!.gold - (previousGenElite.fitnessBreakdown?.gold || 0),
        mines: topPerformer.fitnessBreakdown!.mines - (previousGenElite.fitnessBreakdown?.mines || 0),
        survival: topPerformer.fitnessBreakdown!.survival - (previousGenElite.fitnessBreakdown?.survival || 0),
        combat: topPerformer.fitnessBreakdown!.combat - (previousGenElite.fitnessBreakdown?.combat || 0),
      },
      totalFitnessDelta: topPerformer.fitness - previousGenElite.fitness,
      timestamp: Date.now()
    };
    
    setSynthesisLogs(prev => [synthLog, ...prev].slice(0, 50));
    setHistory(prev => [...prev, evaluatedPop.reduce((acc, m) => acc + m.fitness, 0) / evaluatedPop.length]);

    const nextGen = sorted.map((member, idx) => {
      const nextId = `G${generation + 1}-M${idx}`;
      if (idx === 0) return { ...member, status: 'Elite_Specimen', id: nextId, generation: generation + 1 };
      
      // Children inherit weights from elite with mutations
      return {
        ...member,
        id: nextId,
        weights: NeuralEngine.mutateWeights(topPerformer.weights, 0.2, 0.08),
        status: 'Mutated_Child',
        generation: generation + 1,
        // Carry forward the evaluation fitness so the UI doesn't zero out between steps
        fitness: member.fitness, 
        config: topPerformer.config
      };
    });

    setPopulation(nextGen);
    setGeneration(prev => prev + 1);
    setIsTraining(false);
  }, [population, generation, isTraining]);

  useEffect(() => {
    let timer: any;
    if (isAutoEvolving && !isTraining) {
      timer = setTimeout(runEvolutionStep, 1000);
    }
    return () => clearTimeout(timer);
  }, [isAutoEvolving, isTraining, generation, runEvolutionStep]);

  const handleStep = useCallback(async (isManual: boolean = false) => {
    if (!gameState || gameState.finished || loading || !activeNeuralWeights) return;
    setLoading(true);
    try {
      let currentState = gameState;
      const iterations = isManual ? 4 : 1;
      const newLogs: GameLog[] = [];

      for (let i = 0; i < iterations; i++) {
        if (currentState.finished) break;
        const heroId = (currentState.turn % 4) + 1;
        let decision: AIDecision;

        if (heroId === 1) {
          if (useNeuralAgent && activeNeuralWeights) {
              decision = await NeuralEngine.getInference(currentState, heroId, activeNeuralWeights.weights);
          } else {
              decision = await getAIDecision(currentState, heroId, priorities, Math.random() > 0.85);
              if (decision.dilemma) { setLastDilemma(decision.dilemma); setIsAutoPlaying(false); }
          }
          setLastActivations(decision.activations);
        } else {
          const moves = [Move.North, Move.South, Move.East, Move.West, Move.Stay];
          decision = { move: moves[Math.floor(Math.random() * moves.length)], reasoning: "Default bot behavior.", confidence: 0.5 };
        }

        const prevTurn = currentState.turn;
        currentState = GameEngine.applyMove(currentState, heroId, decision.move);
        newLogs.push({ turn: prevTurn, heroId, decision, timestamp: Date.now(), isManual: i === 0 && isManual && heroId === 1 });
      }

      setGameState(currentState);
      setLogs(prev => [...newLogs.reverse(), ...prev].slice(0, 100));
    } catch (error) { console.error(error); } finally { setLoading(false); }
  }, [gameState, priorities, loading, useNeuralAgent, activeNeuralWeights]);

  useEffect(() => {
    let interval: any;
    if (isAutoPlaying && gameState && !gameState.finished && !loading && !lastDilemma && activeNeuralWeights) {
      interval = setTimeout(() => handleStep(false), useNeuralAgent ? 80 : 800);
    }
    return () => clearTimeout(interval);
  }, [isAutoPlaying, gameState, loading, handleStep, lastDilemma, useNeuralAgent, activeNeuralWeights]);

  const handleScenarioLoad = (state: GameState) => {
    setGameState(state);
    setLogs([]);
    setLastDilemma(null);
    setIsAutoPlaying(false);
    setActiveTab('arena');
  };

  const handleSelectSpecimen = (id: string) => {
    setSelectedSpecimenId(id);
    const specimen = population.find(p => p.id === id);
    if (specimen) { setActiveNeuralWeights(specimen); setActiveTab('arena'); }
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
        const newMember = { ...data.member, id: `Imported-${data.member.id}`, status: 'Restored' };
        setPopulation(prev => [newMember, ...prev].slice(0, 12));
        setSelectedSpecimenId(newMember.id);
        setActiveNeuralWeights(newMember);
        setActiveTab('arena');
      } catch (err) { alert("Invalid candidate file."); }
    };
    reader.readAsText(file);
  };

  if (!gameState) return null;

  return (
    <div className="min-h-screen bg-[#050810] text-slate-100 font-sans selection:bg-cyan-500/30 overflow-x-hidden transition-all duration-700">
      <header className="border-b border-white/5 bg-slate-900/20 backdrop-blur-xl sticky top-0 z-50 px-8 py-3 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.1)]">
               <span className="text-xl text-slate-900">⚛️</span>
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tighter text-white uppercase italic leading-none">
                Vindinium <span className="text-cyan-400 font-mono text-[10px] ml-0.5 not-italic font-bold tracking-normal">CORE_PROX</span>
              </h1>
            </div>
          </div>

          <div className="h-8 w-px bg-white/10 mx-2"></div>

          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-xl border border-white/5">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">H_Size</span>
                <select 
                  value={hiddenSize} 
                  onChange={(e) => handleResetEvolution(parseInt(e.target.value), numLayers)}
                  className="bg-transparent text-cyan-400 text-xs font-mono font-bold focus:outline-none cursor-pointer"
                >
                  {[8, 16, 32, 64, 128, 256].map(s => <option key={s} value={s} className="bg-slate-900">{s}</option>)}
                </select>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Layers</span>
                <select 
                  value={numLayers} 
                  onChange={(e) => handleResetEvolution(hiddenSize, parseInt(e.target.value))}
                  className="bg-transparent text-cyan-400 text-xs font-mono font-bold focus:outline-none cursor-pointer"
                >
                  {[1, 2, 3].map(l => <option key={l} value={l} className="bg-slate-900">{l}L</option>)}
                </select>
             </div>

             <button 
                onClick={() => setIsAutoEvolving(!isAutoEvolving)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-xl border transition-all ${isAutoEvolving ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-slate-800 border-white/10 text-slate-400'}`}
             >
                <span className="text-xs">{isAutoEvolving ? '⏸' : '▶'}</span>
                <span className="text-[9px] font-black uppercase tracking-widest">{isAutoEvolving ? 'Evolving' : 'Halted'}</span>
             </button>

             <div className="bg-black/20 px-3 py-1.5 rounded-xl border border-white/5 flex items-center gap-2">
                <span className="text-[9px] font-black text-slate-600 uppercase">Gen</span>
                <span className="text-xs font-mono text-white font-bold">{generation}</span>
             </div>
          </div>
        </div>

        <nav className="flex bg-white/5 p-1 rounded-2xl border border-white/5 gap-1">
          {(['arena', 'lab', 'neural'] as const).map(tab => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)} 
              className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 ${activeTab === tab ? 'bg-white text-slate-950 shadow-[0_0_20px_rgba(255,255,255,0.2)] scale-105' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-[1800px] mx-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-3 space-y-8 animate-in slide-in-from-left-8 duration-700">
          <HeroStats heroes={gameState.heroes} />
          
          <div className="p-8 rounded-[2.5rem] bg-slate-900/30 border border-white/5 backdrop-blur-sm space-y-6">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Runtime</h3>
            <div className={`p-4 rounded-2xl border transition-all duration-500 ${useNeuralAgent ? 'bg-cyan-500/5 border-cyan-500/20' : 'bg-slate-800/20 border-white/5'}`}>
                <p className={`text-[10px] font-bold uppercase leading-tight tracking-tighter ${useNeuralAgent ? 'text-cyan-400' : 'text-slate-500'}`}>
                    Policy: {activeNeuralWeights ? `${activeNeuralWeights.id}` : 'UNINITIALIZED'}
                </p>
                <p className="text-[8px] text-slate-600 font-black uppercase tracking-widest mt-1">Gen {activeNeuralWeights?.generation || 0}</p>
            </div>
            <div className="p-4 bg-black/20 rounded-2xl border border-white/5">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Engagements</p>
                <div className="flex justify-between items-end">
                  <span className="text-xl font-mono font-black text-white">{gameState.turn}</span>
                  <span className="text-[10px] font-black text-slate-700">/ 300 MAX</span>
                </div>
            </div>
          </div>
        </div>

        <div className={`${isStreamVisible ? 'lg:col-span-6' : 'lg:col-span-9'} flex flex-col items-center space-y-8 transition-all duration-700`}>
          {activeTab === 'arena' && (
            <div className="w-full flex flex-col items-center animate-in zoom-in-95 duration-700">
              <div className="flex justify-between w-full max-w-[800px] px-2 mb-4">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Arena_Engaged</span>
                <span className="text-[10px] font-mono text-cyan-400 font-bold">{gameState.turn} / 300 TURNS</span>
              </div>
              <Board state={gameState} isTurbo={useNeuralAgent && isAutoPlaying} />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full mt-10">
                <button onClick={() => handleStep(true)} disabled={loading || gameState.finished || !activeNeuralWeights} className="px-6 py-4 bg-white text-slate-950 font-black rounded-2xl hover:scale-105 transition-all uppercase tracking-widest text-[10px] shadow-2xl">Step</button>
                <button onClick={() => setIsAutoPlaying(!isAutoPlaying)} disabled={gameState.finished || !activeNeuralWeights} className={`px-6 py-4 font-black rounded-2xl border transition-all uppercase tracking-widest text-[10px] shadow-2xl ${isAutoPlaying ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-500'}`}>{isAutoPlaying ? 'Pause' : 'Auto'}</button>
                <button onClick={handleLoadBest} className="px-6 py-4 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 font-black rounded-2xl uppercase tracking-widest text-[10px] shadow-2xl">Best Policy</button>
                <button onClick={handleResetGame} className="px-6 py-4 bg-slate-800/50 border border-slate-700 text-slate-400 font-black rounded-2xl uppercase tracking-widest text-[10px] shadow-2xl">Reset</button>
              </div>
              <div className="w-full mt-10">
                <NeuralNetworkVis activations={lastActivations} />
              </div>
            </div>
          )}

          {activeTab === 'lab' && (
            <div className="w-full max-w-2xl bg-slate-900/30 border border-white/5 p-12 rounded-[3.5rem] animate-in slide-in-from-bottom-12 duration-1000 backdrop-blur-xl">
              <h2 className="text-4xl font-black mb-3 italic tracking-tighter text-cyan-300">Scenario_Forge</h2>
              <StrategyLab onLoadScenario={handleScenarioLoad} activeAgent={activeNeuralWeights} />
            </div>
          )}

          {activeTab === 'neural' && (
             <div className="w-full animate-in fade-in duration-1000">
               <NeuralTraining 
                 population={population} generation={generation} history={history} isAutoEvolving={isAutoEvolving} isTraining={isTraining} 
                 selectedId={selectedSpecimenId} hiddenSize={hiddenSize} numLayers={numLayers} synthesisLogs={synthesisLogs}
                 onToggleAutoEvolve={() => setIsAutoEvolving(!isAutoEvolving)} onManualStep={runEvolutionStep}
                 onSelectSpecimen={handleSelectSpecimen} onConfigChange={handleResetEvolution}
                 onExportCandidate={handleExportCandidate} onImportCandidate={handleImportCandidate}
               />
             </div>
          )}
        </div>

        {isStreamVisible && (
          <div className="lg:col-span-3 transition-all duration-700">
            <div className="sticky top-28 space-y-6 animate-in slide-in-from-right-8 duration-700">
              <div className="flex justify-between items-center px-4">
                <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Inference Stream</h2>
              </div>
              <div className="space-y-4 max-h-[78vh] overflow-y-auto pr-4 no-scrollbar scroll-smooth pb-10">
                {logs.filter(l => l.heroId === 1).map((log, i) => (
                  <div key={i} className={`p-6 rounded-[2rem] border ${log.isManual ? 'bg-cyan-900/10 border-cyan-500/30' : 'bg-white/5 border-white/10'} shadow-xl`}>
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[9px] font-black uppercase text-white">Turn {log.turn}</span>
                      <span className="text-[10px] font-mono text-cyan-400 font-bold px-3 py-1 bg-cyan-500/10 rounded-full">{log.decision.move}</span>
                    </div>
                    
                    {log.decision.inputs && (
                      <div className="mt-4 p-4 rounded-2xl bg-black/40 border border-white/5 space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Full Synaptic Input (48)</h4>
                        </div>
                        
                        <div className="grid grid-cols-5 gap-0.5 w-24 mx-auto">
                            {log.decision.inputs.slice(0, 25).map((v, idx) => {
                              let char = '';
                              let bg = 'bg-slate-800/40';
                              let textCol = 'text-white/20';
                              
                              if (idx === 12) { char = 'H'; bg = 'bg-cyan-500'; textCol = 'text-slate-950'; }
                              else if (v === -1) { char = 'X'; bg = 'bg-slate-900'; textCol = 'text-slate-700'; }
                              else if (v === -0.8) { char = '#'; bg = 'bg-slate-700'; textCol = 'text-slate-400'; }
                              else if (v === 1.0) { char = 'T'; bg = 'bg-amber-500/30'; textCol = 'text-amber-400'; }
                              else if (v === 0.7) { char = '$'; bg = 'bg-slate-600/40'; textCol = 'text-slate-400'; }
                              else if (v === 0.9 || v === 0.3) { char = '$'; bg = 'bg-emerald-500/30'; textCol = 'text-emerald-400'; }
                              else if (v === -0.9) { char = '@'; bg = 'bg-red-500/30'; textCol = 'text-red-400'; }
                              
                              return (
                                <div key={idx} className={`aspect-square rounded-sm flex items-center justify-center text-[8px] font-black ${bg} ${textCol}`}>
                                  {char}
                                </div>
                              );
                            })}
                        </div>

                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[7px] font-mono border-t border-white/5 pt-3 uppercase">
                            <div className="flex justify-between col-span-2"><span className="text-slate-600">Unit 25-28 (HP):</span><span className="text-white">{log.decision.inputs[25].toFixed(2)} {log.decision.inputs[26].toFixed(2)} {log.decision.inputs[27].toFixed(2)} {log.decision.inputs[28].toFixed(2)}</span></div>
                            <div className="flex justify-between col-span-2"><span className="text-slate-600">Unit 29-32 (GLD):</span><span className="text-white">{log.decision.inputs[29].toFixed(2)} {log.decision.inputs[30].toFixed(2)} {log.decision.inputs[31].toFixed(2)} {log.decision.inputs[32].toFixed(2)}</span></div>
                            <div className="flex justify-between col-span-2 border-b border-white/5 pb-1 mb-1"><span className="text-slate-600">Unit 33-36 (MINE):</span><span className="text-white">{log.decision.inputs[33].toFixed(2)} {log.decision.inputs[34].toFixed(2)} {log.decision.inputs[35].toFixed(2)} {log.decision.inputs[36].toFixed(2)}</span></div>
                            
                            <div className="flex justify-between"><span className="text-slate-600">TAVERN:</span><span className="text-amber-400">{log.decision.inputs[37].toFixed(2)}, {log.decision.inputs[38].toFixed(2)}</span></div>
                            <div className="flex justify-between"><span className="text-slate-600">MINE:</span><span className="text-emerald-400">{log.decision.inputs[45].toFixed(2)}, {log.decision.inputs[46].toFixed(2)}</span></div>
                            <div className="flex justify-between"><span className="text-slate-600">HERO:</span><span className="text-red-400">{log.decision.inputs[43].toFixed(2)}, {log.decision.inputs[44].toFixed(2)}</span></div>
                            <div className="flex justify-between"><span className="text-slate-600">PROG:</span><span className="text-cyan-400">{(log.decision.inputs[47] * 100).toFixed(0)}%</span></div>
                        </div>

                        {log.decision.activations && (
                          <div className="border-t border-white/5 pt-3">
                            <h4 className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">Policy Distribution</h4>
                            <div className="flex justify-between items-end h-8 gap-1 px-2">
                              {log.decision.activations[log.decision.activations.length - 1].map((val, idx) => {
                                const h = Math.max(5, (val + 1) * 20); 
                                const isWinner = val === Math.max(...log.decision.activations![log.decision.activations!.length - 1]);
                                return (
                                  <div key={idx} className="flex-1 flex flex-col items-center">
                                    <div className={`w-full rounded-t-sm transition-all duration-500 ${isWinner ? 'bg-cyan-400' : 'bg-slate-700'}`} style={{ height: `${h}%` }}></div>
                                    <span className="text-[6px] font-bold text-slate-600 mt-1">{['N','S','E','W','H'][idx]}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <p className="text-slate-500 italic mt-4 leading-relaxed line-clamp-2" style={{ fontSize: '10px' }}>"{log.decision.reasoning}"</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
