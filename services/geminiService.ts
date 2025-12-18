
import { Type } from "@google/genai";
import { GameType, GradeLevel, QuestionData, GrammarSubSkill } from "../types";

const FALLBACK_MODELS = [
  "gemini-3-flash-preview",
  "gemini-flash-latest",
  "gemini-flash-lite-latest"
];

function cleanJsonResponse(text: string): string {
  // Remove markdown code blocks and any trailing junk that might cause parse errors
  let cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
  return cleaned;
}

function parseErrorMessage(error: any): string {
  try {
    if (typeof error === 'string') {
      const parsed = JSON.parse(error);
      return parsed.error?.message || parsed.message || error;
    }
    return error.message || "Lỗi AI.";
  } catch {
    return error.message || String(error);
  }
}

async function callGeminiProxy(model: string, contents: any, config: any) {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, contents, config }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 429) throw new Error("QUOTA_EXCEEDED");
    throw new Error(typeof data.error === 'object' ? JSON.stringify(data.error) : data.error || `Error: ${response.status}`);
  }
  return data;
}

async function callGeminiWithFallback(defaultModel: string, contents: any, config: any) {
  let lastError = null;
  for (const model of FALLBACK_MODELS) {
    try {
      return await callGeminiProxy(model, contents, config);
    } catch (error: any) {
      lastError = error;
      if (error.message === "QUOTA_EXCEEDED" || error.message.includes("404")) continue;
      throw new Error(parseErrorMessage(error.message));
    }
  }
  throw new Error(lastError ? parseErrorMessage(lastError.message) : "Service Busy.");
}

export const generateSpeech = async (text: string): Promise<string | null> => {
  try {
    const contents = [{ parts: [{ text: `Read: "${text}"` }] }];
    const result = await callGeminiProxy("gemini-2.5-flash-preview-tts", contents, {
      responseModalities: ["AUDIO"],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } }
    });
    return result.audio || null;
  } catch { return null; }
};

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.INTEGER },
          questionText: { type: Type.STRING },
          options: { type: Type.ARRAY, items: { type: Type.STRING } },
          correctAnswer: { type: Type.STRING },
          explanation: { type: Type.STRING, description: "Max 30 words explanation in Vietnamese" },
          topic: { type: Type.STRING },
          hint: { type: Type.STRING },
          listeningScript: { type: Type.STRING, description: "Max 50 words" },
          speakingTarget: { type: Type.STRING },
          phonetic: { type: Type.STRING },
          meaning: { type: Type.STRING },
          exampleSentence: { type: Type.STRING },
        },
        required: ["id", "questionText", "explanation", "topic"],
      },
    },
    textbookContext: { type: Type.STRING }
  },
  required: ["questions", "textbookContext"],
};

export const generateGameContent = async (
  grade: GradeLevel,
  gameType: GameType,
  specificTextbook?: string,
  subSkill?: GrammarSubSkill
): Promise<{ questions: QuestionData[]; textbookContext: string }> => {
  let specificInstruction = "";
  const isSecondary = parseInt(grade.replace('Grade ', '')) <= 9;
  const diffLevel = isSecondary ? "A1-A2" : "A1-B2";

  // REDUCED COUNTS for speed and stability (avoiding truncation)
  switch (gameType) {
    case GameType.Grammar:
      specificInstruction = `10 grammar MCQs. Level ${diffLevel}.`;
      if (subSkill === GrammarSubSkill.SentenceTrans) {
        specificInstruction = `8 Sentence Transformation tasks.
        - 'topic': Vietnamese topic name (e.g., "Câu Bị Động").
        - 'hint': Structure like "S + was/were + V3/ed...".
        - 'explanation': Brief Vietnamese rule.`;
      }
      break;
    case GameType.Listening:
      specificInstruction = `5 short listening tasks. Max 40 words per script.`;
      break;
    case GameType.Speaking:
      specificInstruction = `5 short speaking tasks.`;
      break;
    case GameType.TypeToFly:
      specificInstruction = `12 items for Flappy Bird. 
      - 'questionText': 1-2 words target.
      - 'explanation': Vietnamese meaning.`;
      break;
    case GameType.SayItRight:
      specificInstruction = `8 pronunciation items. 
      - 'phonetic': IPA. 
      - 'meaning': Vietnamese. 
      - 'exampleSentence': Short sentence.`;
      break;
    default:
      specificInstruction = `10 items. Level ${diffLevel}.`;
  }

  const prompt = `Task: ${specificInstruction}. Grade: ${grade}. Textbook: ${specificTextbook || 'General'}. 
  RULES:
  1. Output valid JSON only. 
  2. All 'explanation' and 'topic' MUST be Vietnamese. 
  3. Keep explanations UNDER 20 words for speed.`;

  try {
    const result = await callGeminiWithFallback("gemini-3-flash-preview", prompt, {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
      temperature: 0.1, // Lower temperature for more stable JSON
      thinkingConfig: { thinkingBudget: 0 }
    });
    
    const cleaned = cleanJsonResponse(result.text);
    const parsed = JSON.parse(cleaned);
    return parsed;
  } catch (error: any) { 
    console.error("Content Generation Error:", error);
    if (error instanceof SyntaxError) {
      throw new Error("Lỗi định dạng dữ liệu từ AI. Hãy thử nhấn nút Bắt đầu lại.");
    }
    throw error; 
  }
};

export const evaluateSentenceTransformation = async (original: string, targetPattern: string, studentAnswer: string) => {
  const schema = {
    type: Type.OBJECT,
    properties: {
      status: { type: Type.STRING, description: "Must be 'CORRECT', 'INCORRECT', or 'PARTIAL'" },
      feedback: { type: Type.STRING, description: "Max 20 words in Vietnamese" },
      explanation: { type: Type.STRING, description: "Max 20 words in Vietnamese" }
    },
    required: ["status", "feedback", "explanation"]
  };
  
  const prompt = `Evaluate: "${original}" -> "${targetPattern}". Student said: "${studentAnswer}". Feedback in Vietnamese.`;

  try {
    const result = await callGeminiWithFallback("gemini-3-flash-preview", prompt, {
      responseMimeType: "application/json",
      responseSchema: schema,
      thinkingConfig: { thinkingBudget: 0 }
    });
    return JSON.parse(cleanJsonResponse(result.text));
  } catch { return null; }
};

export const evaluatePronunciation = async (target: string, transcript: string) => {
  const schema = {
    type: Type.OBJECT,
    properties: {
      isCorrect: { type: Type.BOOLEAN },
      feedback: { type: Type.STRING },
      advice: { type: Type.STRING }
    },
    required: ["isCorrect", "feedback", "advice"]
  };
  try {
    const result = await callGeminiWithFallback("gemini-3-flash-preview", `Pronunciation check: Target "${target}", User "${transcript}". Brief Vietnamese advice.`, {
      responseMimeType: "application/json",
      responseSchema: schema,
      thinkingConfig: { thinkingBudget: 0 }
    });
    return JSON.parse(cleanJsonResponse(result.text));
  } catch { return null; }
};

export const evaluateWriting = async (prompt: string, studentText: string, grade: string) => {
  const schema = {
    type: Type.OBJECT,
    properties: {
      score: { type: Type.INTEGER },
      feedback: { type: Type.STRING },
      corrections: { type: Type.STRING }
    }
  };
  try {
    const result = await callGeminiWithFallback("gemini-3-flash-preview", `Grade writing: ${prompt}. Text: "${studentText}". Level: ${grade}. Vietnamese response.`, {
      responseMimeType: "application/json",
      responseSchema: schema,
      thinkingConfig: { thinkingBudget: 0 }
    });
    return JSON.parse(cleanJsonResponse(result.text));
  } catch { return {}; }
};

export const evaluateSpeaking = async (target: string, transcript: string, grade: string) => {
  const schema = {
    type: Type.OBJECT,
    properties: {
      score: { type: Type.INTEGER },
      feedback: { type: Type.STRING },
      correctnessLevel: { type: Type.STRING }
    }
  };
  try {
    const result = await callGeminiWithFallback("gemini-3-flash-preview", `Speak score: Target "${target}", User "${transcript}". Vietnamese feedback.`, {
      responseMimeType: "application/json",
      responseSchema: schema,
      thinkingConfig: { thinkingBudget: 0 }
    });
    return JSON.parse(cleanJsonResponse(result.text));
  } catch { return null; }
};
