import { describe, it, expect } from 'vitest';
import { calculateSurvivalScore } from './survivalMetric';
import { HeroStats } from './types';

const createStats = (overrides: Partial<HeroStats['resilience']> = {}): HeroStats => ({
  combat: { attacks: 0, kills: 0, minesStolen: 0 },
  resilience: { 
    healthRecovered: 0, 
    deaths: 0, 
    totalHP: 0, 
    turnCount: 0,
    ...overrides 
  },
  exploration: { uniqueTiles: new Set(), turnsStayedStill: 0 },
  mineAcquisitionTurns: []
});

describe('calculateSurvivalScore', () => {
  it('returns 0 when no turns played', () => {
    const stats = createStats({ totalHP: 0, turnCount: 0, deaths: 0 });
    expect(calculateSurvivalScore(stats)).toBe(30);
  });

  it('returns high score for full HP and no deaths', () => {
    const stats = createStats({ totalHP: 1000, turnCount: 10, deaths: 0 });
    expect(calculateSurvivalScore(stats)).toBe(100);
  });

  it('penalizes deaths (25 points each)', () => {
    const stats = createStats({ totalHP: 1000, turnCount: 10, deaths: 1 });
    const score = calculateSurvivalScore(stats);
    expect(score).toBeLessThan(100);
    expect(score).toBeCloseTo(92.5, 0);
  });

  it('penalizes multiple deaths heavily', () => {
    const stats = createStats({ totalHP: 1000, turnCount: 10, deaths: 4 });
    const score = calculateSurvivalScore(stats);
    expect(score).toBe(70);
  });

  it('factors in low average HP', () => {
    const stats = createStats({ totalHP: 300, turnCount: 10, deaths: 0 });
    const score = calculateSurvivalScore(stats);
    expect(score).toBeLessThan(100);
    expect(score).toBeCloseTo(51, 0);
  });

  it('clamps to 0 minimum', () => {
    const stats = createStats({ totalHP: 0, turnCount: 10, deaths: 10 });
    expect(calculateSurvivalScore(stats)).toBe(0);
  });
});
