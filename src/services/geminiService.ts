import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey: API_KEY });

export interface ImageFilters {
  brightness: number;
  contrast: number;
  saturate: number;
  blur?: number;
  grayscale?: number;
  sepia?: number;
  hueRotate?: number;
  removeBackground: boolean;
  backgroundColor?: string;
}

const DEFAULT_FILTERS: ImageFilters = {
  brightness: 1,
  contrast: 1,
  saturate: 1,
  removeBackground: false,
  backgroundColor: 'transparent',
};

export async function parseInstructions(instruction: string): Promise<ImageFilters> {
  if (!instruction || !API_KEY) return DEFAULT_FILTERS;

  try {
    const prompt = `
      You are an image editing assistant. Your task is to convert natural language instructions into JSON photo filter parameters.
      Instruction: "${instruction}"
      
      Output ONLY valid JSON in this format:
      {
        "brightness": number (0.5 to 2.0, default 1),
        "contrast": number (0.5 to 2.0, default 1),
        "saturate": number (0 to 2.0, default 1),
        "blur": number (0 to 10 pixels, default 0),
        "grayscale": number (0 to 1, default 0),
        "sepia": number (0 to 1, default 0),
        "hueRotate": number (0 to 360 degrees, default 0),
        "removeBackground": boolean (true if the user mentions removing, cleaning background, or transparent/different background),
        "backgroundColor": string (hex color or "transparent", default "transparent")
      }
      
      Notes:
      - "Clean up" usually means slight increase in brightness and contrast.
      - "Make it pop" means increase saturation and contrast.
      - "Professional" usually means slight brightness and neutral contrast.
      - If user asks for a specific background color (e.g. "white background", "blue bg"), set removeBackground to true and provide the backgroundColor.
      - Be conservative with changes.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });

    const text = response.text || "";
    
    // Extract JSON from response (handling potential markdown blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch && jsonMatch[0]) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return { ...DEFAULT_FILTERS, ...parsed };
      } catch (e) {
        console.error("JSON parse error:", e);
      }
    }
    
    return DEFAULT_FILTERS;
  } catch (error) {
    console.error("Error parsing instructions:", error);
    return DEFAULT_FILTERS;
  }
}
