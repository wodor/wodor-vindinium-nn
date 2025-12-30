
import { GoogleGenAI, Type } from "@google/genai";
import { GameState, Move, AIDecision, StrategyPriorities } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getAIDecision(
  state: GameState, 
  heroId: number, 
  priorities: StrategyPriorities,
  generateDilemma: boolean = false
): Promise<AIDecision> {
  const hero = state.heroes.find(h => h.id === heroId);
  if (!hero) throw new Error("Hero not found");

  // Create a condensed map representation for the prompt
  const size = state.board.size;
  let mapVisual = "";
  for (let y = 0; y < size; y++) {
    mapVisual += state.board.tiles.substring(y * size * 2, (y + 1) * size * 2) + "\n";
  }

  const prompt = `
    You are an agentic AI playing 'Vindinium'. Your goal is to collect the most gold by controlling mines and surviving.
    
    CURRENT PRIORITIES (0-100 scale): 
    Survival: ${priorities.survival}, Greed: ${priorities.greed}, Aggression: ${priorities.aggression}

    GAME RULES:
    - Moving costs 1 HP.
    - Taverns ([]) cost 2 Gold and heal 50 HP (max 100).
    - Mines ($) give 1 Gold per turn. Neutral mines ($-) cost 20 HP to capture.
    - Attacking a hero (@) deals 20 Damage.

    SITUATION:
    Turn: ${state.turn}/${state.maxTurns}, HP: ${hero.life}, Gold: ${hero.gold}, Mines Owned: ${hero.mineCount}
    Your Position: (${hero.pos.x}, ${hero.pos.y})
    
    MAP (2 chars per tile: '  '=empty, '##'=wall, '[]'=tavern, '$-'=mine, '@n'=hero n):
    ${mapVisual}

    TASK:
    1. Decide the best Move (North, South, East, West, Stay).
    2. Provide a short, logical reasoning based on your priorities and the map.
    ${generateDilemma ? `3. Identify a strategic trade-off (Dilemma). For example, "Capture a mine and risk death" vs "Heal at tavern". Provide two distinct choices (optionA and optionB) that adjust the weights of survival, greed, and aggression.` : ''}

    Return JSON strictly following the schema.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            move: { type: Type.STRING, enum: Object.values(Move) },
            reasoning: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            dilemma: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                optionA: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    description: { type: Type.STRING },
                    priorities: {
                      type: Type.OBJECT,
                      properties: {
                        survival: { type: Type.NUMBER },
                        greed: { type: Type.NUMBER },
                        aggression: { type: Type.NUMBER }
                      },
                      required: ["survival", "greed", "aggression"]
                    }
                  },
                  required: ["label", "description", "priorities"]
                },
                optionB: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    description: { type: Type.STRING },
                    priorities: {
                      type: Type.OBJECT,
                      properties: {
                        survival: { type: Type.NUMBER },
                        greed: { type: Type.NUMBER },
                        aggression: { type: Type.NUMBER }
                      },
                      required: ["survival", "greed", "aggression"]
                    }
                  },
                  required: ["label", "description", "priorities"]
                }
              },
              required: ["question", "optionA", "optionB"]
            }
          },
          required: ["move", "reasoning", "confidence"]
        }
      }
    });

    const text = response.text || "{}";
    const result = JSON.parse(text);
    return {
      ...result,
      prioritiesUsed: { ...priorities }
    };
  } catch (error) {
    console.error("AI Decision failed:", error);
    // Return a safe fallback to prevent app crash
    return { 
      move: Move.Stay, 
      reasoning: "The Strategic Oracle encountered an error. Remaining stationary to preserve life.", 
      confidence: 0 
    };
  }
}
