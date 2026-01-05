import { describe, it, expect } from 'vitest';
import { calculateExplorationScore } from './explorationMetric';
import { HeroStats } from './types';

const createStats = (uniqueTiles: number, turnsStayedStill: number): HeroStats => {
  const tiles = new Set<string>();
  for (let i = 0; i < uniqueTiles; i++) {
    tiles.add(`${i},0`);
  }
  return {
    combat: { attacks: 0, kills: 0, minesStolen: 0 },
    resilience: { healthRecovered: 0, deaths: 0, totalHP: 0, turnCount: 0 },
    exploration: { uniqueTiles: tiles, turnsStayedStill },
    mineAcquisitionTurns: []
  };
};

describe('calculateExplorationScore', () => {
  it('returns 0 for no exploration', () => {
    expect(calculateExplorationScore(createStats(0, 0))).toBe(0);
  });

  it('gives 3 points per unique tile', () => {
    expect(calculateExplorationScore(createStats(10, 0))).toBe(30);
  });

  it('penalizes staying still (2 points per turn)', () => {
    expect(calculateExplorationScore(createStats(10, 5))).toBe(20);
  });

  it('caps at 100', () => {
    expect(calculateExplorationScore(createStats(50, 0))).toBe(100);
  });

  it('clamps to 0 when penalty exceeds bonus', () => {
    expect(calculateExplorationScore(createStats(1, 10))).toBe(0);
  });

  it('balances exploration vs staying still', () => {
    const score = calculateExplorationScore(createStats(20, 10));
    expect(score).toBe(40);
  });
});
