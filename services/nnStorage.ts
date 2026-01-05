import { PopulationMember } from '../types';

const STORAGE_KEY = 'vindinium_saved_nns';

export interface EvaluationResult {
  wins: number;
  timestamp: number;
  avgFitness?: number;
}

export interface SavedNN {
  id: string;
  name: string;
  member: PopulationMember;
  timestamp: number;
  fitness?: number;
  evaluations?: EvaluationResult[];
  fitnessWeights?: FitnessWeights;
  starred?: boolean;
}

export function saveNNToLocalStorage(member: PopulationMember, name?: string, fitnessWeights?: FitnessWeights): void {
  try {
    const saved = getAllSavedNNs();
    const id = `nn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const nn: SavedNN = {
      id,
      name: name || `NN-${member.id}`,
      member,
      timestamp: Date.now(),
      fitness: member.fitness || member.displayFitness,
      evaluations: [],
      fitnessWeights
    };
    saved.push(nn);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch (err) {
    console.error('Failed to save NN to localStorage:', err);
  }
}

export function addEvaluationToNN(nnId: string, result: EvaluationResult): void {
  try {
    const saved = getAllSavedNNs();
    const nn = saved.find(n => n.id === nnId);
    if (nn) {
      if (!nn.evaluations) {
        nn.evaluations = [];
      }
      nn.evaluations.push(result);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    }
  } catch (err) {
    console.error('Failed to add evaluation to NN:', err);
  }
}

export function getAllSavedNNs(): SavedNN[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data) as SavedNN[];
  } catch (err) {
    console.error('Failed to load NNs from localStorage:', err);
    return [];
  }
}

export function loadNNFromLocalStorage(id: string): PopulationMember | null {
  try {
    const saved = getAllSavedNNs();
    const nn = saved.find(n => n.id === id);
    return nn ? nn.member : null;
  } catch (err) {
    console.error('Failed to load NN from localStorage:', err);
    return null;
  }
}

export function deleteNNFromLocalStorage(id: string): void {
  try {
    const saved = getAllSavedNNs();
    const filtered = saved.filter(n => n.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error('Failed to delete NN from localStorage:', err);
  }
}

export function clearAllNNsFromLocalStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear NNs from localStorage:', err);
  }
}

export function toggleStarNN(id: string): void {
  try {
    const saved = getAllSavedNNs();
    const nn = saved.find(n => n.id === id);
    if (nn) {
      nn.starred = !nn.starred;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    }
  } catch (err) {
    console.error('Failed to toggle star NN:', err);
  }
}

const TOPOLOGY_STORAGE_KEY = 'vindinium_topology';
const WEIGHTS_STORAGE_KEY = 'vindinium_fitness_weights';
const SIMULATION_PARAMS_STORAGE_KEY = 'vindinium_simulation_params';
const COMP_COST_LIMIT_STORAGE_KEY = 'vindinium_comp_cost_limit';
const TOTAL_GAMES_ALL_TIME_STORAGE_KEY = 'vindinium_total_games_all_time';

export interface TopologyConfig {
  hiddenSize: number;
  numLayers: number;
}

export interface FitnessWeights {
  gold: number;
  mine: number;
  survival: number;
  exploration: number;
}

export function saveTopologyToLocalStorage(config: TopologyConfig): void {
  try {
    localStorage.setItem(TOPOLOGY_STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    console.error('Failed to save topology to localStorage:', err);
  }
}

export function loadTopologyFromLocalStorage(): TopologyConfig | null {
  try {
    const data = localStorage.getItem(TOPOLOGY_STORAGE_KEY);
    if (!data) return null;
    return JSON.parse(data) as TopologyConfig;
  } catch (err) {
    console.error('Failed to load topology from localStorage:', err);
    return null;
  }
}

export function saveFitnessWeightsToLocalStorage(weights: FitnessWeights): void {
  try {
    localStorage.setItem(WEIGHTS_STORAGE_KEY, JSON.stringify(weights));
  } catch (err) {
    console.error('Failed to save fitness weights to localStorage:', err);
  }
}

export function loadFitnessWeightsFromLocalStorage(): FitnessWeights | null {
  try {
    const data = localStorage.getItem(WEIGHTS_STORAGE_KEY);
    if (!data) return null;
    const parsed = JSON.parse(data) as Partial<FitnessWeights> & { combat?: number };
    const gold = typeof parsed.gold === 'number' ? parsed.gold : 0;
    const mine = typeof parsed.mine === 'number' ? parsed.mine : 0;
    const survival = typeof parsed.survival === 'number' ? parsed.survival : 0;
    const exploration =
      typeof parsed.exploration === 'number'
        ? parsed.exploration
        : (typeof parsed.combat === 'number' ? parsed.combat : 0);
    return { gold, mine, survival, exploration };
  } catch (err) {
    console.error('Failed to load fitness weights from localStorage:', err);
    return null;
  }
}

export interface SimulationParams {
  baseSimulations: number;
  eliteSimulations: number;
}

export function saveSimulationParamsToLocalStorage(baseSim: number, eliteSim: number): void {
  try {
    localStorage.setItem(SIMULATION_PARAMS_STORAGE_KEY, JSON.stringify({ baseSimulations: baseSim, eliteSimulations: eliteSim }));
  } catch (err) {
    console.error('Failed to save simulation params to localStorage:', err);
  }
}

export function loadSimulationParamsFromLocalStorage(): SimulationParams | null {
  try {
    const data = localStorage.getItem(SIMULATION_PARAMS_STORAGE_KEY);
    if (!data) return null;
    return JSON.parse(data) as SimulationParams;
  } catch (err) {
    console.error('Failed to load simulation params from localStorage:', err);
    return null;
  }
}

export function saveCompCostLimitToLocalStorage(limit: number): void {
  try {
    localStorage.setItem(COMP_COST_LIMIT_STORAGE_KEY, JSON.stringify(limit));
  } catch (err) {
    console.error('Failed to save comp cost limit to localStorage:', err);
  }
}

export function loadCompCostLimitFromLocalStorage(): number | null {
  try {
    const data = localStorage.getItem(COMP_COST_LIMIT_STORAGE_KEY);
    if (!data) return null;
    const parsed = JSON.parse(data);
    return typeof parsed === 'number' ? parsed : null;
  } catch (err) {
    console.error('Failed to load comp cost limit from localStorage:', err);
    return null;
  }
}

export function saveTotalGamesAllTimeToLocalStorage(totalGames: number): void {
  try {
    localStorage.setItem(TOTAL_GAMES_ALL_TIME_STORAGE_KEY, JSON.stringify(totalGames));
  } catch (err) {
    console.error('Failed to save total games all time to localStorage:', err);
  }
}

export function loadTotalGamesAllTimeFromLocalStorage(): number {
  try {
    const data = localStorage.getItem(TOTAL_GAMES_ALL_TIME_STORAGE_KEY);
    if (!data) return 0;
    const parsed = JSON.parse(data);
    return typeof parsed === 'number' && parsed >= 0 ? parsed : 0;
  } catch (err) {
    console.error('Failed to load total games all time from localStorage:', err);
    return 0;
  }
}
