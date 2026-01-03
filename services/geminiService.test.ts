import { describe, expect, it, vi } from 'vitest';
import { Move, type GameState } from '../types';

function makeState(): GameState {
  const size = 3;
  return {
    id: 's',
    turn: 0,
    maxTurns: 300,
    finished: false,
    heroes: [
      {
        id: 1,
        name: 'H1',
        pos: { x: 1, y: 1 },
        spawnPos: { x: 1, y: 1 },
        life: 100,
        gold: 0,
        mineCount: 0,
        crashed: false
      }
    ],
    board: { size, tiles: '  '.repeat(size * size) }
  };
}

describe('getAIDecision', () => {
  it('returns fallback decision when no API key configured', async () => {
    const originalApiKey = process.env.API_KEY;
    const originalGeminiKey = process.env.GEMINI_API_KEY;

    try {
      delete process.env.API_KEY;
      delete process.env.GEMINI_API_KEY;
      vi.resetModules();

      const { getAIDecision } = await import('./geminiService');
      const decision = await getAIDecision(
        makeState(),
        1,
        { survival: 50, greed: 50, aggression: 50 },
        false
      );

      expect(decision.move).toBe(Move.Stay);
      expect(decision.confidence).toBe(0);
      expect(decision.reasoning).toMatch(/fallback/i);
    } finally {
      process.env.API_KEY = originalApiKey;
      process.env.GEMINI_API_KEY = originalGeminiKey;
      vi.resetModules();
    }
  });

  it('throws when hero is not found', async () => {
    const originalApiKey = process.env.API_KEY;
    const originalGeminiKey = process.env.GEMINI_API_KEY;

    try {
      delete process.env.API_KEY;
      delete process.env.GEMINI_API_KEY;
      vi.resetModules();

      const { getAIDecision } = await import('./geminiService');
      await expect(
        getAIDecision(
          makeState(),
          999,
          { survival: 50, greed: 50, aggression: 50 },
          false
        )
      ).rejects.toThrow('Hero not found');
    } finally {
      process.env.API_KEY = originalApiKey;
      process.env.GEMINI_API_KEY = originalGeminiKey;
      vi.resetModules();
    }
  });
});

