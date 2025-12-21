
// @google/genai guidelines: Use Type and Modality from @google/genai
import { Type, Modality } from "@google/genai";
import { GameType, GradeLevel, QuestionData, GrammarSubSkill } from "../types";

// @google/genai guidelines: prioritizing Flash for maximum speed and cultural awareness
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
    const contents = [{ parts: [{ text: `Read clearly: "${text}"` }] }];
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
          hint: { type: Type.STRING },
          listeningScript: { type: Type.STRING },
          speakingTarget: { type: Type.STRING },
          phonetic: { type: Type.STRING },
          meaning: { type: Type.STRING },
          exampleSentence: { type: Type.STRING },
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
  
  switch (gameType) {
    case GameType.Grammar:
      specificInstruction = `Fast response. 6 items. ${subSkill || 'General'}.`;
      break;
    case GameType.Listening:
      specificInstruction = `Fast response. 5 tasks. Use standard educational content.`;
      break;
    case GameType.Speaking:
      specificInstruction = `Fast response. 5 tasks. 
      Important: Include cultural context where possible (e.g., Vietnamese traditions). 
      Hint: Bullet points. Meaning: 3-5 keywords. Example: natural response.`;
      break;
    case GameType.TypeToFly:
      specificInstruction = `Fast response. 8 vocab items.`;
      break;
    case GameType.Writing:
      let wordCount = gradeInt <= 6 ? "50-80" : gradeInt <= 9 ? "80-150" : "150-300";
      specificInstruction = `Generate 1 prompt. Limit: ${wordCount} words. Curriculum based.`;
      break;
    default:
      specificInstruction = `6 items. Fast!`;
  }

  const prompt = `Task: ${specificInstruction}. Grade: ${grade}. Textbook: ${specificTextbook || 'General'}. Output JSON. Vietnamese for explanations and hints. English for tasks.`;

  try {
    const result = await callGeminiWithFallback("gemini-3-flash-preview", prompt, {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
      temperature: 0.1,
      thinkingConfig: { thinkingBudget: 0 }
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

  const systemInstruction = `You are an advanced context-aware speech recognition expert for non-native English speakers. 
  Evaluated criteria:
  1. ACCENT LENIENCY: Accept non-native accents. Prioritize communicative success.
  2. CULTURAL TERMS: Recognize and preserve terms like 'Tet', 'Ao Dai', 'Pho', 'Banh Mi', 'Li xi', etc. Do not penalize or autocorrect them to English words that sound similar (e.g., 'Tet' is not 'text' or 'test').
  3. CONTEXTUAL INFERENCE: If the transcript contains words that sound like English but fit better as cultural concepts or specific topics, infer the correct intent. 
  4. FEEDBACK: Be encouraging. Focus on the ability to convey meaning effectively.`;

  const prompt = `${systemInstruction}\nTask: "${target}". Student said: "${transcript}". Level: ${grade}. Analyze intent and provide score (0-100) and feedback in Vietnamese.`;

  try {
    const result = await callGeminiWithFallback("gemini-3-flash-preview", prompt, {
      responseMimeType: "application/json",
      responseSchema: schema,
      temperature: 0, // Deterministic for recognition
      thinkingConfig: { thinkingBudget: 0 }
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
    const result = await callGeminiWithFallback("gemini-3-flash-preview", `Rewrite check: "${original}", Pattern: "${targetPattern}", User: "${studentAnswer}". Fast response. Vietnamese.`, {
      responseMimeType: "application/json",
      responseSchema: schema,
      temperature: 0,
      thinkingConfig: { thinkingBudget: 0 }
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
      responseSchema: schema,
      temperature: 0,
      thinkingConfig: { thinkingBudget: 0 }
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
    const result = await callGeminiWithFallback("gemini-3-flash-preview", `Pron check: "${target}", User: "${transcript}". Be lenient with accents. Vietnamese.`, {
      responseMimeType: "application/json",
      responseSchema: schema,
      temperature: 0,
      thinkingConfig: { thinkingBudget: 0 }
    }, userKey);
    return JSON.parse(cleanJsonResponse(result.text));
  } catch { return null; }
};
