export type FitnessWeights = {
  gold: number;
  mine: number;
  survival: number;
  exploration: number;
};

export type HeroStats = {
  combat: { attacks: number; kills: number; minesStolen: number };
  resilience: { healthRecovered: number; deaths: number; totalHP: number; turnCount: number };
  exploration: { uniqueTiles: Set<string>; turnsStayedStill: number };
  mineAcquisitionTurns: number[];
};

export type FitnessBreakdown = {
  gold: number;
  mines: number;
  survival: number;
  exploration: number;
};

export const DEFAULT_FITNESS_WEIGHTS: FitnessWeights = { 
  gold: 3, 
  mine: 1, 
  survival: 2, 
  exploration: 1 
};
