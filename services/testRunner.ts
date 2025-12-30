
import { GameEngine } from './gameEngine';
import { NeuralEngine } from './neuralEngine';
import { ScenarioInterpreter } from './scenarioInterpreter';
import { Move, TestResult, PopulationMember } from '../types';

export class TestRunner {
  static async runDiagnostics(activeAgent: PopulationMember | null): Promise<TestResult[]> {
    const results: TestResult[] = [];

    // 1. Coordinate & Scenario Parsing Logic
    const wallScenario = "Given a board of size 5\nAnd Hero 1 is at 1,1\nAnd a Wall is at 0,1";
    const scenario = ScenarioInterpreter.parse(wallScenario);
    const h1 = scenario.heroes[0];
    
    results.push({
      name: "Coordinate Translation",
      passed: h1.pos.x === 1 && h1.pos.y === 1,
      expected: "Hero @ (1,1)",
      actual: `Hero @ (${h1.pos.x},${h1.pos.y})`
    });

    // 2. Game Engine Physics (Collision)
    const stateAfterWest = GameEngine.applyMove(scenario, 1, Move.West);
    const hAfterWest = stateAfterWest.heroes[0];
    results.push({
      name: "Engine: Collision Check",
      passed: hAfterWest.pos.x === 1 && hAfterWest.pos.y === 1,
      expected: "Stay at (1,1) on West move into Wall",
      actual: hAfterWest.pos.x === 0 ? "Clip Error (Pos 0,1)" : "Success (Pos 1,1)"
    });

    results.push({
      name: "Engine: Movement Cost",
      passed: hAfterWest.life === 99,
      expected: "HP: 99 (100 - 1)",
      actual: `HP: ${hAfterWest.life}`
    });

    // 3. Neural Vision & Argmax Consistency
    if (activeAgent) {
      const decision = await NeuralEngine.getInference(scenario, 1, activeAgent.weights);
      const inputs = decision.inputs || [];
      
      // Index 11 is West (-1, 0 relative to center 12 in 5x5 grid)
      const westInput = inputs[11];
      results.push({
        name: "NN: Vision Grid (West)",
        passed: westInput === -0.8,
        expected: "Wall Detection (-0.8)",
        actual: `Detected: ${westInput}`
      });

      // Verify Argmax Logic
      // We manually check if the returned move string corresponds to the expected moveMap index
      const moveMap = [Move.North, Move.South, Move.East, Move.West, Move.Stay];
      const outputLayer = decision.activations ? decision.activations[decision.activations.length - 1] : [];
      
      if (outputLayer.length === 5) {
        let maxVal = -Infinity;
        let maxIdx = -1;
        outputLayer.forEach((v, i) => {
            if (v > maxVal) { maxVal = v; maxIdx = i; }
        });

        results.push({
          name: "NN: Argmax Integrity",
          passed: decision.move === moveMap[maxIdx],
          expected: `Selected: ${moveMap[maxIdx]}`,
          actual: `Selected: ${decision.move}`
        });
      }
    } else {
      results.push({
        name: "NN: Agent Check",
        passed: false,
        expected: "Agent Deployed",
        actual: "No Agent Provided"
      });
    }

    // 4. Tavern Healing Logic
    const tavernScenarioStr = "Given a board of size 5\nAnd Hero 1 is at 1,1 with 50 HP and 10 Gold\nAnd a Tavern is at 1,2";
    const tavernScenario = ScenarioInterpreter.parse(tavernScenarioStr);
    const stateAfterHeal = GameEngine.applyMove(tavernScenario, 1, Move.South);
    const hAfterHeal = stateAfterHeal.heroes[0];

    results.push({
      name: "Engine: Tavern Logic",
      passed: hAfterHeal.life === 99 && hAfterHeal.gold === 8, // +50 heal - 1 cost = 99 (max 100), -2 gold
      expected: "HP: 99, Gold: 8",
      actual: `HP: ${hAfterHeal.life}, Gold: ${hAfterHeal.gold}`
    });

    return results;
  }
}
