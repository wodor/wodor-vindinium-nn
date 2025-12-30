
import { GameState, Move, AIDecision, ModelWeights, Pos } from '../types';

/**
 * Optimized Inference Engine with Peripheral Radar & Activation Tracking
 */
export class NeuralEngine {
  private static INPUT_SIZE = 41; // 25 vision + 8 stats + 8 radar
  private static HIDDEN_SIZE = 16;
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
    const tiles: string[] = [];
    for (let i = 0; i < state.board.tiles.length; i += 2) {
      tiles.push(state.board.tiles.substring(i, i + 2));
    }

    // 1. Input construction (Feature Engineering)
    const inputs: number[] = new Array(this.INPUT_SIZE).fill(0);
    let idx = 0;
    
    // Group A: Local Vision 5x5 (25 neurons)
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const tx = hero.pos.x + dx;
        const ty = hero.pos.y + dy;
        if (tx < 0 || tx >= size || ty < 0 || ty >= size) {
          inputs[idx++] = -1; // Out of bounds
        } else {
          const tile = tiles[ty * size + tx];
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
    
    // Group B: Hero Stats (8 neurons) - Normalized
    const sortedHeroes = [...state.heroes].sort((a, b) => a.id - b.id);
    sortedHeroes.forEach(h => {
      inputs[idx++] = h.life / 100;
      inputs[idx++] = Math.min(1, h.gold / 1000);
    });

    // Group C: Long-Range Radar (8 neurons)
    const findNearest = (check: (tile: string, pos: Pos) => boolean) => {
        let bestDist = Infinity;
        let bestPos: Pos | null = null;
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const tile = tiles[y * size + x];
                if (check(tile, {x, y})) {
                    const d = this.getDistance(hero.pos, {x, y});
                    if (d < bestDist && d > 0) {
                        bestDist = d;
                        bestPos = {x, y};
                    }
                }
            }
        }
        if (!bestPos) return [0, 0];
        return [
            (bestPos.x - hero.pos.x) / size,
            (bestPos.y - hero.pos.y) / size
        ];
    };

    const nearestTavern = findNearest((t) => t === '[]');
    const nearestNeutralMine = findNearest((t) => t === '$-');
    const nearestEnemyMine = findNearest((t) => t.startsWith('$') && t !== '$-' && t !== `$${hero.id}`);
    const nearestEnemyHero = findNearest((t) => t.startsWith('@') && t !== `@${hero.id}`);

    inputs[idx++] = nearestTavern[0];
    inputs[idx++] = nearestTavern[1];
    inputs[idx++] = nearestNeutralMine[0];
    inputs[idx++] = nearestNeutralMine[1];
    inputs[idx++] = nearestEnemyMine[0];
    inputs[idx++] = nearestEnemyMine[1];
    inputs[idx++] = nearestEnemyHero[0];
    inputs[idx++] = nearestEnemyHero[1];

    // 2. Forward Pass: Hidden Layer
    const hidden: number[] = new Array(this.HIDDEN_SIZE).fill(0);
    const w1 = weights.w1;
    for (let j = 0; j < this.HIDDEN_SIZE; j++) {
      let sum = 0;
      for (let i = 0; i < this.INPUT_SIZE; i++) {
        sum += inputs[i] * (w1[i]?.[j] || 0);
      }
      hidden[j] = this.relu(sum);
    }

    // 3. Forward Pass: Output Layer
    const outputs: number[] = new Array(this.OUTPUT_SIZE).fill(0);
    const w2 = weights.w2;
    const moveMap = [Move.North, Move.South, Move.East, Move.West, Move.Stay];
    
    for (let j = 0; j < this.OUTPUT_SIZE; j++) {
      let sum = 0;
      for (let i = 0; i < this.HIDDEN_SIZE; i++) {
        sum += hidden[i] * (w2[i]?.[j] || 0);
      }
      outputs[j] = sum;
    }

    // Softmax-like selection (Argmax)
    let maxIdx = 4; // Default Stay
    let maxVal = -Infinity;
    for (let i = 0; i < this.OUTPUT_SIZE; i++) {
      if (outputs[i] > maxVal) {
        maxVal = outputs[i];
        maxIdx = i;
      }
    }

    const latency = performance.now() - startTime;
    return {
      move: moveMap[maxIdx],
      reasoning: `Inference Cycle Complete. Latency: ${latency.toFixed(2)}ms. Hidden layer state: [${hidden.map(v => v.toFixed(1)).join(',')}]. Primary vector focus: ${moveMap[maxIdx]}.`,
      confidence: Math.max(0.1, Math.min(0.99, maxVal / 2)),
      latency,
      activations: hidden
    };
  }

  static createRandomWeights(): ModelWeights {
    const xavier = (rows: number, cols: number) => {
        const std = Math.sqrt(2 / (rows + cols));
        return Array.from({ length: rows }, () => 
            Array.from({ length: cols }, () => (Math.random() * 2 - 1) * std)
        );
    };

    return {
      w1: xavier(this.INPUT_SIZE, this.HIDDEN_SIZE),
      w2: xavier(this.HIDDEN_SIZE, this.OUTPUT_SIZE)
    };
  }

  static mutateWeights(weights: ModelWeights, mutationRate: number, sigma: number = 0.1): ModelWeights {
    const mutate = (matrix: number[][]) => 
      matrix.map(row => row.map(val => {
        if (Math.random() < mutationRate) {
           return val + (Math.random() * 2 - 1) * sigma;
        }
        return val;
      }));

    return {
      w1: mutate(weights.w1),
      w2: mutate(weights.w2)
    };
  }
}
