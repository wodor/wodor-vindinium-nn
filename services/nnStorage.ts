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

export interface TopologyConfig {
  hiddenSize: number;
  numLayers: number;
}

export interface FitnessWeights {
  gold: number;
  mine: number;
  survival: number;
  combat: number;
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
    return JSON.parse(data) as FitnessWeights;
  } catch (err) {
    console.error('Failed to load fitness weights from localStorage:', err);
    return null;
  }
}
