import { describe, it, expect, beforeEach } from 'vitest';
import { NeuralEngine } from './neuralEngine';
import { GameEngine } from './gameEngine';
import { GameState, ModelWeights, Move } from '../types';

describe('NeuralEngine', () => {
  let testState: GameState;
  let testWeights: ModelWeights;

  beforeEach(() => {
    testState = GameEngine.createInitialState(12);
    testWeights = NeuralEngine.createRandomWeights(16, 2);
  });

  describe('getInference', () => {
    it('should construct input vector with 51 elements', async () => {
      const decision = await NeuralEngine.getInference(testState, 1, testWeights);
      
      expect(decision.inputs).toBeDefined();
      expect(decision.inputs?.length).toBe(51);
    });

    it('should encode 5x5 vision grid (25 elements)', async () => {
      const decision = await NeuralEngine.getInference(testState, 1, testWeights);
      const inputs = decision.inputs!;
      
      const visionGrid = inputs.slice(0, 25);
      expect(visionGrid.length).toBe(25);
      
      visionGrid.forEach(val => {
        expect(typeof val).toBe('number');
        expect(val).toBeGreaterThanOrEqual(-1);
        expect(val).toBeLessThanOrEqual(1);
      });
    });

    it('should encode hero stats (12 elements for 4 heroes)', async () => {
      const decision = await NeuralEngine.getInference(testState, 1, testWeights);
      const inputs = decision.inputs!;
      
      const heroStats = inputs.slice(25, 37);
      expect(heroStats.length).toBe(12);
      
      heroStats.forEach(val => {
        expect(typeof val).toBe('number');
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(1);
      });
    });

    it('should encode radar features (nearest tavern, mine, enemy)', async () => {
      const decision = await NeuralEngine.getInference(testState, 1, testWeights);
      const inputs = decision.inputs!;
      
      const radarFeatures = inputs.slice(37, 47);
      expect(radarFeatures.length).toBe(10);
      
      radarFeatures.forEach(val => {
        expect(typeof val).toBe('number');
        expect(val).toBeGreaterThanOrEqual(-1);
        expect(val).toBeLessThanOrEqual(1);
      });
    });

    it('should encode turn progress (1 element)', async () => {
      const decision = await NeuralEngine.getInference(testState, 1, testWeights);
      const inputs = decision.inputs!;
      
      const turnProgress = inputs[47];
      expect(typeof turnProgress).toBe('number');
      expect(turnProgress).toBeGreaterThanOrEqual(0);
      expect(turnProgress).toBeLessThanOrEqual(1);
      expect(turnProgress).toBe(testState.turn / testState.maxTurns);
    });

    it('should perform forward pass through network', async () => {
      const decision = await NeuralEngine.getInference(testState, 1, testWeights);
      
      expect(decision.activations).toBeDefined();
      expect(Array.isArray(decision.activations)).toBe(true);
      expect(decision.activations!.length).toBeGreaterThan(0);
    });

    it('should select move using argmax from output layer', async () => {
      const decision = await NeuralEngine.getInference(testState, 1, testWeights);
      
      const validMoves = [Move.North, Move.South, Move.East, Move.West, Move.Stay];
      expect(validMoves).toContain(decision.move);
    });

    it('should return activations array with correct structure', async () => {
      const decision = await NeuralEngine.getInference(testState, 1, testWeights);
      
      expect(decision.activations).toBeDefined();
      expect(Array.isArray(decision.activations)).toBe(true);
      
      decision.activations!.forEach((layer, idx) => {
        expect(Array.isArray(layer)).toBe(true);
        expect(layer.length).toBeGreaterThan(0);
        layer.forEach(activation => {
          expect(typeof activation).toBe('number');
        });
      });
    });

    it('should calculate confidence between 0.1 and 0.99', async () => {
      const decision = await NeuralEngine.getInference(testState, 1, testWeights);
      
      expect(decision.confidence).toBeGreaterThanOrEqual(0.1);
      expect(decision.confidence).toBeLessThanOrEqual(0.99);
      expect(typeof decision.confidence).toBe('number');
    });

    it('should generate reasoning string', async () => {
      const decision = await NeuralEngine.getInference(testState, 1, testWeights);
      
      expect(decision.reasoning).toBeDefined();
      expect(typeof decision.reasoning).toBe('string');
      expect(decision.reasoning.length).toBeGreaterThan(0);
    });

    it('should include latency measurement', async () => {
      const decision = await NeuralEngine.getInference(testState, 1, testWeights);
      
      expect(decision.latency).toBeDefined();
      expect(typeof decision.latency).toBe('number');
      expect(decision.latency).toBeGreaterThanOrEqual(0);
    });

    it('should throw error if hero not found', async () => {
      await expect(
        NeuralEngine.getInference(testState, 999, testWeights)
      ).rejects.toThrow('Hero not found');
    });

    it('should handle different hero positions correctly', async () => {
      const decision1 = await NeuralEngine.getInference(testState, 1, testWeights);
      const decision2 = await NeuralEngine.getInference(testState, 2, testWeights);
      
      expect(decision1.inputs).toBeDefined();
      expect(decision2.inputs).toBeDefined();
      expect(decision1.inputs?.length).toBe(51);
      expect(decision2.inputs?.length).toBe(51);
    });
  });

  describe('createRandomWeights', () => {
    it('should create weights with correct matrix dimensions', () => {
      const weights = NeuralEngine.createRandomWeights(16, 2);
      
      expect(weights.matrices).toBeDefined();
      expect(weights.matrices.length).toBe(3);
      
      expect(weights.matrices[0].length).toBe(51);
      expect(weights.matrices[0][0].length).toBe(16);
      
      expect(weights.matrices[1].length).toBe(16);
      expect(weights.matrices[1][0].length).toBe(16);
      
      expect(weights.matrices[2].length).toBe(16);
      expect(weights.matrices[2][0].length).toBe(5);
    });

    it('should initialize weights with Xavier initialization', () => {
      const weights = NeuralEngine.createRandomWeights(16, 2);
      
      weights.matrices.forEach(matrix => {
        matrix.forEach(row => {
          row.forEach(weight => {
            expect(typeof weight).toBe('number');
            expect(weight).toBeGreaterThan(-2);
            expect(weight).toBeLessThan(2);
          });
        });
      });
    });

    it('should create correct network topology (input → hidden → output)', () => {
      const hiddenSize = 16;
      const numLayers = 2;
      const weights = NeuralEngine.createRandomWeights(hiddenSize, numLayers);
      
      expect(weights.matrices.length).toBe(numLayers + 1);
      
      expect(weights.matrices[0].length).toBe(51);
      expect(weights.matrices[0][0].length).toBe(hiddenSize);
      
      for (let i = 1; i < numLayers; i++) {
        expect(weights.matrices[i].length).toBe(hiddenSize);
        expect(weights.matrices[i][0].length).toBe(hiddenSize);
      }
      
      expect(weights.matrices[weights.matrices.length - 1].length).toBe(hiddenSize);
      expect(weights.matrices[weights.matrices.length - 1][0].length).toBe(5);
    });

    it('should create different weights on each call', () => {
      const weights1 = NeuralEngine.createRandomWeights(16, 2);
      const weights2 = NeuralEngine.createRandomWeights(16, 2);
      
      let allSame = true;
      for (let i = 0; i < weights1.matrices.length; i++) {
        for (let j = 0; j < weights1.matrices[i].length; j++) {
          for (let k = 0; k < weights1.matrices[i][j].length; k++) {
            if (weights1.matrices[i][j][k] !== weights2.matrices[i][j][k]) {
              allSame = false;
              break;
            }
          }
          if (!allSame) break;
        }
        if (!allSame) break;
      }
      
      expect(allSame).toBe(false);
    });

    it('should handle different hidden sizes and layer counts', () => {
      const weights1 = NeuralEngine.createRandomWeights(8, 1);
      const weights2 = NeuralEngine.createRandomWeights(32, 3);
      
      expect(weights1.matrices.length).toBe(2);
      expect(weights1.matrices[0][0].length).toBe(8);
      
      expect(weights2.matrices.length).toBe(4);
      expect(weights2.matrices[0][0].length).toBe(32);
    });
  });

  describe('mutateWeights', () => {
    it('should preserve matrix structure', () => {
      const original = NeuralEngine.createRandomWeights(16, 2);
      const mutated = NeuralEngine.mutateWeights(original, 0.1);
      
      expect(mutated.matrices.length).toBe(original.matrices.length);
      
      for (let i = 0; i < original.matrices.length; i++) {
        expect(mutated.matrices[i].length).toBe(original.matrices[i].length);
        expect(mutated.matrices[i][0].length).toBe(original.matrices[i][0].length);
      }
    });

    it('should apply mutation rate correctly', () => {
      const original = NeuralEngine.createRandomWeights(16, 2);
      const mutationRate = 0.5;
      const mutated = NeuralEngine.mutateWeights(original, mutationRate);
      
      let changedCount = 0;
      let totalCount = 0;
      
      for (let i = 0; i < original.matrices.length; i++) {
        for (let j = 0; j < original.matrices[i].length; j++) {
          for (let k = 0; k < original.matrices[i][j].length; k++) {
            totalCount++;
            if (original.matrices[i][j][k] !== mutated.matrices[i][j][k]) {
              changedCount++;
            }
          }
        }
      }
      
      const actualMutationRate = changedCount / totalCount;
      expect(actualMutationRate).toBeGreaterThan(0);
      expect(actualMutationRate).toBeLessThan(1);
    });

    it('should change weight distribution', () => {
      const original = NeuralEngine.createRandomWeights(16, 2);
      const mutated = NeuralEngine.mutateWeights(original, 0.3, 0.1);
      
      let hasChanges = false;
      for (let i = 0; i < original.matrices.length; i++) {
        for (let j = 0; j < original.matrices[i].length; j++) {
          for (let k = 0; k < original.matrices[i][j].length; k++) {
            if (Math.abs(original.matrices[i][j][k] - mutated.matrices[i][j][k]) > 0.0001) {
              hasChanges = true;
              break;
            }
          }
          if (hasChanges) break;
        }
        if (hasChanges) break;
      }
      
      expect(hasChanges).toBe(true);
    });

    it('should handle zero mutation rate (no changes)', () => {
      const original = NeuralEngine.createRandomWeights(16, 2);
      const mutated = NeuralEngine.mutateWeights(original, 0);
      
      for (let i = 0; i < original.matrices.length; i++) {
        for (let j = 0; j < original.matrices[i].length; j++) {
          for (let k = 0; k < original.matrices[i][j].length; k++) {
            expect(mutated.matrices[i][j][k]).toBe(original.matrices[i][j][k]);
          }
        }
      }
    });

    it('should handle high mutation rate', () => {
      const original = NeuralEngine.createRandomWeights(16, 2);
      const mutated = NeuralEngine.mutateWeights(original, 1.0, 0.1);
      
      let changedCount = 0;
      let totalCount = 0;
      
      for (let i = 0; i < original.matrices.length; i++) {
        for (let j = 0; j < original.matrices[i].length; j++) {
          for (let k = 0; k < original.matrices[i][j].length; k++) {
            totalCount++;
            if (Math.abs(original.matrices[i][j][k] - mutated.matrices[i][j][k]) > 0.0001) {
              changedCount++;
            }
          }
        }
      }
      
      const mutationRate = changedCount / totalCount;
      expect(mutationRate).toBeGreaterThan(0.9);
    });

    it('should respect sigma parameter for mutation magnitude', () => {
      const original = NeuralEngine.createRandomWeights(16, 2);
      const smallSigma = NeuralEngine.mutateWeights(original, 0.5, 0.01);
      const largeSigma = NeuralEngine.mutateWeights(original, 0.5, 0.5);
      
      let smallMaxChange = 0;
      let largeMaxChange = 0;
      
      for (let i = 0; i < original.matrices.length; i++) {
        for (let j = 0; j < original.matrices[i].length; j++) {
          for (let k = 0; k < original.matrices[i][j].length; k++) {
            const smallChange = Math.abs(original.matrices[i][j][k] - smallSigma.matrices[i][j][k]);
            const largeChange = Math.abs(original.matrices[i][j][k] - largeSigma.matrices[i][j][k]);
            
            if (smallChange > smallMaxChange) smallMaxChange = smallChange;
            if (largeChange > largeMaxChange) largeMaxChange = largeChange;
          }
        }
      }
      
      expect(largeMaxChange).toBeGreaterThan(smallMaxChange);
    });
  });

  describe('crossover', () => {
    it('should combine weights from two parents', () => {
      const parent1 = NeuralEngine.createRandomWeights(16, 1);
      const parent2 = NeuralEngine.createRandomWeights(16, 1);
      const child = NeuralEngine.crossover(parent1, parent2, 0.5);
      
      expect(child.matrices.length).toBe(parent1.matrices.length);
      
      let hasParent1Genes = false;
      let hasParent2Genes = false;
      
      for (let i = 0; i < child.matrices.length; i++) {
        expect(child.matrices[i].length).toBe(parent1.matrices[i].length);
        
        for (let j = 0; j < child.matrices[i].length; j++) {
          expect(child.matrices[i][j].length).toBe(parent1.matrices[i][j].length);
          
          for (let k = 0; k < child.matrices[i][j].length; k++) {
            if (child.matrices[i][j][k] === parent1.matrices[i][j][k]) hasParent1Genes = true;
            if (child.matrices[i][j][k] === parent2.matrices[i][j][k]) hasParent2Genes = true;
          }
        }
      }
      
      expect(hasParent1Genes || hasParent2Genes).toBe(true);
    });

    it('should respect crossover rate', () => {
      const parent1 = NeuralEngine.createRandomWeights(16, 1);
      const parent2 = NeuralEngine.createRandomWeights(16, 1);
      
      const child100 = NeuralEngine.crossover(parent1, parent2, 1.0);
      const child0 = NeuralEngine.crossover(parent1, parent2, 0.0);
      
      let allFromParent2 = true;
      let allFromParent1 = true;
      
      for (let i = 0; i < child100.matrices.length; i++) {
        for (let j = 0; j < child100.matrices[i].length; j++) {
          for (let k = 0; k < child100.matrices[i][j].length; k++) {
            if (child100.matrices[i][j][k] !== parent2.matrices[i][j][k]) allFromParent2 = false;
            if (child0.matrices[i][j][k] !== parent1.matrices[i][j][k]) allFromParent1 = false;
          }
        }
      }
      
      expect(allFromParent2).toBe(true);
      expect(allFromParent1).toBe(true);
    });

    it('should preserve network structure', () => {
      const parent1 = NeuralEngine.createRandomWeights(32, 2);
      const parent2 = NeuralEngine.createRandomWeights(32, 2);
      const child = NeuralEngine.crossover(parent1, parent2, 0.5);
      
      expect(child.matrices.length).toBe(3);
      expect(child.matrices[0].length).toBe(51);
      expect(child.matrices[0][0].length).toBe(32);
      expect(child.matrices[1].length).toBe(32);
      expect(child.matrices[1][0].length).toBe(32);
      expect(child.matrices[2].length).toBe(32);
      expect(child.matrices[2][0].length).toBe(5);
    });
  });
});

