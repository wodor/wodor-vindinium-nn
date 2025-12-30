
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, Move, StrategyPriorities, AIDecision, GameLog, PopulationMember } from './types';
import { GameEngine } from './services/gameEngine';
import { getAIDecision } from './services/geminiService';
import { NeuralEngine } from './services/neuralEngine';
import Board from './components/Board';
import HeroStats from './components/HeroStats';
import PythonSketch from './components/PythonSketch';
import StrategyLab from './components/StrategyLab';
import NeuralTraining from './components/NeuralTraining';
import NeuralNetworkVis from './components/NeuralNetworkVis';

const INITIAL_PRIORITIES: StrategyPriorities = {
  survival: 50,
  greed: 50,
  aggression: 20,
};

// Seed initial population immediately to avoid empty states
const INITIAL_POPULATION: PopulationMember[] = Array.from({ length: 8 }, (_, i) => ({
  id: `G0-M${i}`,
  fitness: 0,
  accuracy: 0,
  status: 'Awaiting',
  weights: NeuralEngine.createRandomWeights(),
  generation: 0
}));

const App: React.FC = () => {
  // Game State
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [priorities, setPriorities] = useState<StrategyPriorities>(INITIAL_PRIORITIES);
  const [logs, setLogs] = useState<GameLog[]>([]);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true); 
  const [activeTab, setActiveTab] = useState<'arena' | 'lab' | 'neural'>('arena');
  const [lastDilemma, setLastDilemma] = useState<AIDecision['dilemma'] | null>(null);
  const [lastActivations, setLastActivations] = useState<number[] | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  
  // Neural Evolution Persistent State (Background Engine)
  const [population, setPopulation] = useState<PopulationMember[]>(INITIAL_POPULATION);
  const [generation, setGeneration] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [isAutoEvolving, setIsAutoEvolving] = useState(true);
  const [isTraining, setIsTraining] = useState(false);
  const [useNeuralAgent, setUseNeuralAgent] = useState(true);
  const [activeNeuralWeights, setActiveNeuralWeights] = useState<PopulationMember | null>(INITIAL_POPULATION[0]);

  const autoPlayRef = useRef(false);
  autoPlayRef.current = isAutoPlaying;

  // Initialize Game
  useEffect(() => {
    setGameState(GameEngine.createInitialState());
  }, []);

  // Background Evolutionary Cycle
  const runEvolutionStep = useCallback(async () => {
    if (isTraining || population.length === 0) return;
    setIsTraining(true);
    
    // Simulate training computation
    await new Promise(resolve => setTimeout(resolve, 600));

    const evaluatedPop = population.map(member => {
      // Logic simulation: Fitness grows over generations with some stochastic noise
      const noise = Math.random() * 30;
      const progress = generation * 2.5;
      const growth = Math.floor(noise + progress + 5);
      return { ...member, fitness: member.fitness + growth, status: 'Evaluated' };
    });

    const sorted = [...evaluatedPop].sort((a, b) => b.fitness - a.fitness);
    const topPerformer = sorted[0];
    
    // Auto-deploy the latest elite to the active agent
    setActiveNeuralWeights(topPerformer);

    const avgFitness = evaluatedPop.reduce((acc, m) => acc + m.fitness, 0) / evaluatedPop.length;
    setHistory(prev => [...prev, avgFitness].slice(-60));

    const nextGen = sorted.map((member, idx) => {
      const nextId = `G${generation + 1}-M${idx}`;
      if (idx === 0) return { ...member, status: 'Elite_Specimen', id: nextId, generation: generation + 1 };
      
      return {
        ...member,
        id: nextId,
        weights: NeuralEngine.mutateWeights(topPerformer.weights, 0.25, 0.15),
        status: 'Mutated_Child',
        generation: generation + 1,
        fitness: Math.floor(topPerformer.fitness * 0.9)
      };
    });

    setPopulation(nextGen);
    setGeneration(prev => prev + 1);
    setIsTraining(false);
  }, [population, generation, isTraining]);

  // Persistent Evolution Loop
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isAutoEvolving && !isTraining) {
      timer = setTimeout(() => {
        runEvolutionStep();
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [isAutoEvolving, isTraining, generation, runEvolutionStep]);

  // Game Interaction logic
  const handleStep = useCallback(async () => {
    if (!gameState || gameState.finished || loading) return;

    setLoading(true);
    try {
      const heroId = (gameState.turn % 4) + 1;
      let decision: AIDecision;

      if (heroId === 1) {
        if (useNeuralAgent && activeNeuralWeights) {
            decision = await NeuralEngine.getInference(gameState, heroId, activeNeuralWeights.weights);
        } else {
            decision = await getAIDecision(gameState, heroId, priorities, Math.random() > 0.85);
            if (decision.dilemma) {
                setLastDilemma(decision.dilemma);
                if (autoPlayRef.current) setIsAutoPlaying(false);
            }
        }
        setLastActivations(decision.activations);
      } else {
        // Simple random moves for bots
        const moves = [Move.North, Move.South, Move.East, Move.West, Move.Stay];
        decision = {
          move: moves[Math.floor(Math.random() * moves.length)],
          reasoning: "Executing default behavioral pattern.",
          confidence: 0.5
        };
      }

      const nextState = GameEngine.applyMove(gameState, heroId, decision.move);
      setGameState(nextState);
      
      setLogs(prev => [{
        turn: gameState.turn,
        heroId,
        decision,
        timestamp: Date.now()
      }, ...prev].slice(0, 40));

    } catch (error) {
      console.error("Simulation engine failure:", error);
    } finally {
      setLoading(false);
    }
  }, [gameState, priorities, loading, useNeuralAgent, activeNeuralWeights]);

  // Auto-play game loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAutoPlaying && gameState && !gameState.finished && !loading && !lastDilemma) {
      interval = setTimeout(() => {
        handleStep();
      }, useNeuralAgent ? 150 : 800);
    }
    return () => clearTimeout(interval);
  }, [isAutoPlaying, gameState, loading, handleStep, lastDilemma, useNeuralAgent]);

  const handleDilemmaChoice = (choicePriorities: StrategyPriorities) => {
    setPriorities(choicePriorities);
    setLastDilemma(null);
    setIsAutoPlaying(true); 
  };

  const handleScenarioLoad = (state: GameState) => {
    setGameState(state);
    setLogs([]);
    setLastDilemma(null);
    setActiveTab('arena');
  };

  if (!gameState) return null;

  return (
    <div className="min-h-screen bg-[#050810] text-slate-100 font-sans selection:bg-cyan-500/30 overflow-x-hidden">
      <header className="border-b border-white/5 bg-slate-900/20 backdrop-blur-xl sticky top-0 z-50 px-8 py-5 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.1)]">
             <span className="text-2xl text-slate-900">⚛️</span>
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-white uppercase italic leading-none">
              Vindinium <span className="text-cyan-400 font-mono text-xs ml-1 not-italic font-bold">CORE_PROX</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mt-1 opacity-60">Neural Agentic Framework</p>
          </div>
        </div>

        <nav className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
          {(['arena', 'lab', 'neural'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 ${
                activeTab === tab 
                  ? 'bg-white text-slate-950 shadow-[0_0_30px_rgba(255,255,255,0.2)] scale-105' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-[1800px] mx-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Telemetry Column */}
        <div className="lg:col-span-3 space-y-8 animate-in slide-in-from-left-8 duration-700">
          <HeroStats heroes={gameState.heroes} />
          
          <div className="p-8 rounded-[2.5rem] bg-slate-900/30 border border-white/5 backdrop-blur-sm space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Global Heuristics</h3>
              <div className="flex items-center gap-2">
                 <span className="text-[9px] text-slate-600 font-bold uppercase">AI Swap</span>
                 <button 
                   onClick={() => setUseNeuralAgent(!useNeuralAgent)}
                   className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${useNeuralAgent ? 'bg-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.4)]' : 'bg-slate-800'}`}
                 >
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300 ${useNeuralAgent ? 'left-6' : 'left-1'}`}></div>
                 </button>
              </div>
            </div>
            
            {(Object.keys(priorities) as Array<keyof StrategyPriorities>).map((key) => (
              <div key={key} className="space-y-3">
                <div className="flex justify-between text-[10px] font-black uppercase text-slate-400">
                  <span className="tracking-widest">{key}</span>
                  <span className="text-white font-mono">{priorities[key]}%</span>
                </div>
                <input 
                  type="range"
                  min="0"
                  max="100"
                  disabled={useNeuralAgent}
                  value={priorities[key]}
                  onChange={(e) => setPriorities(prev => ({ ...prev, [key]: parseInt(e.target.value) }))}
                  className="w-full accent-white bg-slate-800 rounded-full h-1 appearance-none cursor-pointer opacity-80 hover:opacity-100 disabled:opacity-20"
                />
              </div>
            ))}
            
            <div className={`p-4 rounded-2xl border transition-all duration-500 ${useNeuralAgent ? 'bg-cyan-500/5 border-cyan-500/20' : 'bg-slate-800/20 border-white/5'}`}>
                <p className={`text-[10px] font-bold uppercase leading-tight tracking-tighter ${useNeuralAgent ? 'text-cyan-400' : 'text-slate-500'}`}>
                    Mode: {useNeuralAgent ? `Neural_Elite G${activeNeuralWeights?.generation || 0}` : 'Gemini_Oracle'}
                </p>
            </div>
          </div>

          <PythonSketch />
        </div>

        {/* Main Stage */}
        <div className="lg:col-span-6 flex flex-col items-center space-y-8">
          {activeTab === 'arena' && (
            <div className="w-full flex flex-col items-center animate-in zoom-in-95 duration-700">
              <Board state={gameState} isTurbo={useNeuralAgent && isAutoPlaying} />
              
              <div className="flex gap-6 w-full justify-center mt-10">
                <button 
                  onClick={handleStep}
                  disabled={loading || gameState.finished}
                  className="px-12 py-5 bg-white text-slate-950 font-black rounded-3xl hover:scale-105 transition-all active:scale-95 disabled:opacity-20 uppercase tracking-widest text-sm shadow-2xl"
                >
                  {loading ? 'Processing...' : 'Manual Tick'}
                </button>
                <button 
                  onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                  disabled={gameState.finished}
                  className={`px-12 py-5 font-black rounded-3xl border transition-all active:scale-95 uppercase tracking-widest text-sm shadow-2xl ${
                    isAutoPlaying 
                      ? 'bg-red-500/10 border-red-500/30 text-red-500' 
                      : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-500'
                  }`}
                >
                  {isAutoPlaying ? 'Halt Simulation' : 'Automate Cycles'}
                </button>
              </div>

              {/* Activation Visualizer */}
              <div className="w-full mt-10">
                <NeuralNetworkVis activations={lastActivations} />
              </div>

              {/* Strategic Choice UI */}
              {lastDilemma && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-500">
                  <div className="max-w-3xl w-full p-12 rounded-[4rem] bg-gradient-to-br from-indigo-950 to-slate-900 border border-white/10 shadow-[0_0_100px_rgba(99,102,241,0.3)]">
                    <div className="flex items-center gap-4 mb-8">
                      <span className="px-4 py-1.5 bg-indigo-500 text-[10px] font-black rounded-full text-white uppercase tracking-[0.2em]">Strategic_Intervention</span>
                      <div className="h-px flex-1 bg-white/10"></div>
                    </div>
                    <h3 className="text-4xl font-black mb-10 text-white leading-tight tracking-tighter">{lastDilemma.question}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <button 
                        onClick={() => handleDilemmaChoice(lastDilemma.optionA.priorities)}
                        className="group p-10 rounded-[3rem] bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all text-left"
                      >
                        <div className="text-indigo-400 font-black text-xs uppercase mb-3 tracking-widest">{lastDilemma.optionA.label}</div>
                        <p className="text-sm text-slate-300 group-hover:text-white leading-relaxed font-medium">{lastDilemma.optionA.description}</p>
                      </button>
                      <button 
                        onClick={() => handleDilemmaChoice(lastDilemma.optionB.priorities)}
                        className="group p-10 rounded-[3rem] bg-slate-800/30 border border-white/5 hover:bg-white/5 hover:border-white/10 transition-all text-left"
                      >
                        <div className="text-slate-400 font-black text-xs uppercase mb-3 tracking-widest">{lastDilemma.optionB.label}</div>
                        <p className="text-sm text-slate-400 group-hover:text-white leading-relaxed font-medium">{lastDilemma.optionB.description}</p>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {gameState.finished && (
                <div className="mt-12 text-center animate-in zoom-in-110 duration-1000">
                  <div className="text-5xl font-black text-white uppercase italic tracking-tighter mb-4">Simulation Complete</div>
                  <button onClick={() => window.location.reload()} className="px-8 py-3 bg-white/10 text-white rounded-2xl font-black uppercase text-xs border border-white/5 hover:bg-white/20 transition-all">Flush & Reset</button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'lab' && (
            <div className="w-full max-w-2xl bg-slate-900/30 border border-white/5 p-12 rounded-[3.5rem] animate-in slide-in-from-bottom-12 duration-1000 backdrop-blur-xl">
              <h2 className="text-4xl font-black mb-3 italic tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-emerald-300 to-cyan-300">Scenario_Forge</h2>
              <p className="text-slate-500 text-sm mb-12 font-medium leading-relaxed">Design specialized edge cases for agent behavioral analysis using the Gherkin interface.</p>
              <StrategyLab onLoadScenario={handleScenarioLoad} />
            </div>
          )}

          {activeTab === 'neural' && (
             <div className="w-full animate-in fade-in duration-1000">
               <NeuralTraining 
                 population={population}
                 generation={generation}
                 history={history}
                 isAutoEvolving={isAutoEvolving}
                 isTraining={isTraining}
                 onToggleAutoEvolve={() => setIsAutoEvolving(!isAutoEvolving)}
                 onManualStep={runEvolutionStep}
               />
             </div>
          )}
        </div>

        {/* Inference Stream */}
        <div className="lg:col-span-3">
          <div className="sticky top-28 space-y-6 animate-in slide-in-from-right-8 duration-700">
            <div className="flex justify-between items-center px-4">
              <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full animate-pulse ${useNeuralAgent ? 'bg-cyan-500' : 'bg-indigo-500'}`}></span>
                Inference Stream
              </h2>
              <span className="text-[10px] font-mono text-slate-700 font-bold">LIVE_DATA</span>
            </div>
            
            <div className="space-y-4 max-h-[78vh] overflow-y-auto pr-4 no-scrollbar scroll-smooth pb-10">
              {logs.length === 0 && (
                <div className="flex flex-col items-center justify-center py-32 border border-dashed border-slate-800 rounded-[3rem]">
                  <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center mb-4">
                    <span className="text-slate-700 opacity-50">⏳</span>
                  </div>
                  <p className="text-slate-700 text-[10px] font-black uppercase tracking-[0.3em]">Awaiting Cycle Start</p>
                </div>
              )}
              {logs.map((log, i) => (
                <div 
                  key={i} 
                  className={`p-6 rounded-3xl border transition-all duration-300 ${
                    log.heroId === 1 
                      ? 'bg-white/5 border-white/10 shadow-xl' 
                      : 'bg-slate-900/20 border-white/5 opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className="flex justify-between items-center mb-4">
                    <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg ${
                      log.heroId === 1 ? 'bg-white text-slate-950' : 'bg-slate-800 text-slate-500'
                    }`}>
                      Hero_{log.heroId}
                    </span>
                    <span className="text-[10px] font-mono text-slate-600 font-bold tracking-widest">T_{log.turn}</span>
                  </div>
                  <div className={`font-black text-sm mb-3 uppercase tracking-tighter ${log.heroId === 1 ? 'text-white' : 'text-slate-400'}`}>
                    {log.decision.move}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-medium italic opacity-70">
                    "{log.decision.reasoning.substring(0, 120)}{log.decision.reasoning.length > 120 ? '...' : ''}"
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
