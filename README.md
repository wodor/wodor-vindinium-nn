
# Vindinium CORE_PROX Lab Bridge

This document provides the necessary protocols to connect a local Python agent or training script to the **Vindinium CORE_PROX** simulator.

## Neural tab: how the score works

The Neural tab is driven by the `useEvolution` hook and the `NeuralTraining` component:

- **UI**: `components/NeuralTraining.tsx`
  - **Average Population Fitness** chart uses `history[]`
  - **Policy Fitness** displays `activeSpecimen.fitness`
  - **Fitness Engine** panels display `activeSpecimen.fitnessBreakdown` (gold/mines/survival/combat)
- **State + logic**: `hooks/useEvolution.ts`
  - owns `population`, `generation`, `history`, `synthesisLogs`, `headlessMode`, `isAutoEvolving`

### What happens on “Force Generation”

`useEvolution.runEvolutionStep()` does:

- **Evaluate current population**
  - **Heuristic mode (default)**: assigns synthetic scores via `calculateArchetypeScores(...)`
  - **Headless mode**: runs a full 300-turn simulation via `GameEngine` + `NeuralEngine` and derives scores from final hero stats
- **Pick top performer**
  - `topPerformer` = member with highest `fitness` in the evaluated population
  - append `topPerformer.fitness` to `history[]` (this is what the chart plots)
  - prepend a `SynthesisLog` entry (deltas vs previous generation’s elite)
- **Create next generation**
  - idx 0 becomes the new **Elite_Specimen** (keeps its evaluated `fitness`)
  - others become **Direct_Heir / Mutated_Child** and get:
    - new ids (`G{generation+1}-M{idx}`)
    - new weights (`mutateWeights(topPerformer.weights, ...)`)
    - `fitness: 0` (until next evaluation step)

### Fitness formula (the number you see)

Fitness is computed in `hooks/useEvolution.ts` with user-adjustable weights (top header). Default:

- `fitness = (goldScore * 3.0) + (mineScore * 1.0) + (survivalScore * 1.0) + (combatScore * 1.0)`

Per-mode component scores:

- **Heuristic mode**
  - scores are random-ish but biased by `generation` (“progressFactor”)
  - you should see the chart drift upward over time (it’s synthetic)
- **Headless mode**
  - after the 300-turn match, per-hero stats become:
    - `goldScore = min(100, floor(hero.gold / 5))`
    - `mineScore = min(100, hero.mineCount * 20)`
    - `survivalScore = hero.life`
    - `combatScore = min(100, floor(hero.gold / 10))`

### Why “score not rising” happens

If you’re in **Headless Simulation**, a flat score is expected in many runs because:

- **No learning signal**: there is no gradient training; only random mutation + selection. Improvement is not guaranteed and can plateau.
- **Strong mine weight**: `mineScore * 5.0` still matters. If policies don’t reliably capture/hold mines, fitness stays low even if they “move around”.
- **CombatScore is not combat**: in headless mode `combatScore` is derived from `gold`, so it doesn’t reward fighting; it mostly double-counts gold.
- **Selection is tiny**: population is 4. With this small of a population, evolution is noisy and often stagnates.

Practical debugging in the UI:

- If **Gold/Mine** panels stay at `0`, policies are not taking/holding mines.
- If **System Resilience** hovers near `25`, you’re seeing “move cost” erosion with little tavern usage or recovery.

## Core Operational Protocols
The following rules are hard-coded into the CORE_PROX framework:
1. **Full Telemetry Exposure**: The system must always visualize the complete input vector (48 units) clearly for debugging.
2. **Policy Output Transparency**: Every decision must render its raw output logits (the action distribution) clearly in the inference stream.
3. **Finite Lifecycle**: Arena matches are strictly limited to **300 turns** to ensure consistent fitness evaluation and prevent infinite loops.

## 1. Python Agent Template

Use this class structure to implement your local decision-making logic.

```python
import json
import random

class CoreProxAgent:
    def __init__(self, agent_id=1):
        self.agent_id = agent_id
        self.moves = ["North", "South", "East", "West", "Stay"]

    def process_state(self, game_state_json):
        """
        Parses the GameState object from the CORE_PROX simulator.
        Schema matches the 'GameState' type in types.ts
        """
        state = json.loads(game_state_json)
        hero = next(h for h in state['heroes'] if h['id'] == self.agent_id)
        board = state['board']
        return hero, board

    def compute_policy(self, hero, board):
        """
        Your logic goes here. 
        Return one of: "North", "South", "East", "West", "Stay"
        """
        if hero['life'] < 30:
            return "South" # Example: Flee or seek tavern
        
        return random.choice(self.moves)

# Usage
# agent = CoreProxAgent()
# hero, board = agent.process_state(raw_json)
# move = agent.compute_policy(hero, board)
```

## 2. Connecting Locally

Since the simulator is client-side, the most efficient way to connect a local script is via a **Remote Procedure Call (RPC)** loop.

### A. The Browser Proxy Pattern
Inject this script into your browser console to create a bridge between the simulator and your local Python server:

```javascript
// Local Bridge Proxy (Execute in Console)
const LOCAL_API = "http://localhost:5000/compute-move";

window.fetchMoveFromLocal = async (gameState) => {
    try {
        const response = await fetch(LOCAL_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(gameState)
        });
        const data = await response.json();
        return data.move; // e.g., "North"
    } catch (e) {
        console.error("Local Bridge Offline", e);
        return "Stay";
    }
};
```

### B. Python Server (Flask)
Run a simple Flask server on your local machine to receive state and return moves:

```python
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/compute-move', methods=['POST'])
def compute():
    state = request.json
    # Invoke your Python Agent here
    # move = agent.compute_policy(state['heroes'][0], state['board'])
    return jsonify({"move": "North"})

if __name__ == '__main__':
    app.run(port=5000)
```

## 3. Game State Schema Highlights

- **Hero Object**: `id, pos {x, y}, life, gold, mineCount, spawnPos`
- **Board Object**: `size (int), tiles (string)`
- **Tile Encoding**: Every 2 characters in `tiles` represent one cell.
  - `  `: Empty space
  - `##`: Wall
  - `[]`: Tavern
  - `$-`: Neutral Mine
  - `$n`: Mine owned by Hero `n`
  - `@n`: Position of Hero `n`
