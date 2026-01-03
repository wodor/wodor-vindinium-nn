import { describe, expect, it, vi } from 'vitest';
import { Move, type PopulationMember } from '../types';

vi.mock('./neuralEngine', () => {
  return {
    NeuralEngine: {
      getInference: vi.fn(async () => {
        const inputs = new Array<number>(46).fill(0);
        inputs[11] = -0.8;

        return {
          move: Move.West,
          reasoning: 'mock',
          confidence: 1,
          inputs,
          activations: [[], [0, 0, 0, 10, -1]]
        };
      })
    }
  };
});

import { TestRunner } from './testRunner';

function createDummyAgent(): PopulationMember {
  return {
    id: 'agent-1',
    fitness: 0,
    accuracy: 0,
    status: 'active',
    generation: 0,
    weights: { matrices: [] }
  };
}

describe('TestRunner.runDiagnostics', () => {
  it('returns a failing agent-check when no agent is provided', async () => {
    const results = await TestRunner.runDiagnostics(null);

    const agentCheck = results.find(r => r.name === 'NN: Agent Check');
    expect(agentCheck).toBeTruthy();
    expect(agentCheck?.passed).toBe(false);
    expect(agentCheck?.actual).toBe('No Agent Provided');
  });

  it('includes NN vision and argmax checks when an agent is provided', async () => {
    const results = await TestRunner.runDiagnostics(createDummyAgent());

    const vision = results.find(r => r.name === 'NN: Vision Grid (West)');
    expect(vision).toBeTruthy();
    expect(vision?.passed).toBe(true);

    const argmax = results.find(r => r.name === 'NN: Argmax Integrity');
    expect(argmax).toBeTruthy();
    expect(argmax?.passed).toBe(true);
    expect(argmax?.actual).toContain(Move.West);
  });
});

