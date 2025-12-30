
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, Move, GameLog, Hero, StrategyPriorities, AIDecision, PopulationMember, ModelWeights } from './types';
import { GameEngine } from './services/gameEngine';
import { getAIDecision } from './services/geminiService';
import { NeuralEngine } from './services/neuralEngine';
import Board from './components/Board';
import HeroStats from './components/HeroStats';
import PythonSketch from './components/PythonSketch';
import StrategyLab from './components/StrategyLab';
import NeuralTraining from './components/NeuralTraining';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [logs, setLogs] = useState<GameLog[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1000);
  const [isTurbo, setIsTurbo] = useState(true); // Metal mode active by default
  const [priorities, setPriorities] = useState<StrategyPriorities>({ survival: 50, greed: 70, aggression: 30 });
  const [isHITL, setIsHITL] = useState(false);
  const [aiMode, setAiMode] = useState<'oracle' | 'neural'>('neural'); // Neural mode active by default
  const [hitlWaiting, setHitlWaiting] = useState(false);
  const [proposedDecision, setProposedDecision] = useState<AIDecision | null>(null);
  const [countdown, setCountdown] = useState(10);
  const [activeTab, setActiveTab] = useState<'game' | 'lab' | 'evolve'>('game');
  const [currentScenario, setCurrentScenario] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [deployedModel, setDeployedModel] = useState<ModelWeights | null>(null);
  const [gpuLoad, setGpuLoad] = useState(0);

  // Background Evolution State
  const [generation, setGeneration] = useState(1);
  const [avgFitness, setAvgFitness] = useState(12.5);
  
  const generateAgentId = (gen: number) => `x86-${gen}.${Math.random().toString(16).substring(2, 6).toUpperCase()}`;

  const [population, setPopulation] = useState<PopulationMember[]>(() => [
    { id: "v1.0.4-LTS", fitness: 85, accuracy: 0.92, status: 'Active', weights: NeuralEngine.createRandomWeights() },
    { id: generateAgentId(1), fitness: 120, accuracy: 0.88, status: 'Active', weights: NeuralEngine.createRandomWeights() },
    { id: generateAgentId(1), fitness: 45, accuracy: 0.75, status: 'Pruned', weights: NeuralEngine.createRandomWeights() },
    { id: "ELITE-ALPHA", fitness: 145, accuracy: 0.95, status: 'Elite', weights: NeuralEngine.createRandomWeights() },
  ]);

  const gameLoopRef = useRef<any>(null);

  useEffect(() => {
    setGameState(GameEngine.createInitialState());
  }, []);

  // Updated handleReboot: Only resets game state, not simulation flags (Turbo/Metal)
  const handleReboot = useCallback(() => {
    setIsPlaying(false);
    if (gameLoopRef.current) clearTimeout(gameLoopRef.current);
    
    setGameState(GameEngine.createInitialState());
    setLogs([]);
    setCurrentScenario(null);
    setGpuLoad(0);
    setNotification("GAME BUFFER PURGED");
  }, []);

  // Evolution Heartbeat with real mutation
  useEffect(() => {
    const interval = setInterval(() => {
      setGeneration(g => {
        const nextGen = g + 1;
        if (nextGen % 5 === 0) {
          setPopulation(currentPop => {
            const sorted = [...currentPop].sort((a, b) => b.fitness - a.fitness);
            const elite = { ...sorted[0], status: 'Elite' as const };
            const runnerUp = { ...sorted[1], status: 'Active' as const };
            
            const spawn1 = {
              id: generateAgentId(nextGen),
              fitness: elite.fitness * 0.7,
              accuracy: 0.8,
              status: 'Active' as const,
              weights: NeuralEngine.mutateWeights(elite.weights, 0.15)
            };
            
            const spawn2 = {
              id: generateAgentId(nextGen),
              fitness: elite.fitness * 0.6,
              accuracy: 0.78,
              status: 'Active' as const,
              weights: NeuralEngine.mutateWeights(runnerUp.weights, 0.1)
            };
            
            return [elite, runnerUp, spawn1, spawn2];
          });
        } else {
          setPopulation(pop => 
            pop.map(p => ({
              ...p,
              fitness: p.status === 'Pruned' ? p.fitness : p.fitness + (Math.random() * 8)
            }))
          );
        }
        return nextGen;
      });
      setAvgFitness(f => f + (Math.random() * 4 - 1.5));
      if (isTurbo && isPlaying) {
        setGpuLoad(Math.floor(60 + Math.random() * 30));
      } else {
        setGpuLoad(Math.floor(Math.random() * 12));
      }
    }, isTurbo ? 600 : 3000);
    return () => clearInterval(interval);
  }, [isTurbo, isPlaying]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleExecute = useCallback(async (finalPriorities?: StrategyPriorities, label?: string) => {
    if (!gameState || gameState.finished) return;

    let decision: AIDecision;
    if (aiMode === 'neural' && !finalPriorities) {
      const weightsToUse = deployedModel || population.find(p => p.status === 'Elite')?.weights || population[0].weights;
      decision = await NeuralEngine.getInference(gameState, 1, weightsToUse);
      if (isTurbo) decision.latency = (decision.latency || 0) * 0.05; 
    } else {
      const currentPriors = finalPriorities || priorities;
      decision = await getAIDecision(gameState, 1, currentPriors);
    }

    const enhancedDecision = { ...decision };
    if (label) enhancedDecision.reasoning = `Input: ${label}. ${decision.reasoning}`;

    setLogs(prev => [{ turn: gameState.turn, heroId: 1, decision: enhancedDecision, timestamp: Date.now(), isManual: !!finalPriorities }, ...prev].slice(0, 50));

    let nextState = GameEngine.applyMove(gameState, 1, decision.move);
    if (!currentScenario) {
      const moves: Move[] = [Move.North, Move.South, Move.East, Move.West, Move.Stay];
      for (let i = 2; i <= 4; i++) {
          nextState = GameEngine.applyMove(nextState, i, moves[Math.floor(Math.random() * moves.length)]);
      }
    }

    setGameState(nextState);
    setHitlWaiting(false);
    setProposedDecision(null);
    setIsApplying(null);
    setCountdown(10);
  }, [gameState, priorities, currentScenario, aiMode, deployedModel, population, isTurbo]);

  const processTurn = useCallback(async () => {
    if (!gameState || gameState.finished) {
      setIsPlaying(false);
      return;
    }
    await handleExecute();
  }, [gameState, handleExecute]);

  useEffect(() => {
    if (isPlaying && !gameState?.finished) {
      const effectiveSpeed = isTurbo ? 16 : speed;
      gameLoopRef.current = setTimeout(processTurn, effectiveSpeed);
    }
    return () => clearTimeout(gameLoopRef.current);
  }, [isPlaying, gameState, processTurn, speed, isTurbo]);

  const loadLabScenario = (state: GameState, gherkin: string) => {
    setGameState(state);
    setCurrentScenario(gherkin);
    setLogs([]);
    setNotification("SCENARIO FLASHED TO MEMORY");
    setIsPlaying(false);
  };

  const deployNeuralModel = (modelId: string) => {
    const model = population.find(p => p.id === modelId);
    if (model) {
      setDeployedModel(model.weights);
      setNotification(`SYSTEM ACTIVATED: ${modelId}`);
      setAiMode('neural');
      setActiveTab('game');
    }
  };

  if (!gameState) return null;

  return (
    <div className={`h-screen w-screen flex bg-[#020617] text-slate-100 overflow-hidden font-sans transition-all duration-700 border-[1px] border-cyan-500/20`}>
      {/* Permanent Metal Background */}
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#1e293b 1.5px, transparent 1.5px)', backgroundSize: '32px 32px' }}></div>
      <div className="fixed inset-0 pointer-events-none z-[300] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,255,255,0.02)_50%),linear-gradient(90deg,rgba(255,0,0,0.01),rgba(0,255,0,0.005),rgba(0,0,255,0.01))] bg-[length:100%_2px,3px_100%] opacity-40"></div>

      {notification && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[500] animate-in slide-in-from-top-4 duration-300">
          <div className="bg-cyan-500 text-slate-950 shadow-cyan-500/50 px-8 py-4 rounded-full font-black text-xs uppercase tracking-[0.2em] shadow-2xl flex items-center gap-4 border border-white/20 backdrop-blur-md">
            <span className="text-xl animate-pulse">⚡</span>
            {notification}
          </div>
        </div>
      )}

      {/* Left Sidebar - Strategy Controls */}
      <aside className="w-80 border-r border-slate-800 bg-slate-900/60 backdrop-blur-xl flex flex-col h-full z-40 shadow-2xl relative">
        <div className="p-8 border-b border-slate-800/50">
          <div className="flex items-center gap-3 mb-1">
            <div className={`w-3.5 h-3.5 rounded-sm bg-cyan-400 shadow-[0_0_15px_#22d3ee] animate-pulse`}></div>
            <h1 className="text-2xl font-black tracking-tighter text-white">COMMAND</h1>
          </div>
          <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase mb-6 opacity-60">Strategic Oversight</p>
          
          <div className="flex gap-1 bg-black/40 p-1.5 rounded-xl border border-slate-800/50">
            {['game', 'lab', 'evolve'].map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`flex-1 py-2 px-3 text-[10px] font-black uppercase rounded-lg transition-all ${activeTab === tab ? 'bg-cyan-600 shadow-lg text-white' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
              >{tab}</button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-8 space-y-8">
          {activeTab === 'game' ? (
            <div className="space-y-8">
              <div className={`space-y-6 p-6 rounded-3xl border transition-all duration-500 bg-cyan-500/5 border-cyan-500/30`}>
                <div className="flex justify-between items-center">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Logic Engine</h3>
                  <span className="text-[9px] font-black text-cyan-400 animate-pulse tracking-widest">ACTIVE_METAL</span>
                </div>
                
                <div className="flex bg-black/30 p-1.5 rounded-2xl border border-slate-700/50">
                  <button onClick={() => setAiMode('oracle')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${aiMode === 'oracle' ? 'bg-slate-700 text-white shadow-inner' : 'text-slate-500'}`}>Oracle</button>
                  <button onClick={() => setAiMode('neural')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${aiMode === 'neural' ? 'bg-cyan-500 text-white shadow-lg' : 'text-slate-500'}`}>Neural</button>
                </div>

                <div className="space-y-3">
                  <button onClick={() => setIsPlaying(!isPlaying)} className={`w-full py-4 rounded-2xl font-black text-xs uppercase transition-all shadow-xl hover:scale-[1.02] active:scale-[0.98] ${isPlaying ? 'bg-amber-500/10 text-amber-400 border border-amber-500/50' : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'}`}>
                    {isPlaying ? 'SUSPEND SIM' : 'ENGAGE AGENT'}
                  </button>
                  <div className={`w-full py-3 rounded-2xl border transition-all text-[10px] font-black uppercase tracking-widest text-center bg-cyan-500/20 border-cyan-400 text-cyan-400 shadow-[inset_0_0_20px_rgba(34,211,238,0.1)]`}>
                    ⚡ METAL OVERCLOCK ON
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="flex justify-between text-[9px] font-black text-cyan-500 uppercase tracking-widest">
                    <span>Vector Utilization</span>
                    <span>{gpuLoad}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div className="h-full bg-cyan-400 transition-all duration-300 shadow-[0_0_10px_#22d3ee]" style={{ width: `${gpuLoad}%` }} />
                  </div>
                </div>
              </div>
              <HeroStats heroes={gameState.heroes} />
            </div>
          ) : activeTab === 'lab' ? (
            <StrategyLab onLoadScenario={loadLabScenario} />
          ) : (
            <NeuralTraining onDeploy={deployNeuralModel} generation={generation} avgFitness={avgFitness} population={population} isTurbo={true} />
          )}
        </div>
      </aside>

      {/* Main Sandbox Area */}
      <main className="flex-1 flex flex-col bg-[#01040f] relative overflow-hidden">
        {/* Header - Fixed Height */}
        <header className="h-20 border-b border-slate-800/50 px-10 flex justify-between items-center bg-slate-950/40 backdrop-blur-lg z-30 shadow-md">
          <div className="flex items-center gap-16">
            <div className="group">
              <div className="text-[10px] uppercase text-slate-500 font-black tracking-widest mb-1 opacity-60">Context</div>
              <div className={`text-sm font-black uppercase tracking-tight transition-colors ${currentScenario ? 'text-emerald-400' : 'text-blue-500'}`}>
                {currentScenario ? 'Lab Prototype' : 'Standard Simulation'}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-slate-500 font-black tracking-widest mb-1 opacity-60">Instruction</div>
              <div className={`text-sm font-mono font-bold text-cyan-400`}>
                METAL_XCORE_v3
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-slate-500 font-black tracking-widest mb-1 opacity-60">Turn</div>
              <div className="text-sm font-mono font-bold text-white flex items-baseline gap-1">
                {gameState.turn} <span className="text-[10px] text-slate-600">/ {gameState.maxTurns}</span>
              </div>
            </div>
          </div>
          
          <button 
            onClick={handleReboot} 
            className="flex items-center gap-2.5 px-6 py-2.5 rounded-2xl bg-slate-800/50 hover:bg-red-500/10 hover:text-red-400 border border-slate-700/50 transition-all text-[11px] font-black uppercase tracking-widest shadow-lg hover:border-red-500/30"
          >
            <span className="text-sm">🔄</span> REBOOT
          </button>
        </header>

        {/* Board Viewport */}
        <div className="flex-1 flex items-center justify-center p-12 overflow-hidden relative">
           <div className={`relative transition-all duration-1000 scale-[1.04]`}>
              <Board state={gameState} isTurbo={true} />
              <div className="absolute -inset-8 border-2 border-cyan-500/10 rounded-[3rem] pointer-events-none shadow-[inset_0_0_100px_rgba(34,211,238,0.05)] animate-pulse"></div>
           </div>
        </div>

        {/* HUD Elements for Turbo */}
        <div className="absolute inset-0 pointer-events-none z-10">
          <div className="absolute bottom-10 left-10 w-32 h-32 border-l border-b border-cyan-500/20 rounded-bl-3xl"></div>
          <div className="absolute top-24 right-10 w-32 h-32 border-r border-t border-cyan-500/20 rounded-tr-3xl"></div>
        </div>
      </main>

      {/* Right Sidebar - Telemetry Feed */}
      <aside className="w-[420px] border-l border-slate-800 bg-slate-900/60 backdrop-blur-xl flex flex-col h-full z-40 shadow-2xl">
        <div className="p-8 border-b border-slate-800/50 flex justify-between items-center">
           <h2 className="text-sm font-black text-white uppercase tracking-[0.2em]">Telemetry</h2>
           <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="text-[9px] font-mono text-slate-400 tracking-widest">UPLINK_STABLE</span>
           </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
          {logs.map((log, idx) => (
            <div key={idx} className={`group p-5 rounded-[2rem] border transition-all ${log.isManual ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-slate-800/20 border-slate-800'} hover:border-slate-600 hover:bg-slate-800/40`}>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-mono font-bold text-slate-500">#{String(log.turn).padStart(3, '0')}</span>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border ${log.isManual ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5' : 'border-cyan-500/30 text-cyan-400 bg-cyan-500/5'}`}>
                    {log.isManual ? 'Human' : 'Metal'}
                  </span>
                </div>
                <div className={`text-[11px] font-black px-3 py-1 rounded-xl shadow-sm border transition-all group-hover:scale-105 ${log.decision.move === Move.Stay ? 'border-slate-700 text-slate-500 bg-slate-900/50' : 'border-white bg-white text-slate-950'}`}>
                  {log.decision.move.toUpperCase()}
                </div>
              </div>
              <p className="text-[12px] text-slate-300 leading-relaxed font-medium opacity-90">"{log.decision.reasoning}"</p>
              {log.decision.latency !== undefined && (
                <div className="mt-4 pt-3 border-t border-slate-800/50 flex justify-between items-center">
                   <div className="flex gap-1.5">
                      <div className="w-1 h-1 rounded-full bg-slate-700"></div>
                      <div className="w-1 h-1 rounded-full bg-slate-700"></div>
                      <div className="w-1 h-1 rounded-full bg-slate-700"></div>
                   </div>
                   <span className="text-[9px] font-mono text-slate-600 tracking-tighter">INF_LATENCY: {log.decision.latency.toFixed(2)}ms</span>
                </div>
              )}
            </div>
          ))}
          {logs.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full opacity-10 py-20">
              <span className="text-6xl mb-6">📡</span>
              <p className="text-[12px] font-black uppercase tracking-[0.4em]">Signal Acquisition...</p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};

export default App;
