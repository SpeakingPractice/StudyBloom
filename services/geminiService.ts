
// @google/genai guidelines: Use Type and Modality from @google/genai
import { Type, Modality } from "@google/genai";
import { GameType, GradeLevel, QuestionData, GrammarSubSkill } from "../types";

// @google/genai guidelines: prioritizing Flash for speed as requested
const FALLBACK_MODELS = [
  "gemini-3-flash-preview",
  "gemini-2.5-flash-preview-09-2025",
  "gemini-3-pro-preview"
];

function cleanJsonResponse(text: string): string {
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

async function callGeminiProxy(model: string, contents: any, config: any, userKey?: string) {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-api-key': userKey || ""
    },
    body: JSON.stringify({ model, contents, config }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 429) throw new Error("QUOTA_EXCEEDED");
    if (response.status === 401 || response.status === 403) throw new Error("API_KEY_INVALID");
    throw new Error(typeof data.error === 'object' ? JSON.stringify(data.error) : data.error || `Error: ${response.status}`);
  }
  return data;
}

async function callGeminiWithFallback(defaultModel: string, contents: any, config: any, userKey?: string) {
  let lastError = null;
  for (const model of FALLBACK_MODELS) {
    try {
      return await callGeminiProxy(model, contents, config, userKey);
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
    const userKey = localStorage.getItem('user_gemini_api_key') || undefined;
    const contents = [{ parts: [{ text: `Read: "${text}"` }] }];
    const result = await callGeminiProxy("gemini-2.5-flash-preview-tts", contents, {
      responseModalities: [Modality.AUDIO],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } }
    }, userKey);
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
          explanation: { type: Type.STRING },
          topic: { type: Type.STRING },
          hint: { type: Type.STRING, description: "For Speaking: Bullet points of key points to mention. For others: structure hint." },
          listeningScript: { type: Type.STRING },
          speakingTarget: { type: Type.STRING, description: "Main goal of the speaking task" },
          phonetic: { type: Type.STRING },
          meaning: { type: Type.STRING, description: "For Speaking: Key Vocabulary list separated by commas" },
          exampleSentence: { type: Type.STRING, description: "For Speaking: A sample model answer or phrases" },
          wordType: { type: Type.STRING },
          countability: { type: Type.STRING },
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
  subSkill?: GrammarSubSkill,
  userKey?: string
): Promise<{ questions: QuestionData[]; textbookContext: string }> => {
  let specificInstruction = "";
  const gradeInt = parseInt(grade.replace('Grade ', ''));
  const isLowerSecondary = gradeInt <= 8;
  const isHighSchool = gradeInt >= 10;
  const diffLevel = isLowerSecondary ? "Basic" : isHighSchool ? "Advanced" : "Intermediate";

  switch (gameType) {
    case GameType.Grammar:
      specificInstruction = `6 items. Sub-skill: ${subSkill || 'General Grammar'}.`;
      break;
    case GameType.Listening:
      specificInstruction = `5 listening tasks.`;
      break;
    case GameType.Speaking:
      specificInstruction = `5 speaking tasks. 
      For each:
      - 'speakingTarget' is the core requirement.
      - 'hint' MUST be a bulleted list of 2-3 key ideas to include (e.g., "- Say your name\n- Mention age").
      - 'meaning' MUST be 3-5 key words/phrases student should use (comma separated).
      - 'exampleSentence' MUST be a short natural sample answer.`;
      break;
    case GameType.TypeToFly:
      specificInstruction = `8 vocab items.`;
      break;
    case GameType.Writing:
      let wordCount = gradeInt <= 6 ? "50-80" : gradeInt <= 9 ? "80-150" : "150-300";
      specificInstruction = `1 writing prompt. Limit: ${wordCount} words.`;
      break;
    default:
      specificInstruction = `6 items.`;
  }

  const prompt = `Task: ${specificInstruction}. Grade: ${grade}. Textbook: ${specificTextbook || 'General'}. Response in JSON. Vietnamese for 'explanation', 'topic', 'hint' (only for bullets), 'textbookContext'. English for questions.`;

  try {
    const result = await callGeminiWithFallback("gemini-3-flash-preview", prompt, {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
      temperature: 0.1
    }, userKey);
    
    return JSON.parse(cleanJsonResponse(result.text));
  } catch (error: any) { throw error; }
};

export const evaluateSpeaking = async (target: string, transcript: string, grade: string) => {
  const userKey = localStorage.getItem('user_gemini_api_key') || undefined;
  const schema = {
    type: Type.OBJECT,
    properties: {
      score: { type: Type.INTEGER },
      feedback: { type: Type.STRING },
      correctnessLevel: { type: Type.STRING }
    }
  };
  try {
    const result = await callGeminiWithFallback("gemini-3-flash-preview", `Score speaking: Task "${target}", Student transcript "${transcript}". Grade ${grade}. Check if student included main points. Response in Vietnamese.`, {
      responseMimeType: "application/json",
      responseSchema: schema
    }, userKey);
    return JSON.parse(cleanJsonResponse(result.text));
  } catch { return null; }
};

export const evaluateSentenceTransformation = async (original: string, targetPattern: string, studentAnswer: string) => {
  const userKey = localStorage.getItem('user_gemini_api_key') || undefined;
  const schema = {
    type: Type.OBJECT,
    properties: {
      status: { type: Type.STRING },
      feedback: { type: Type.STRING },
      explanation: { type: Type.STRING }
    },
    required: ["status", "feedback", "explanation"]
  };
  try {
    const result = await callGeminiWithFallback("gemini-3-flash-preview", `Check rewrite: "${original}", Pattern: "${targetPattern}", Student: "${studentAnswer}". Vietnamese.`, {
      responseMimeType: "application/json",
      responseSchema: schema
    }, userKey);
    return JSON.parse(cleanJsonResponse(result.text));
  } catch { return null; }
};

export const evaluateWriting = async (prompt: string, studentText: string, grade: string) => {
  const userKey = localStorage.getItem('user_gemini_api_key') || undefined;
  const schema = {
    type: Type.OBJECT,
    properties: {
      score: { type: Type.INTEGER },
      feedback: { type: Type.STRING },
      corrections: { type: Type.STRING }
    }
  };
  try {
    const result = await callGeminiWithFallback("gemini-3-flash-preview", `Grade writing: "${prompt}", Student: "${studentText}", Level: ${grade}. Scale 0-10. Vietnamese.`, {
      responseMimeType: "application/json",
      responseSchema: schema
    }, userKey);
    return JSON.parse(cleanJsonResponse(result.text));
  } catch { return {}; }
};

export const evaluatePronunciation = async (target: string, transcript: string) => {
  const userKey = localStorage.getItem('user_gemini_api_key') || undefined;
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
    const result = await callGeminiWithFallback("gemini-3-flash-preview", `Pronunciation check: "${target}", User: "${transcript}". Vietnamese.`, {
      responseMimeType: "application/json",
      responseSchema: schema
    }, userKey);
    return JSON.parse(cleanJsonResponse(result.text));
  } catch { return null; }
};
