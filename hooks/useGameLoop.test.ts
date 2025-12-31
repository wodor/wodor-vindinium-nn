import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useGameLoop } from './useGameLoop';
import type { GameState, PopulationMember, StrategyPriorities } from '../types';
import { Move } from '../types';

const makeState = (turn: number = 0): GameState => ({
  id: `test-${turn}`,
  turn,
  maxTurns: 300,
  heroes: [
    { id: 1, name: 'Hero 1', pos: { x: 1, y: 1 }, spawnPos: { x: 1, y: 1 }, life: 100, gold: 0, mineCount: 0, crashed: false },
    { id: 2, name: 'Hero 2', pos: { x: 2, y: 1 }, spawnPos: { x: 2, y: 1 }, life: 100, gold: 0, mineCount: 0, crashed: false },
    { id: 3, name: 'Hero 3', pos: { x: 1, y: 2 }, spawnPos: { x: 1, y: 2 }, life: 100, gold: 0, mineCount: 0, crashed: false },
    { id: 4, name: 'Hero 4', pos: { x: 2, y: 2 }, spawnPos: { x: 2, y: 2 }, life: 100, gold: 0, mineCount: 0, crashed: false },
  ],
  board: {
    size: 3,
    tiles: '  '.repeat(3 * 3),
  },
  finished: false,
});

const makeMember = (): PopulationMember => ({
  id: 'm1',
  fitness: 0,
  accuracy: 0,
  status: 'Test',
  generation: 0,
  weights: { matrices: [[[0]]] },
});

vi.mock('../services/gameEngine', () => {
  return {
    GameEngine: {
      createInitialState: vi.fn(() => makeState(0)),
      applyMove: vi.fn((state: GameState, _heroId: number, _move: Move) => ({
        ...state,
        turn: state.turn + 1,
      })),
    },
  };
});

vi.mock('../services/neuralEngine', () => {
  return {
    NeuralEngine: {
      getInference: vi.fn(async () => ({
        move: Move.North,
        reasoning: 'test',
        confidence: 0.9,
        activations: [[1, 2, 3]],
      })),
    },
  };
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useGameLoop (integration)', () => {
  const priorities: StrategyPriorities = { survival: 50, greed: 50, aggression: 50 };

  it('initializes game state', async () => {
    const { result } = renderHook(() => useGameLoop(makeMember(), priorities));

    await waitFor(() => {
      expect(result.current.gameState).not.toBeNull();
    });

    expect(result.current.gameState?.turn).toBe(0);
    expect(result.current.logs).toHaveLength(0);
  });

  it('step (neural hero) updates state, logs and activations', async () => {
    const member = makeMember();
    const { result } = renderHook(() => useGameLoop(member, priorities));

    await waitFor(() => {
      expect(result.current.gameState).not.toBeNull();
    });

    await act(async () => {
      await result.current.step(true);
    });

    expect(result.current.gameState?.turn).toBe(1);
    expect(result.current.logs).toHaveLength(1);
    expect(result.current.logs[0].heroId).toBe(1);
    expect(result.current.logs[0].decision.move).toBe(Move.North);
    expect(result.current.logs[0].isManual).toBe(true);
    expect(result.current.lastActivations).toEqual([[1, 2, 3]]);
  });

  it('step (NPC hero) still applies a move and logs it', async () => {
    const member = makeMember();
    const { result } = renderHook(() => useGameLoop(member, priorities));

    await waitFor(() => {
      expect(result.current.gameState).not.toBeNull();
    });

    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);

    act(() => {
      result.current.setGameState(makeState(1)); // turn=1 => heroId=2
    });

    await act(async () => {
      await result.current.step(true);
    });

    expect(randomSpy).toHaveBeenCalled();
    expect(result.current.gameState?.turn).toBe(2);
    expect(result.current.logs).toHaveLength(1);
    expect(result.current.logs[0].heroId).toBe(2);
  });

  it('resetGame clears logs and resets state flags', async () => {
    const member = makeMember();
    const { result } = renderHook(() => useGameLoop(member, priorities));

    await waitFor(() => {
      expect(result.current.gameState).not.toBeNull();
    });

    await act(async () => {
      await result.current.step(true);
    });
    expect(result.current.logs.length).toBeGreaterThan(0);

    act(() => {
      result.current.setIsAutoPlaying(true);
    });

    act(() => {
      result.current.resetGame();
    });

    expect(result.current.logs).toHaveLength(0);
    expect(result.current.lastDilemma).toBeNull();
    expect(result.current.lastActivations).toBeUndefined();
    expect(result.current.isAutoPlaying).toBe(false);
    expect(result.current.gameState?.turn).toBe(0);
  });

  it('autoplay schedules step calls when enabled (ignoring dilemma handling)', async () => {
    const member = makeMember();
    const { result } = renderHook(() => useGameLoop(member, priorities));

    await waitFor(() => {
      expect(result.current.gameState).not.toBeNull();
    });

    vi.useFakeTimers();

    act(() => {
      result.current.setIsAutoPlaying(true);
    });

    await act(async () => {
      vi.advanceTimersByTime(60);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.logs.length).toBeGreaterThanOrEqual(1);

    act(() => {
      result.current.setIsAutoPlaying(false);
    });
    vi.clearAllTimers();
  });
});

