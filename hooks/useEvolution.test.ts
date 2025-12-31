import { describe, it, expect } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useEvolution } from './useEvolution';

describe('useEvolution (integration)', () => {
  it('initializes population and defaults', () => {
    const { result } = renderHook(() => useEvolution());

    expect(result.current.population).toHaveLength(4);
    expect(result.current.generation).toBe(0);
    expect(result.current.hiddenSize).toBe(16);
    expect(result.current.numLayers).toBe(1);
    expect(result.current.isAutoEvolving).toBe(true);
  });

  it('resetEvolution resets population and clears selection/history/logs', () => {
    const { result } = renderHook(() => useEvolution());

    act(() => {
      result.current.setIsAutoEvolving(false);
    });

    act(() => {
      result.current.selectSpecimen(result.current.population[0].id);
    });

    act(() => {
      result.current.resetEvolution(32, 2, 8);
    });

    expect(result.current.population).toHaveLength(8);
    expect(result.current.hiddenSize).toBe(32);
    expect(result.current.numLayers).toBe(2);
    expect(result.current.generation).toBe(0);
    expect(result.current.history).toHaveLength(0);
    expect(result.current.synthesisLogs).toHaveLength(0);
    expect(result.current.selectedSpecimenId).toBeNull();
    expect(result.current.activeNeuralWeights).toBeNull();
  });

  it('runEvolutionStep (heuristic) advances generation and produces next generation', async () => {
    const { result } = renderHook(() => useEvolution());

    act(() => {
      result.current.setIsAutoEvolving(false);
    });

    await act(async () => {
      await result.current.runEvolutionStep();
    });

    expect(result.current.generation).toBe(1);
    expect(result.current.population).toHaveLength(4);
    expect(result.current.population[0].status).toBe('Elite_Specimen');
    expect(result.current.population[1].status).toBe('Direct_Heir');
    expect(result.current.population[2].status).toBe('Mutated_Child');
    expect(result.current.population[3].status).toBe('Mutated_Child');
    expect(result.current.synthesisLogs.length).toBeGreaterThan(0);
    expect(result.current.history.length).toBeGreaterThan(0);
  });

  it('runEvolutionStep mutates weights for non-elite members', async () => {
    const { result } = renderHook(() => useEvolution());

    act(() => {
      result.current.setIsAutoEvolving(false);
    });

    await act(async () => {
      await result.current.runEvolutionStep();
    });

    const elite = result.current.population[0];
    const child = result.current.population.find(m => m.status !== 'Elite_Specimen');
    expect(child).toBeDefined();
    expect(child!.weights.matrices.length).toBe(elite.weights.matrices.length);

    let differs = false;
    for (let layer = 0; layer < elite.weights.matrices.length; layer++) {
      const a = elite.weights.matrices[layer];
      const b = child!.weights.matrices[layer];
      for (let i = 0; i < a.length; i++) {
        for (let j = 0; j < a[i].length; j++) {
          if (a[i][j] !== b[i][j]) {
            differs = true;
            break;
          }
        }
        if (differs) break;
      }
      if (differs) break;
    }

    expect(differs).toBe(true);
  });

  it('runEvolutionStep (headless) runs simulation and advances generation', async () => {
    const { result } = renderHook(() => useEvolution());

    act(() => {
      result.current.setIsAutoEvolving(false);
      result.current.toggleHeadless();
    });
    expect(result.current.headlessMode).toBe(true);

    await act(async () => {
      await result.current.runEvolutionStep();
    });

    expect(result.current.generation).toBe(1);
    expect(result.current.population[0].status).toBe('Elite_Specimen');
    expect(result.current.synthesisLogs.length).toBeGreaterThan(0);
    expect(result.current.history.length).toBeGreaterThan(0);
  }, 10000);

  it('auto-evolution can be enabled and advances generation', async () => {
    const { result } = renderHook(() => useEvolution());

    act(() => {
      result.current.setIsAutoEvolving(true);
    });

    await waitFor(() => {
      expect(result.current.generation).toBeGreaterThanOrEqual(1);
    }, { timeout: 5000 });

    act(() => {
      result.current.setIsAutoEvolving(false);
    });
  });

  it('selectSpecimen sets selectedSpecimenId and activeNeuralWeights', () => {
    const { result } = renderHook(() => useEvolution());
    const id = result.current.population[0].id;

    act(() => {
      result.current.setIsAutoEvolving(false);
    });

    act(() => {
      result.current.selectSpecimen(id);
    });

    expect(result.current.selectedSpecimenId).toBe(id);
    expect(result.current.activeNeuralWeights?.id).toBe(id);
  });

  it('loadBest selects the highest-fitness specimen', async () => {
    const { result } = renderHook(() => useEvolution());

    act(() => {
      result.current.setIsAutoEvolving(false);
    });

    await act(async () => {
      await result.current.runEvolutionStep();
    });

    act(() => {
      result.current.loadBest();
    });

    expect(result.current.selectedSpecimenId).toBe(result.current.population[0].id);
    expect(result.current.activeNeuralWeights?.id).toBe(result.current.population[0].id);
  });
});
