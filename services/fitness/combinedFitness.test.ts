import { describe, it, expect } from 'vitest';
import { calculateFitness, calculateFitnessFromGame } from './combinedFitness';
import { FitnessWeights, HeroStats } from './types';
import { Hero } from '../../types';

const createHero = (gold: number, mineCount: number): Hero => ({
  id: 1,
  name: 'Hero 1',
  pos: { x: 5, y: 5 },
  spawnPos: { x: 0, y: 0 },
  life: 100,
  gold,
  mineCount,
  crashed: false
});

const createStats = (): HeroStats => {
  const tiles = new Set<string>();
  for (let i = 0; i < 20; i++) {
    tiles.add(`${i},0`);
  }
  return {
    combat: { attacks: 0, kills: 0, minesStolen: 0 },
    resilience: { healthRecovered: 0, deaths: 0, totalHP: 1000, turnCount: 10 },
    exploration: { uniqueTiles: tiles, turnsStayedStill: 0 },
    mineAcquisitionTurns: []
  };
};

describe('calculateFitness', () => {
  it('calculates weighted average correctly', () => {
    const weights: FitnessWeights = { gold: 1, mine: 1, survival: 1, exploration: 1 };
    const result = calculateFitness(100, 50, 75, 25, weights);
    expect(result).toBe(62.5);
  });

  it('applies different weights correctly', () => {
    const weights: FitnessWeights = { gold: 3, mine: 1, survival: 2, exploration: 1 };
    const result = calculateFitness(100, 0, 50, 0, weights);
    expect(result).toBeCloseTo((300 + 0 + 100 + 0) / 7, 5);
  });

  it('returns 0 when all weights are 0', () => {
    const weights: FitnessWeights = { gold: 0, mine: 0, survival: 0, exploration: 0 };
    expect(calculateFitness(100, 100, 100, 100, weights)).toBe(0);
  });

  it('handles single metric weight', () => {
    const weights: FitnessWeights = { gold: 1, mine: 0, survival: 0, exploration: 0 };
    expect(calculateFitness(80, 100, 100, 100, weights)).toBe(80);
  });
});

describe('calculateFitnessFromGame', () => {
  it('calculates all metrics and combines them', () => {
    const hero = createHero(200, 2);
    const allHeroes = [hero, createHero(100, 1), createHero(50, 0), createHero(50, 1)];
    const stats = createStats();
    const weights: FitnessWeights = { gold: 1, mine: 1, survival: 1, exploration: 1 };
    
    const result = calculateFitnessFromGame(hero, stats, allHeroes, weights);
    
    expect(result.breakdown.gold).toBe(50);
    expect(result.breakdown.mines).toBe(50);
    expect(result.breakdown.survival).toBe(100);
    expect(result.breakdown.exploration).toBe(60);
    expect(result.fitness).toBe((50 + 50 + 100 + 60) / 4);
  });

  it('returns breakdown with individual scores', () => {
    const hero = createHero(100, 4);
    const allHeroes = [hero];
    const stats = createStats();
    const weights: FitnessWeights = { gold: 1, mine: 1, survival: 1, exploration: 1 };
    
    const result = calculateFitnessFromGame(hero, stats, allHeroes, weights);
    
    expect(result.breakdown).toHaveProperty('gold');
    expect(result.breakdown).toHaveProperty('mines');
    expect(result.breakdown).toHaveProperty('survival');
    expect(result.breakdown).toHaveProperty('exploration');
    expect(result.breakdown.gold).toBe(100);
    expect(result.breakdown.mines).toBe(100);
  });
});
