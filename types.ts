
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
};

export type ModelWeights = {
  w1: number[][]; // 41x16 (25 vision + 8 stats + 8 long-range radar)
  w2: number[][]; // 16x5
};

export interface PopulationMember {
  id: string;
  fitness: number;
  accuracy: number;
  status: string;
  weights: ModelWeights;
}

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
