
import { GameState, Move, AIDecision, ModelWeights, Pos } from '../types';

/**
 * Deep Neural Inference Engine supporting dynamic topologies
 * Expanded Input Schema (48 units):
 * - [0..24]   Vision (5x5 local grid)
 * - [25..28]  HP (All 4 heroes)
 * - [29..32]  Gold (All 4 heroes)
 * - [33..36]  Mines (All 4 heroes)
 * - [37..44]  Legacy Radars (Tavern, NeutMine, EnemyMine, EnemyHero)
 * - [45..46]  Global Mine Radar (Closest Non-Owned Mine)
 * - [47]      Turn Progress (0.0 -> 1.0)
 */
export class NeuralEngine {
  private static INPUT_SIZE = 48;
  private static OUTPUT_SIZE = 5;

  private static relu(x: number): number {
    return x > 0 ? x : 0;
  }

  private static getDistance(p1: Pos, p2: Pos): number {
    return Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y);
  }

  static async getInference(state: GameState, heroId: number, weights: ModelWeights): Promise<AIDecision> {
    const startTime = performance.now();
    const hero = state.heroes.find(h => h.id === heroId);
    if (!hero) throw new Error("Hero not found");

    const size = state.board.size;
    const tilesStr = state.board.tiles;

    const getTileAt = (x: number, y: number): string | null => {
      if (x < 0 || x >= size || y < 0 || y >= size) return null;
      const idx = (y * size + x) * 2;
      return tilesStr.substring(idx, idx + 2);
    };

    const inputs: number[] = new Array(this.INPUT_SIZE).fill(0);
    let idx = 0;
    
    // Vision (5x5)
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const tx = hero.pos.x + dx;
        const ty = hero.pos.y + dy;
        const tile = getTileAt(tx, ty);

        if (tile === null) {
          inputs[idx++] = -1;
        } else {
          if (tile === '  ') inputs[idx++] = 0;
          else if (tile === '##') inputs[idx++] = -0.8;
          else if (tile === '[]') inputs[idx++] = 1.0;
          else if (tile.startsWith('$')) {
            const owner = tile[1];
            inputs[idx++] = owner === '-' ? 0.7 : (owner === String(heroId) ? 0.3 : 0.9);
          }
          else if (tile.startsWith('@')) {
            inputs[idx++] = tile[1] === String(heroId) ? 0 : -0.9;
          }
          else inputs[idx++] = 0;
        }
      }
    }
    
    const sortedHeroes = [...state.heroes].sort((a, b) => a.id - b.id);
    sortedHeroes.forEach(h => { inputs[idx++] = h.life / 100; });
    sortedHeroes.forEach(h => { inputs[idx++] = Math.min(1, h.gold / 1000); });
    sortedHeroes.forEach(h => { inputs[idx++] = Math.min(1, h.mineCount / 10); });

    const findNearest = (check: (tile: string) => boolean) => {
        let bestDist = Infinity;
        let bestPos: Pos | null = null;
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const tile = getTileAt(x, y);
                if (tile && check(tile)) {
                    const d = this.getDistance(hero.pos, {x, y});
                    if (d < bestDist && d > 0) {
                        bestDist = d;
                        bestPos = {x, y};
                    }
                }
            }
        }
        if (!bestPos) return [0, 0];
        return [(bestPos.x - hero.pos.x) / size, (bestPos.y - hero.pos.y) / size];
    };

    // Radar features
    const nearestTavern = findNearest((t) => t === '[]');
    const nearestNeutralMine = findNearest((t) => t === '$-');
    const nearestEnemyMine = findNearest((t) => t.startsWith('$') && t !== '$-' && t !== `$${hero.id}`);
    const nearestEnemyHero = findNearest((t) => t.startsWith('@') && t !== `@${hero.id}`);
    const nearestAnyTargetMine = findNearest((t) => t.startsWith('$') && t !== `$${hero.id}`);

    inputs[idx++] = nearestTavern[0];
    inputs[idx++] = nearestTavern[1];
    inputs[idx++] = nearestNeutralMine[0];
    inputs[idx++] = nearestNeutralMine[1];
    inputs[idx++] = nearestEnemyMine[0];
    inputs[idx++] = nearestEnemyMine[1];
    inputs[idx++] = nearestEnemyHero[0];
    inputs[idx++] = nearestEnemyHero[1];
    
    // Global Target Mine Radar (45, 46)
    inputs[idx++] = nearestAnyTargetMine[0];
    inputs[idx++] = nearestAnyTargetMine[1];

    // Temporal context (47)
    inputs[idx++] = state.turn / state.maxTurns;

    // Forward Pass
    let currentActivations = inputs;
    const allLayerActivations: number[][] = [];

    for (let layerIdx = 0; layerIdx < weights.matrices.length; layerIdx++) {
      const matrix = weights.matrices[layerIdx];
      if (!matrix || matrix.length === 0) continue;
      
      const nextSize = matrix[0].length;
      const nextActivations = new Array(nextSize).fill(0);
      
      for (let j = 0; j < nextSize; j++) {
        let sum = 0;
        for (let i = 0; i < currentActivations.length; i++) {
          sum += currentActivations[i] * (matrix[i][j] || 0);
        }
        nextActivations[j] = layerIdx === weights.matrices.length - 1 ? sum : this.relu(sum);
      }
      
      currentActivations = nextActivations;
      allLayerActivations.push([...currentActivations]);
    }

    const moveMap = [Move.North, Move.South, Move.East, Move.West, Move.Stay];
    let maxIdx = 4;
    let maxVal = -Infinity;
    for (let i = 0; i < this.OUTPUT_SIZE; i++) {
      if (currentActivations[i] > maxVal) {
        maxVal = currentActivations[i];
        maxIdx = i;
      }
    }

    const latency = performance.now() - startTime;
    return {
      move: moveMap[maxIdx],
      reasoning: `Global Mine Radar engaged. Non-owned target tracking. Turn: ${state.turn}. Confidence: ${((maxVal + 2) / 4 * 100).toFixed(1)}%.`,
      confidence: Math.max(0.1, Math.min(0.99, (maxVal + 2) / 4)),
      latency,
      activations: allLayerActivations,
      inputs: [...inputs]
    };
  }

  static createRandomWeights(hiddenSize: number, numHiddenLayers: number): ModelWeights {
    const xavier = (rows: number, cols: number) => {
        const std = Math.sqrt(2 / (rows + cols));
        return Array.from({ length: rows }, () => 
            Array.from({ length: cols }, () => (Math.random() * 2 - 1) * std)
        );
    };

    const matrices: number[][][] = [];
    matrices.push(xavier(this.INPUT_SIZE, hiddenSize));
    for (let i = 1; i < numHiddenLayers; i++) {
      matrices.push(xavier(hiddenSize, hiddenSize));
    }
    matrices.push(xavier(hiddenSize, this.OUTPUT_SIZE));

    return { matrices };
  }

  static mutateWeights(weights: ModelWeights, mutationRate: number, sigma: number = 0.1): ModelWeights {
    const mutateMatrix = (matrix: number[][]) => 
      matrix.map(row => row.map(val => {
        if (Math.random() < mutationRate) {
           const u1 = Math.random();
           const u2 = Math.random();
           const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
           return val + z * sigma;
        }
        return val;
      }));

    return {
      matrices: weights.matrices.map(m => mutateMatrix(m))
    };
  }
}
