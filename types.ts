
export type Pos = {
  x: number;
  y: number;
};

export enum Move {
  Stay = 'Stay',
  North = 'North',
  South = 'South',
  East = 'East',
  West = 'West'
}

export type SynthesisLog = {
  generation: number;
  mutationMagnitude: number;
  deltas: {
    gold: number;
    mines: number;
    survival: number;
    combat: number;
  };
  totalFitnessDelta: number;
  timestamp: number;
};

export type TestResult = {
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
  details?: string;
};

export type StrategyPriorities = {
  survival: number; // 0-100
  greed: number;    // 0-100
  aggression: number; // 0-100
};

export type StrategicDilemma = {
  question: string;
  optionA: { label: string; priorities: StrategyPriorities; description: string };
  optionB: { label: string; priorities: StrategyPriorities; description: string };
};

export type AIDecision = {
  move: Move;
  reasoning: string;
  confidence: number;
  prioritiesUsed?: StrategyPriorities;
  dilemma?: StrategicDilemma;
  latency?: number;
  activations?: number[][] | undefined; // Layer-by-layer activations
  inputs?: number[]; // Raw input vector (46 units)
};

export type ModelWeights = {
  matrices: number[][][]; // Array of weights between layers
};

export interface PopulationMember {
  id: string;
  fitness: number;
  accuracy: number;
  status: string;
  weights: ModelWeights;
  generation: number;
  config?: {
    hiddenSize: number;
    numLayers: number;
  };
  fitnessBreakdown?: {
    gold: number;
    mines: number;
    survival: number;
    combat: number;
  };
}

export type SavedCandidate = {
  version: string;
  member: PopulationMember;
  config: {
    hiddenSize: number;
    numLayers: number;
  };
  timestamp: number;
};

export type Hero = {
  id: number;
  name: string;
  pos: Pos;
  lastPos?: Pos;
  life: number;
  gold: number;
  mineCount: number;
  spawnPos: Pos;
  crashed: boolean;
  userId?: string;
};

export type GameState = {
  id: string;
  turn: number;
  maxTurns: number;
  heroes: Hero[];
  board: {
    size: number;
    tiles: string; // 2 chars per tile
  };
  finished: boolean;
};

export type GameLog = {
  turn: number;
  heroId: number;
  decision: AIDecision;
  timestamp: number;
  isManual?: boolean;
};