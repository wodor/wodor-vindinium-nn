
import { useState, useCallback, useEffect, useRef } from 'react';
import { PopulationMember, SynthesisLog, GameState, Hero, Move } from '../types';
import { NeuralEngine } from '../services/neuralEngine';
import { GameEngine } from '../services/gameEngine';
import { saveNNToLocalStorage, loadNNFromLocalStorage, getAllSavedNNs, deleteNNFromLocalStorage, addEvaluationToNN, SavedNN, loadTopologyFromLocalStorage, saveTopologyToLocalStorage, loadFitnessWeightsFromLocalStorage, saveFitnessWeightsToLocalStorage, toggleStarNN, loadSimulationParamsFromLocalStorage, saveSimulationParamsToLocalStorage, loadCompCostLimitFromLocalStorage, saveCompCostLimitToLocalStorage, loadTotalGamesAllTimeFromLocalStorage, saveTotalGamesAllTimeToLocalStorage } from '../services/nnStorage';
import { 
  FitnessWeights, 
  HeroStats,
  DEFAULT_FITNESS_WEIGHTS,
  calculateFitness,
  calculateFitnessFromGame,
  initializeStats,
  updateStatsAfterTurn
} from '../services/fitness';

const AUTO_EVOLVE_DELAY_MS = 0;
const DEFAULT_POPULATION_SIZE = 20;
const DEFAULT_WEIGHTS: FitnessWeights = DEFAULT_FITNESS_WEIGHTS;

const createInitialPopulation = (size: number, hiddenSize: number, layers: number, generation: number = 0): PopulationMember[] => 
  Array.from({ length: size }, (_, i) => ({
    id: `G${generation}-M${i}`,
    fitness: 0, 
    accuracy: 0,
    status: 'Awaiting',
    weights: NeuralEngine.createRandomWeights(hiddenSize, layers),
    generation: generation,
    config: { hiddenSize, numLayers: layers },
    fitnessBreakdown: { gold: 0, mines: 0, survival: 0, exploration: 0 },
    displayFitness: 0,
    displayBreakdown: { gold: 0, mines: 0, survival: 0, exploration: 0 },
    gamesPlayed: 0
  }));

export function useEvolution() {
  const [hiddenSize, setHiddenSize] = useState(() => {
    const saved = loadTopologyFromLocalStorage();
    return saved?.hiddenSize ?? 16;
  });
  const [numLayers, setNumLayers] = useState(() => {
    const saved = loadTopologyFromLocalStorage();
    return saved?.numLayers ?? 1;
  });
  const [population, setPopulation] = useState<PopulationMember[]>(() => {
    const saved = loadTopologyFromLocalStorage();
    const size = saved?.hiddenSize ?? 16;
    const layers = saved?.numLayers ?? 1;
    return createInitialPopulation(DEFAULT_POPULATION_SIZE, size, layers);
  });
  const [generation, setGeneration] = useState(0);
  const [history, setHistory] = useState<Array<{
    fitness: number;
    gold: number;
    mines: number;
    survival: number;
    exploration: number;
  }>>([]);
  const [isAutoEvolving, setIsAutoEvolving] = useState(true);
  const [isTraining, setIsTraining] = useState(false);
  const [synthesisLogs, setSynthesisLogs] = useState<SynthesisLog[]>([]);
  const [selectedSpecimenId, setSelectedSpecimenId] = useState<string | null>(null);
  const [activeNeuralWeights, setActiveNeuralWeights] = useState<PopulationMember | null>(null);
  const [fitnessWeights, setFitnessWeights] = useState<FitnessWeights>(() => {
    const saved = loadFitnessWeightsFromLocalStorage();
    return saved ?? DEFAULT_WEIGHTS;
  });
  const [baseSimulations, setBaseSimulations] = useState(() => {
    const saved = loadSimulationParamsFromLocalStorage();
    return saved?.baseSimulations ?? 2;
  });
  const [eliteSimulations, setEliteSimulations] = useState(() => {
    const saved = loadSimulationParamsFromLocalStorage();
    return saved?.eliteSimulations ?? 4;
  });
  const [compCostLimit, setCompCostLimit] = useState(() => {
    const saved = loadCompCostLimitFromLocalStorage();
    return saved ?? 0;
  });
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResults, setEvaluationResults] = useState<{ wins: number; avgFitness?: number } | null>(null);
  const [savedNNs, setSavedNNs] = useState<SavedNN[]>(() => getAllSavedNNs());
  const [loadedNNInfo, setLoadedNNInfo] = useState<SavedNN | null>(null);
  const hasInitialLoadRef = useRef(false);
  const manualResetRef = useRef(false);
  const lastActiveSyncGenRef = useRef<number | null>(null);
  const trainingStartTimeRef = useRef<number | null>(null);
  const [totalGamesThisSession, setTotalGamesThisSession] = useState(0);
  const [gamesPerSecond, setGamesPerSecond] = useState(0);
  const [totalGamesAllTime, setTotalGamesAllTime] = useState(() => {
    return loadTotalGamesAllTimeFromLocalStorage();
  });
  const [specimensPerSecond, setSpecimensPerSecond] = useState(0);
  const [generationsPerSecond, setGenerationsPerSecond] = useState(0);
  const [generationsThisSession, setGenerationsThisSession] = useState(0);
  const [totalSpecimensEvaluated, setTotalSpecimensEvaluated] = useState(0);

  useEffect(() => {
    saveTopologyToLocalStorage({ hiddenSize, numLayers });
  }, [hiddenSize, numLayers]);

  useEffect(() => {
    saveFitnessWeightsToLocalStorage(fitnessWeights);
  }, [fitnessWeights]);

  useEffect(() => {
    saveSimulationParamsToLocalStorage(baseSimulations, eliteSimulations);
  }, [baseSimulations, eliteSimulations]);

  useEffect(() => {
    saveCompCostLimitToLocalStorage(compCostLimit);
  }, [compCostLimit]);


  const resetEvolution = useCallback((newSize: number, newLayers: number, newPopSize: number = DEFAULT_POPULATION_SIZE) => {
    manualResetRef.current = true;
    setHiddenSize(newSize);
    setNumLayers(newLayers);
    setPopulation(createInitialPopulation(newPopSize, newSize, newLayers));
    setGeneration(0);
    setHistory([]);
    setSynthesisLogs([]);
    setSelectedSpecimenId(null);
    setActiveNeuralWeights(null);
    setLoadedNNInfo(null);
    setTotalGamesAllTime(0);
    saveTotalGamesAllTimeToLocalStorage(0);
    setTotalGamesThisSession(0);
    setGenerationsThisSession(0);
    setSpecimensPerSecond(0);
    setGenerationsPerSecond(0);
    setTotalSpecimensEvaluated(0);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        manualResetRef.current = false;
      });
    });
  }, []);

  const updateFitnessWeights = useCallback((partial: Partial<FitnessWeights>) => {
    setFitnessWeights(prev => ({ ...prev, ...partial }));
  }, []);

  const runEvolutionStep = useCallback(async () => {
    if (isTraining || population.length === 0) return;
    
    const currentCompCost = hiddenSize * numLayers * totalGamesAllTime;
    if (compCostLimit > 0 && currentCompCost >= compCostLimit * 1000000) {
      setIsAutoEvolving(false);
      return;
    }
    
    setIsTraining(true);
    
    if (trainingStartTimeRef.current === null) {
      trainingStartTimeRef.current = Date.now();
    }
    
    const getTrainingGameLength = (gen: number): number => {
      const MIN_TURNS = 150;
      const MAX_TURNS = 600;
      const MAX_GENERATION = 10000;
      const progress = Math.min(1, gen / MAX_GENERATION);
      return Math.floor(MIN_TURNS + (MAX_TURNS - MIN_TURNS) * progress);
    };
    
    const sortedCurrent = [...population].sort((a, b) => b.fitness - a.fitness);
    const eliteMember = sortedCurrent[0];
    
    const HEROES_PER_GAME = 4;
    const allFitnessScores: number[][] = Array.from({ length: population.length }, () => []);
    
    const allBreakdowns: Array<{gold: number, mines: number, survival: number, exploration: number}[]> = 
      Array.from({ length: population.length }, () => []);
    
    let totalGamesThisStep = 0;
    
    const sortedByPreviousFitness = [...population].sort((a, b) => (b.displayFitness ?? b.fitness) - (a.displayFitness ?? a.fitness));
    const topQuarter = Math.ceil(population.length / 4);
    const topPerformers = new Set(sortedByPreviousFitness.slice(0, topQuarter).map(m => m.id));
    
    const runSimulation = async (
      groupMembers: PopulationMember[],
      groupStartIndex: number,
      positionRotation: number
    ): Promise<void> => {
      const gameLength = getTrainingGameLength(generation);
      let state = GameEngine.createInitialState(12, gameLength);
      const initialMineCounts = new Map(state.heroes.map(h => [h.id, h.mineCount]));
      const stats = initializeStats(state.heroes.map(h => h.id));
      
      const getMemberForHero = (heroId: number): PopulationMember | null => {
        const memberIdx = ((heroId - 1 - positionRotation) % 4 + 4) % 4;
        return memberIdx < groupMembers.length ? groupMembers[memberIdx] : null;
      };
      
      const getMemberIndexForHero = (heroId: number): number => {
        return ((heroId - 1 - positionRotation) % 4 + 4) % 4;
      };
      
      while (!state.finished) {
        const turnHeroId = (state.turn % 4) + 1;
        const heroesBeforeMove = state.heroes.map(h => ({ ...h }));
        const mineCountsBeforeMove = new Map(state.heroes.map(h => [h.id, h.mineCount]));
        
        const member = getMemberForHero(turnHeroId);
        if (member) {
          const decision = await NeuralEngine.getInference(state, turnHeroId, member.weights);
          state = GameEngine.applyMove(state, turnHeroId, decision.move);
        } else {
          const randomMove = Object.values(Move)[Math.floor(Math.random() * 5)] as Move;
          state = GameEngine.applyMove(state, turnHeroId, randomMove);
        }
        
        updateStatsAfterTurn(
          heroesBeforeMove,
          state.heroes,
          mineCountsBeforeMove,
          initialMineCounts,
          stats,
          state.turn,
          turnHeroId
        );
      }
      
      state.heroes.forEach((hero) => {
        const memberIdx = getMemberIndexForHero(hero.id);
        const popIdx = groupStartIndex + memberIdx;
        if (popIdx < population.length && memberIdx < groupMembers.length) {
          const heroStats = stats.get(hero.id)!;
          const { fitness, breakdown } = calculateFitnessFromGame(hero, heroStats, state.heroes, fitnessWeights);
          allFitnessScores[popIdx].push(fitness);
          allBreakdowns[popIdx].push(breakdown);
        }
      });
    };
    
    for (let groupStart = 0; groupStart < population.length; groupStart += HEROES_PER_GAME) {
      const groupMembers = population.slice(groupStart, groupStart + HEROES_PER_GAME);
      const isEliteGroup = groupMembers.some(m => topPerformers.has(m.id));
      const simCount = isEliteGroup ? eliteSimulations : baseSimulations;
      
      for (let sim = 0; sim < simCount; sim++) {
        const positionRotation = isEliteGroup ? sim % 4 : Math.floor(Math.random() * 4);
        await runSimulation(groupMembers, groupStart, positionRotation);
        totalGamesThisStep++;
      }
    }

    const evaluatedPop = population.map((member, idx) => {
      const fitnessValues = allFitnessScores[idx];
      if (fitnessValues.length === 0) return member;
      
      const avgFitness = fitnessValues.reduce((sum, f) => sum + f, 0) / fitnessValues.length;
      const variance = fitnessValues.length > 1
        ? fitnessValues.reduce((sum, f) => sum + Math.pow(f - avgFitness, 2), 0) / fitnessValues.length
        : 0;
      const breakdowns = allBreakdowns[idx];
      const avgBreakdown = {
        gold: Math.floor(breakdowns.reduce((sum, b) => sum + b.gold, 0) / breakdowns.length),
        mines: Math.floor(breakdowns.reduce((sum, b) => sum + b.mines, 0) / breakdowns.length),
        survival: Math.floor(breakdowns.reduce((sum, b) => sum + b.survival, 0) / breakdowns.length),
        exploration: Math.floor(breakdowns.reduce((sum, b) => sum + b.exploration, 0) / breakdowns.length)
      };
      
      const nextFitness = Math.floor(avgFitness);
      const prevDisplay = member.displayFitness ?? member.fitness ?? 0;
      const isNewBest = nextFitness > prevDisplay;
      const smoothingFactor = 0.3;
      const sameSimulationParams =
        member.lastSimulationParams?.baseSimulations === baseSimulations &&
        member.lastSimulationParams?.eliteSimulations === eliteSimulations;
      const prevDisplayVariance = sameSimulationParams
        ? (member.displayVariance ?? member.fitnessVariance ?? variance)
        : variance;
      const smoothedVariance = sameSimulationParams
        ? prevDisplayVariance * (1 - smoothingFactor) + variance * smoothingFactor
        : variance;
      return { 
        ...member, 
        fitness: nextFitness,
        fitnessMean: avgFitness,
        fitnessVariance: variance,
        displayVariance: smoothedVariance,
        fitnessSamples: fitnessValues.length,
        lastSimulationParams: { baseSimulations, eliteSimulations },
        status: 'Simulated', 
        fitnessBreakdown: avgBreakdown,
        displayFitness: Math.max(prevDisplay, nextFitness),
        displayBreakdown: isNewBest ? avgBreakdown : (member.displayBreakdown ?? avgBreakdown)
      };
    });

    const displaySnapshot = new Map<string, { fitness: number; breakdown?: { gold: number; mines: number; survival: number; exploration: number } }>(
      evaluatedPop.map(m => [m.id, { fitness: m.displayFitness ?? m.fitness, breakdown: m.displayBreakdown ?? m.fitnessBreakdown }])
    );

    const sortedResult = [...evaluatedPop].sort((a, b) => b.fitness - a.fitness);
    const topPerformer = sortedResult[0];
    const avgFitness = evaluatedPop.reduce((sum, m) => sum + m.fitness, 0) / evaluatedPop.length;
    const avgGold = evaluatedPop.reduce((sum, m) => sum + (m.fitnessBreakdown?.gold || 0), 0) / evaluatedPop.length;
    const avgMines = evaluatedPop.reduce((sum, m) => sum + (m.fitnessBreakdown?.mines || 0), 0) / evaluatedPop.length;
    const avgSurvival = evaluatedPop.reduce((sum, m) => sum + (m.fitnessBreakdown?.survival || 0), 0) / evaluatedPop.length;
    const avgExploration = evaluatedPop.reduce((sum, m) => sum + (m.fitnessBreakdown?.exploration || 0), 0) / evaluatedPop.length;
    const fitnessDelta = topPerformer.fitness - (eliteMember?.fitness || 0);
    
    const synthLog: SynthesisLog = {
      generation: generation + 1,
      mutationMagnitude: 0.15 + (Math.random() * 0.1),
      deltas: {
        gold: topPerformer.fitnessBreakdown!.gold - (eliteMember.fitnessBreakdown?.gold || 0),
        mines: topPerformer.fitnessBreakdown!.mines - (eliteMember.fitnessBreakdown?.mines || 0),
        survival: topPerformer.fitnessBreakdown!.survival - (eliteMember.fitnessBreakdown?.survival || 0),
        exploration: topPerformer.fitnessBreakdown!.exploration - (eliteMember.fitnessBreakdown?.exploration || 0),
      },
      totalFitnessDelta: fitnessDelta,
      timestamp: Date.now()
    };

    setSynthesisLogs(prev => [synthLog, ...prev].slice(0, 50));
    
    const newHistoryEntry = {
      fitness: avgFitness,
      gold: avgGold,
      mines: avgMines,
      survival: avgSurvival,
      exploration: avgExploration
    };
    const recentHistory = [...history, newHistoryEntry].slice(-10);
    const progressRate = recentHistory.length >= 2 
      ? (recentHistory[recentHistory.length - 1].fitness - recentHistory[0].fitness) / Math.max(1, recentHistory.length - 1)
      : 0;
    
    const baseMutationRate = progressRate < 0.5 ? 0.12 : 0.08;
    const baseSigma = progressRate < 0.5 ? 0.08 : 0.05;
    
    const adaptiveMutationRate = Math.max(0.05, baseMutationRate - (generation / 2000) * 0.05);
    const adaptiveSigma = Math.max(0.03, baseSigma - (generation / 2000) * 0.04);
    
    setHistory(prev => [...prev, {
      fitness: avgFitness,
      gold: avgGold,
      mines: avgMines,
      survival: avgSurvival,
      exploration: avgExploration
    }]);
    
    const eliteCount = Math.max(2, Math.floor(population.length * 0.25));
    const elites = sortedResult.slice(0, eliteCount);
    const children: PopulationMember[] = [];
    
    const diversityInjectCount = Math.floor(population.length * 0.0625);
    
    const tournamentSelect = (tournamentSize: number = 3): PopulationMember => {
      const candidates = elites.slice(0, Math.min(tournamentSize, elites.length));
      return candidates.reduce((best, candidate) => candidate.fitness > best.fitness ? candidate : best);
    };
    
    for (let i = 0; i < population.length - eliteCount - diversityInjectCount; i++) {
      const parent1 = tournamentSelect(3);
      const parent2 = tournamentSelect(3);
      
      const crossoverRate = 0.5 + (Math.random() * 0.3);
      let childWeights = NeuralEngine.crossover(parent1.weights, parent2.weights, crossoverRate);
      childWeights = NeuralEngine.mutateWeights(childWeights, adaptiveMutationRate, adaptiveSigma);
      children.push({
        id: `G${generation + 1}-M${eliteCount + i}`,
        fitness: 0,
        accuracy: 0,
        weights: childWeights,
        status: 'Mutated_Child',
        generation: generation + 1,
        config: parent1.config,
        fitnessBreakdown: { gold: 0, mines: 0, survival: 0, exploration: 0 },
        displayFitness: 0,
        displayBreakdown: undefined,
        gamesPlayed: 0
      });
    }
    
    for (let i = 0; i < diversityInjectCount; i++) {
      children.push({
        id: `G${generation + 1}-M${eliteCount + population.length - eliteCount - diversityInjectCount + i}`,
        fitness: 0,
        accuracy: 0,
        weights: NeuralEngine.createRandomWeights(hiddenSize, numLayers),
        status: 'Random_Injection',
        generation: generation + 1,
        config: { hiddenSize, numLayers },
        fitnessBreakdown: { gold: 0, mines: 0, survival: 0, exploration: 0 },
        displayFitness: 0,
        displayBreakdown: undefined,
        gamesPlayed: 0
      });
    }
    
    const nextGen = [
      ...elites.map((member, idx) => {
        return {
          ...member,
          id: `G${generation + 1}-M${idx}`,
          status: idx === 0 ? 'Elite_Specimen' : 'Direct_Heir',
          generation: generation + 1,
          fitness: member.fitness,
          displayFitness: Math.max(member.displayFitness ?? 0, member.fitness),
          displayBreakdown: member.fitnessBreakdown,
          displayVariance: member.displayVariance,
          gamesPlayed: member.gamesPlayed ?? 0
        };
      }),
      ...children
    ];

    const newTotalGames = totalGamesThisSession + totalGamesThisStep;
    setTotalGamesThisSession(newTotalGames);
    const newTotalGamesAllTime = totalGamesAllTime + totalGamesThisStep;
    setTotalGamesAllTime(newTotalGamesAllTime);
    saveTotalGamesAllTimeToLocalStorage(newTotalGamesAllTime);
    
    const specimensEvaluated = evaluatedPop.length;
    const newTotalSpecimens = totalSpecimensEvaluated + specimensEvaluated;
    setTotalSpecimensEvaluated(newTotalSpecimens);
    const newGenerationsThisSession = generationsThisSession + 1;
    setGenerationsThisSession(newGenerationsThisSession);
    
    if (trainingStartTimeRef.current !== null) {
      const elapsedSeconds = (Date.now() - trainingStartTimeRef.current) / 1000;
      if (elapsedSeconds > 0) {
        setGamesPerSecond(newTotalGames / elapsedSeconds);
        setSpecimensPerSecond(newTotalSpecimens / elapsedSeconds);
        setGenerationsPerSecond(newGenerationsThisSession / elapsedSeconds);
      }
    }

    const nextGenWithTrainingCost = nextGen.map(member => ({
      ...member,
      gamesPlayed: newTotalGamesAllTime
    }));

    setPopulation(nextGenWithTrainingCost);
    setGeneration(prev => prev + 1);
    setIsTraining(false);
  }, [population, generation, isTraining, fitnessWeights, hiddenSize, numLayers, baseSimulations, eliteSimulations, compCostLimit, totalGamesAllTime]);

  useEffect(() => {
    let timer: any;
    if (isAutoEvolving && !isTraining) {
      timer = setTimeout(runEvolutionStep, AUTO_EVOLVE_DELAY_MS);
    } else if (!isAutoEvolving && !isTraining) {
      trainingStartTimeRef.current = null;
      setTotalGamesThisSession(0);
      setGamesPerSecond(0);
      setSpecimensPerSecond(0);
      setGenerationsPerSecond(0);
      setGenerationsThisSession(0);
      setTotalSpecimensEvaluated(0);
    }
    return () => clearTimeout(timer);
  }, [isAutoEvolving, isTraining, generation, runEvolutionStep]);

  const loadBest = useCallback(() => {
    if (population.length === 0) return;
    const sorted = [...population].sort((a, b) => b.fitness - a.fitness);
    const best = sorted[0];
    setActiveNeuralWeights(best);
    setSelectedSpecimenId(best.id);
  }, [population]);

  const selectSpecimen = useCallback((id: string) => {
    setSelectedSpecimenId(id);
    const specimen = population.find(p => p.id === id);
    if (specimen) setActiveNeuralWeights(specimen);
  }, [population]);

  const saveToLocalStorage = useCallback((name?: string, member?: PopulationMember) => {
    const memberToSave = member || (population.length > 0 
      ? [...population].sort((a, b) => (b.displayFitness ?? b.fitness) - (a.displayFitness ?? a.fitness))[0]
      : activeNeuralWeights);
    
    if (memberToSave) {
      const config = memberToSave.config || { hiddenSize, numLayers };
      const gen = memberToSave.generation || 0;
      const fitness = memberToSave.fitness || memberToSave.displayFitness || 0;
      const autoName = name || `G${gen}-${config.hiddenSize}Ux${config.numLayers}L-${Math.floor(fitness)}PTS`;
      saveNNToLocalStorage(memberToSave, autoName, fitnessWeights);
      setSavedNNs(getAllSavedNNs());
    }
  }, [activeNeuralWeights, hiddenSize, numLayers, population, fitnessWeights]);

  const loadToArena = useCallback((id: string) => {
    const savedNN = savedNNs.find(nn => nn.id === id);
    const saved = loadNNFromLocalStorage(id);
    if (saved && savedNN) {
      setLoadedNNInfo(savedNN);
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
        displayBreakdown: saved.displayBreakdown || saved.fitnessBreakdown,
        gamesPlayed: saved.gamesPlayed ?? 0
      };
      
      setActiveNeuralWeights(eliteMember);
      setSelectedSpecimenId(eliteMember.id);
    }
  }, [savedNNs, hiddenSize, numLayers]);

  const loadToNN = useCallback((id: string) => {
    const savedNN = savedNNs.find(nn => nn.id === id);
    const saved = loadNNFromLocalStorage(id);
    if (saved && savedNN) {
      setLoadedNNInfo(savedNN);
      const loadedConfig = saved.config || { hiddenSize, numLayers };
      const loadedHiddenSize = loadedConfig.hiddenSize;
      const loadedNumLayers = loadedConfig.numLayers;
      const loadedGeneration = saved.generation || 0;
      
      setHiddenSize(loadedHiddenSize);
      setNumLayers(loadedNumLayers);
      
      const eliteMember: PopulationMember = {
        ...saved,
        id: `G${loadedGeneration}-M0`,
        status: 'Elite_Specimen',
        generation: loadedGeneration,
        config: loadedConfig,
        fitness: saved.fitness || saved.displayFitness || 0,
        displayFitness: saved.displayFitness || saved.fitness || 0,
        displayBreakdown: saved.displayBreakdown || saved.fitnessBreakdown,
        gamesPlayed: saved.gamesPlayed ?? 0
      };
      
      const newPopulationSize = population.length || DEFAULT_POPULATION_SIZE;
      const children: PopulationMember[] = [];
      
      const mutationRate = 0.12;
      const mutationSigma = 0.08;
      const diversityInjectCount = Math.floor(newPopulationSize * 0.0625);
      
      for (let i = 0; i < newPopulationSize - 1 - diversityInjectCount; i++) {
        const mutatedWeights = NeuralEngine.mutateWeights(saved.weights, mutationRate, mutationSigma);
        children.push({
          id: `G${loadedGeneration}-M${i + 1}`,
          fitness: 0,
          accuracy: 0,
          weights: mutatedWeights,
          status: 'Mutated_Child',
          generation: loadedGeneration,
          config: loadedConfig,
          fitnessBreakdown: { gold: 0, mines: 0, survival: 0, exploration: 0 },
          displayFitness: 0,
          displayBreakdown: undefined,
          gamesPlayed: 0
        });
      }
      
      for (let i = 0; i < diversityInjectCount; i++) {
        children.push({
          id: `G${loadedGeneration}-M${newPopulationSize - diversityInjectCount + i}`,
          fitness: 0,
          accuracy: 0,
          weights: NeuralEngine.createRandomWeights(loadedHiddenSize, loadedNumLayers),
          status: 'Random_Injection',
          generation: loadedGeneration,
          config: loadedConfig,
          fitnessBreakdown: { gold: 0, mines: 0, survival: 0, exploration: 0 },
          displayFitness: 0,
          displayBreakdown: undefined,
          gamesPlayed: 0
        });
      }
      
      const seededPopulation = [eliteMember, ...children];
      const loadedGamesPlayed = saved.gamesPlayed ?? 0;
      const currentTotalGames = loadTotalGamesAllTimeFromLocalStorage();
      const newTotalGamesAllTime = Math.max(currentTotalGames, loadedGamesPlayed);
      setTotalGamesAllTime(newTotalGamesAllTime);
      saveTotalGamesAllTimeToLocalStorage(newTotalGamesAllTime);
      setTotalGamesThisSession(0);
      setGenerationsThisSession(0);
      setTotalSpecimensEvaluated(0);
      
      setPopulation(seededPopulation);
      setGeneration(loadedGeneration);
      setActiveNeuralWeights(eliteMember);
      setSelectedSpecimenId(eliteMember.id);
      setHistory([]);
      setSynthesisLogs([]);
    }
  }, [population.length, hiddenSize, numLayers, savedNNs]);

  useEffect(() => {
    const saved = getAllSavedNNs();
    if (saved.length > 0 && population.length > 0 && generation === 0 && !isTraining && !manualResetRef.current) {
      if (!hasInitialLoadRef.current) {
        const latest = saved.sort((a, b) => b.timestamp - a.timestamp)[0];
        if (latest) {
          hasInitialLoadRef.current = true;
          loadToNN(latest.id);
        }
      }
    }
  }, [population.length, generation, isTraining, loadToNN]);

  useEffect(() => {
    if (!activeNeuralWeights || population.length === 0 || isTraining) return;
    if (lastActiveSyncGenRef.current === generation) return;

    const oldGen = activeNeuralWeights.generation;
    const currentGen = generation;
    if (currentGen <= oldGen) return;

    const oldIdParts = activeNeuralWeights.id.match(/G(\d+)-M(\d+)/);
    if (!oldIdParts) return;

    const oldMemberIndex = parseInt(oldIdParts[2]);
    if (Number.isNaN(oldMemberIndex)) return;

    const wasElite = activeNeuralWeights.status === 'Elite_Specimen';
    const wasDirectHeir = activeNeuralWeights.status === 'Direct_Heir';
    if (!wasElite && !wasDirectHeir) return;

    const sorted = [...population].sort((a, b) => b.fitness - a.fitness);
    const eliteCount = Math.max(2, Math.floor(population.length * 0.25));
    const elites = sorted.slice(0, eliteCount);
    const correspondingSpecimen = oldMemberIndex < elites.length ? elites[oldMemberIndex] : undefined;
    if (!correspondingSpecimen) return;
    if (correspondingSpecimen.id === activeNeuralWeights.id) {
      lastActiveSyncGenRef.current = generation;
      return;
    }

    lastActiveSyncGenRef.current = generation;
    setActiveNeuralWeights(correspondingSpecimen);
    setSelectedSpecimenId(correspondingSpecimen.id);
  }, [population, generation, activeNeuralWeights?.id, isTraining]);

  const deleteFromLocalStorage = useCallback((id: string) => {
    deleteNNFromLocalStorage(id);
    setSavedNNs(getAllSavedNNs());
  }, []);

  const toggleStar = useCallback((id: string) => {
    toggleStarNN(id);
    setSavedNNs(getAllSavedNNs());
  }, []);

  const refreshSavedNNs = useCallback(() => {
    setSavedNNs(getAllSavedNNs());
  }, []);

  const evaluateAgainstRandoms = useCallback(async (member: PopulationMember, nnId?: string, numGames: number = 100): Promise<{ wins: number } | null> => {
    setIsEvaluating(true);
    setEvaluationResults(null);
    
    let wins = 0;
    const moves = Object.values(Move);
    const gamesPerPosition = Math.floor(numGames / 4);
    
    for (let game = 0; game < numGames; game++) {
      const nnHeroId = Math.floor(game / gamesPerPosition) + 1;
      const clampedHeroId = Math.min(nnHeroId, 4);
      
      let state = GameEngine.createInitialState(12, 1200);
      
      while (!state.finished) {
        const turnHeroId = (state.turn % 4) + 1;
        
        if (turnHeroId === clampedHeroId) {
          const decision = await NeuralEngine.getInference(state, turnHeroId, member.weights);
          state = GameEngine.applyMove(state, turnHeroId, decision.move);
        } else {
          const randomMove = moves[Math.floor(Math.random() * moves.length)] as Move;
          state = GameEngine.applyMove(state, turnHeroId, randomMove);
        }
      }
      
      const nnHero = state.heroes.find(h => h.id === clampedHeroId);
      const otherHeroes = state.heroes.filter(h => h.id !== clampedHeroId);
      const maxOtherGold = Math.max(...otherHeroes.map(h => h.gold));
      
      if (nnHero && nnHero.gold > maxOtherGold) {
        wins++;
      }
      
      if (game % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    
    const result = {
      wins
    };
    
    setEvaluationResults(result);
    
    if (nnId) {
      addEvaluationToNN(nnId, {
        ...result,
        timestamp: Date.now()
      });
      setSavedNNs(getAllSavedNNs());
    }
    
    setIsEvaluating(false);
    return result;
  }, [hiddenSize, numLayers, fitnessWeights]);

  useEffect(() => {
    if (generation > 0 && generation % 1000 === 0) {
      const bestMember = [...population].sort((a, b) => (b.displayFitness ?? b.fitness) - (a.displayFitness ?? a.fitness))[0];
      if (bestMember) {
        evaluateAgainstRandoms(bestMember, undefined, 100).then((result) => {
          if (result && result.wins > 20) {
            saveToLocalStorage(undefined, bestMember);
          }
        });
      }
    }
  }, [generation, population, evaluateAgainstRandoms, saveToLocalStorage]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (population.length > 0) {
        const bestMember = [...population].sort((a, b) => (b.displayFitness ?? b.fitness) - (a.displayFitness ?? a.fitness))[0];
        if (bestMember) {
          saveToLocalStorage(undefined, bestMember);
        }
      }
      saveTotalGamesAllTimeToLocalStorage(totalGamesAllTime);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [population, saveToLocalStorage, totalGamesAllTime]);

  const currentCompCost = hiddenSize * numLayers * totalGamesAllTime;

  return {
    hiddenSize, numLayers, population, generation, history, isAutoEvolving, 
    isTraining, synthesisLogs, selectedSpecimenId, activeNeuralWeights,
    fitnessWeights, updateFitnessWeights,
    baseSimulations, eliteSimulations, setBaseSimulations, setEliteSimulations,
    compCostLimit, setCompCostLimit, currentCompCost,
    setIsAutoEvolving, resetEvolution, runEvolutionStep, loadBest, selectSpecimen,
    saveToLocalStorage, loadToArena, loadToNN, deleteFromLocalStorage, refreshSavedNNs,
    evaluateAgainstRandoms, isEvaluating, evaluationResults, savedNNs, loadedNNInfo,
    setHiddenSize, setNumLayers, toggleStar, gamesPerSecond, specimensPerSecond, generationsPerSecond
  };
}
