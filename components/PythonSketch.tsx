
import React from 'react';

const PythonSketch: React.FC = () => {
  const code = `
import json
import random

class VindiniumAgent:
    def __init__(self):
        self.priorities = {
            "survival": 50,
            "greed": 50,
            "aggression": 20
        }

    def process_state(self, state_json):
        """Step 1: Receive and parse the game state"""
        state = json.loads(state_json)
        hero = state['hero']
        board = state['game']['board']
        return hero, board

    def make_decision(self, hero, board):
        """Step 2 & 3: Analyze situation and return a valid move"""
        # Placeholder for agentic reasoning
        # In a real scenario, you'd use pathfinding (A*) to find nearest targets
        
        valid_moves = ["North", "South", "East", "West", "Stay"]
        
        # Example Logic: Simple Greed
        if hero['life'] < 30:
            print("Status: Critical Health - Seeking Tavern")
            # Logic to move towards '[]'
        
        return random.choice(valid_moves)

# Usage Example
# agent = VindiniumAgent()
# move = agent.make_decision(hero_data, board_data)
# print(f"Agent decided to move: {move}")
  `.trim();

  return (
    <div className="mt-8 border border-slate-700 rounded-xl overflow-hidden bg-slate-900">
      <div className="bg-slate-800 px-4 py-2 border-b border-slate-700 flex justify-between items-center">
        <span className="text-xs font-mono text-slate-400">agent_sketch.py</span>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
        </div>
      </div>
      <pre className="p-4 text-xs font-mono text-cyan-300 overflow-x-auto whitespace-pre no-scrollbar">
        <code>{code}</code>
      </pre>
    </div>
  );
};

export default PythonSketch;
