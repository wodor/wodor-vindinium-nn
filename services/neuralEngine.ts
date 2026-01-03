
import { GameState, Move, AIDecision, ModelWeights, Pos } from '../types';

export class NeuralEngine {
  private static INPUT_SIZE = 51;
  private static OUTPUT_SIZE = 5;

  private static relu(x: number): number {
    return x > 0 ? x : 0.01 * x; // Leaky ReLU for better gradient flow
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
        if (!bestPos) return [0, 0, Infinity];
        return [(bestPos.x - hero.pos.x) / size, (bestPos.y - hero.pos.y) / size, bestDist];
    };

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
    
    inputs[idx++] = nearestAnyTargetMine[0];
    inputs[idx++] = nearestAnyTargetMine[1];

    inputs[idx++] = state.turn / state.maxTurns;
    
    const healthUrgency = Math.max(0, (50 - hero.life) / 50);
    inputs[idx++] = healthUrgency;
    
    const tavernDistance = nearestTavern[2] === Infinity ? 1.0 : Math.min(1.0, nearestTavern[2] / 20);
    const healthTavernUrgency = healthUrgency * (1.0 - tavernDistance * 0.5);
    inputs[idx++] = healthTavernUrgency;
    
    inputs[idx++] = hero.life < 40 ? 1.0 : 0.0;

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
        nextActivations[j] = layerIdx === weights.matrices.length - 1 ? Math.tanh(sum) : this.relu(sum);
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

    const selectedMove = moveMap[maxIdx];
    
    let reasoning = "";
    if (hero.life < 40 && nearestTavern[2] !== Infinity) {
      reasoning = `HP critical (${hero.life}). Calculated optimal path towards nearest Tavern for urgent maintenance.`;
    } else if (nearestNeutralMine[2] !== Infinity && nearestNeutralMine[2] < 5) {
      reasoning = `Detected high-yield asset at distance ${nearestNeutralMine[2]}. Executing acquisition protocol.`;
    } else if (nearestEnemyHero[2] !== Infinity && nearestEnemyHero[2] < 3 && hero.life > 60) {
      reasoning = `Proximity alert: Enemy hero detected. Initiating combat aggression sequence to clear current path.`;
    } else {
      reasoning = `Analyzing global map state. Navigating toward high-density resource zone at current confidence ${((maxVal + 1)/2 * 100).toFixed(0)}%.`;
    }

    const latency = performance.now() - startTime;
    return {
      move: selectedMove,
      reasoning,
      confidence: Math.max(0.1, Math.min(0.99, (maxVal + 1) / 2)),
      latency,
      activations: allLayerActivations,
      inputs: [...inputs]
    };
  }

  static createRandomWeights(hiddenSize: number, numHiddenLayers: number): ModelWeights {
    const xavier = (rows: number, cols: number) => {
        const std = Math.sqrt(4 / (rows + cols)); 
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
           const z = Math.sqrt(-2.0 * Math.log(u1 || 0.001)) * Math.cos(2.0 * Math.PI * u2);
           if (Math.random() < 0.05) return (Math.random() * 2 - 1) * sigma * 2;
           return val + z * sigma;
        }
        return val;
      }));

    return {
      matrices: weights.matrices.map(m => mutateMatrix(m))
    };
  }

  static crossover(parent1: ModelWeights, parent2: ModelWeights, crossoverRate: number = 0.5): ModelWeights {
    const crossMatrix = (m1: number[][], m2: number[][]) => 
      m1.map((row, i) => 
        row.map((val, j) => {
          if (Math.random() < crossoverRate) return m2[i][j];
          return val;
        })
      );

    return {
      matrices: parent1.matrices.map((m, idx) => crossMatrix(m, parent2.matrices[idx]))
    };
  }
}
