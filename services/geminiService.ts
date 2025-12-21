
// @google/genai guidelines: Use Type and Modality from @google/genai
import { Type, Modality } from "@google/genai";
import { GameType, GradeLevel, QuestionData, GrammarSubSkill } from "../types";

const FALLBACK_MODELS = [
  "gemini-3-flash-preview",
  "gemini-2.5-flash-preview-09-2025",
  "gemini-3-pro-preview"
];

function cleanJsonResponse(text: string): string {
  let cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
  return cleaned;
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
    throw new Error(data.error || `Error: ${response.status}`);
  }
  return data;
}

async function callGeminiWithFallback(defaultModel: string, contents: any, config: any, userKey?: string) {
  for (const model of FALLBACK_MODELS) {
    try {
      return await callGeminiProxy(model, contents, config, userKey);
    } catch (error: any) {
      if (error.message === "QUOTA_EXCEEDED") continue;
      throw error;
    }
  }
  throw new Error("Service Busy.");
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
          explanation: { type: Type.STRING },
          topic: { type: Type.STRING },
          hint: { type: Type.STRING },
          speakingTarget: { type: Type.STRING },
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

export const generateGameContent = async (grade: GradeLevel, gameType: GameType, specificTextbook?: string, subSkill?: GrammarSubSkill, userKey?: string) => {
  let specificInstruction = "";
  if (gameType === GameType.Speaking) {
    specificInstruction = `Generate 5 PERSONAL OPEN QUESTIONS (e.g., about their family, hobbies, local traditions like Tet, Pho, Ao Dai). 
    Do NOT ask for definitions. Ask for their opinion or experience.
    'hint' must be bullet points of ideas to answer. 
    'meaning' must be 3-5 keywords student can use.`;
  } else {
    specificInstruction = `Standard ${gameType} for ${grade}.`;
  }

  const prompt = `Task: ${specificInstruction}. Grade: ${grade}. Textbook: ${specificTextbook || 'General'}. JSON output. Vietnamese for hints/explanations.`;
  const result = await callGeminiWithFallback("gemini-3-flash-preview", prompt, {
    responseMimeType: "application/json",
    responseSchema: responseSchema,
    temperature: 0.1,
    thinkingConfig: { thinkingBudget: 0 }
  }, userKey);
  return JSON.parse(cleanJsonResponse(result.text));
};

export const evaluateSpeaking = async (target: string, transcript: string, grade: string) => {
  const userKey = localStorage.getItem('user_gemini_api_key') || undefined;
  const schema = {
    type: Type.OBJECT,
    properties: {
      score: { type: Type.INTEGER },
      feedback: { type: Type.STRING },
      correctnessLevel: { type: Type.STRING },
      reconstructedTranscript: { type: Type.STRING, description: "What you think the student actually meant to say, correcting browser transcription errors." }
    }
  };

  const systemInstruction = `You are an expert at understanding non-native speech patterns. 
  Browser transcripts are often WRONG (e.g., 'text' instead of 'Tet', 'honest' instead of 'Banh Chung').
  1. RECONSTRUCT: Based on the question "${target}", look at the noisy transcript "${transcript}" and figure out what words the student ACTUALLY said.
  2. BE LENIENT: If they communicated the core meaning, give a high score.
  3. FEEDBACK: In Vietnamese, encouraging and constructive.`;

  const prompt = `${systemInstruction}\nQuestion: "${target}". Transcript: "${transcript}". Level: ${grade}. Evaluate in JSON.`;
  const result = await callGeminiWithFallback("gemini-3-flash-preview", prompt, {
    responseMimeType: "application/json",
    responseSchema: schema,
    temperature: 0,
    thinkingConfig: { thinkingBudget: 0 }
  }, userKey);
  return JSON.parse(cleanJsonResponse(result.text));
};

export const evaluateSentenceTransformation = async (original: string, targetPattern: string, studentAnswer: string) => {
  const userKey = localStorage.getItem('user_gemini_api_key') || undefined;
  const result = await callGeminiWithFallback("gemini-3-flash-preview", `Check grammar transformation: "${original}" -> "${targetPattern}". User said: "${studentAnswer}". JSON.`, {
    responseMimeType: "application/json",
    temperature: 0,
  }, userKey);
  return JSON.parse(cleanJsonResponse(result.text));
};

export const evaluateWriting = async (prompt: string, studentText: string, grade: string) => {
  const userKey = localStorage.getItem('user_gemini_api_key') || undefined;
  const result = await callGeminiWithFallback("gemini-3-flash-preview", `Grade writing: "${prompt}". Student: "${studentText}". JSON.`, {
    responseMimeType: "application/json",
    temperature: 0,
  }, userKey);
  return JSON.parse(cleanJsonResponse(result.text));
};

// Fix: Added missing export for pronunciation evaluation used by SayItRightGame component
export const evaluatePronunciation = async (target: string, transcript: string) => {
  const userKey = localStorage.getItem('user_gemini_api_key') || undefined;
  const schema = {
    type: Type.OBJECT,
    properties: {
      isCorrect: { type: Type.BOOLEAN },
      feedback: { type: Type.STRING },
      advice: { type: Type.STRING },
    },
    required: ["isCorrect", "feedback", "advice"]
  };

  const prompt = `Evaluate the pronunciation of the English word/phrase "${target}" based on the transcript "${transcript}".
  Return whether it is correct or close enough (isCorrect: true/false), a short encouraging feedback in Vietnamese, and short advice in Vietnamese.
  Return JSON format.`;

  const result = await callGeminiWithFallback("gemini-3-flash-preview", prompt, {
    responseMimeType: "application/json",
    responseSchema: schema,
    temperature: 0,
    thinkingConfig: { thinkingBudget: 0 }
  }, userKey);
  return JSON.parse(cleanJsonResponse(result.text));
};
