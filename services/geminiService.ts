
// @google/genai guidelines: Use Type and Modality from @google/genai
import { Type, Modality } from "@google/genai";
import { GameType, GradeLevel, QuestionData, GrammarSubSkill } from "../types";

const FALLBACK_MODELS = [
  "gemini-3-pro-preview",
  "gemini-3-flash-preview",
  "gemini-flash-latest"
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

// User can provide their own API Key which we send to our proxy
async function callGeminiProxy(model: string, contents: any, config: any) {
  const userApiKey = localStorage.getItem('user_api_key');
  
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, contents, config, userApiKey }),
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
      responseModalities: [Modality.AUDIO],
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
          wordType: { type: Type.STRING, description: "E.g. Noun, Verb, Adjective, Adverb" },
          countability: { type: Type.STRING, description: "For Nouns: Countable or Uncountable. For others: leave empty." },
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

  switch (gameType) {
    case GameType.Grammar:
      specificInstruction = `10 grammar MCQs. Level ${diffLevel}.`;
      if (subSkill === GrammarSubSkill.SentenceTrans) {
        specificInstruction = `8 Sentence Transformation tasks. 'topic' field MUST be in Vietnamese (e.g., "Câu Bị Động", "Câu Tường Thuật", "Câu Điều Kiện"). 'hint' field MUST contain the grammatical structure of the answer.`;
      }
      break;
    case GameType.Listening:
      specificInstruction = `5 short listening tasks. Max 40 words per script.`;
      break;
    case GameType.Speaking:
      specificInstruction = `5 short speaking tasks.`;
      break;
    case GameType.TypeToFly:
      specificInstruction = `12 vocabulary items. 'questionText' is the English word. 'explanation' is the Vietnamese meaning. 'wordType' is the part of speech (Noun/Verb/etc). 'countability' is for nouns only.`;
      break;
    default:
      specificInstruction = `10 items. Level ${diffLevel}.`;
  }

  const prompt = `Task: ${specificInstruction}. Grade: ${grade}. Textbook: ${specificTextbook || 'General'}. Output valid JSON only. All 'explanation', 'topic', and 'meaning' MUST be Vietnamese.`;

  try {
    const result = await callGeminiWithFallback("gemini-3-pro-preview", prompt, {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
      temperature: 0.1,
      thinkingConfig: { thinkingBudget: 0 }
    });
    
    const cleaned = cleanJsonResponse(result.text);
    const parsed = JSON.parse(cleaned);
    return parsed;
  } catch (error: any) { 
    if (error.message.includes("Requested entity was not found")) {
      throw new Error("Requested entity was not found: Vui lòng kiểm tra lại API Key hoặc Billing của bạn.");
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
  
  const prompt = `Analyze: Original: "${original}", Expected: "${targetPattern}", Student: "${studentAnswer}". Feedback in Vietnamese.`;

  try {
    const result = await callGeminiWithFallback("gemini-3-pro-preview", prompt, {
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
    const result = await callGeminiWithFallback("gemini-3-pro-preview", `Grade writing: Prompt "${prompt}". Student text: "${studentText}". Level: ${grade}. Response in Vietnamese.`, {
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
    const result = await callGeminiWithFallback("gemini-3-pro-preview", `Score speech: Target "${target}", User transcript "${transcript}". Vietnamese feedback.`, {
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

  const prompt = `Evaluate if the pronunciation of "${transcript}" is a correct or acceptable attempt at saying "${target}". Respond in Vietnamese.`;

  try {
    const result = await callGeminiWithFallback("gemini-3-flash-preview", prompt, {
      responseMimeType: "application/json",
      responseSchema: schema,
      thinkingConfig: { thinkingBudget: 0 }
    });
    return JSON.parse(cleanJsonResponse(result.text));
  } catch { return null; }
};
