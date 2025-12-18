
import { Type } from "@google/genai";
import { GameType, GradeLevel, QuestionData, GrammarSubSkill } from "../types";

const FALLBACK_MODELS = [
  "gemini-3-flash-preview",
  "gemini-flash-latest",
  "gemini-flash-lite-latest"
];

function cleanJsonResponse(text: string): string {
  return text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
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
          explanation: { type: Type.STRING },
          topic: { type: Type.STRING },
          hint: { type: Type.STRING },
          listeningScript: { type: Type.STRING },
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

  switch (gameType) {
    case GameType.Grammar:
      specificInstruction = `10 grammar MCQs. Level ${diffLevel}. Use simple vocabulary for secondary.`;
      if (subSkill === GrammarSubSkill.SentenceTrans) {
        specificInstruction = `10 Sentence Transformation tasks.
        MANDATORY: For each task, provide 'questionText' (the original sentence), 'correctAnswer' (the target rewrite), and 'hint' (the first 2-3 words the student should start with).
        MANDATORY: 'explanation' must be in Vietnamese and explain the grammar rule simply.`;
      }
      break;
    case GameType.Listening:
      specificInstruction = `5 listening tasks. Level ${diffLevel}. Simple words for secondary.`;
      break;
    case GameType.Speaking:
      specificInstruction = `5 speaking tasks. Level ${diffLevel}. Simple words for secondary.`;
      break;
    case GameType.TypeToFly:
      specificInstruction = `FOR FLAPPY BIRD TYPING GAME:
      1. Generate 20 English items.
      2. MANDATORY: The 'questionText' MUST be exactly ONE word or at most TWO words.
      3. MANDATORY: The 'explanation' field MUST contain the Vietnamese meaning.`;
      break;
    case GameType.SayItRight:
      specificInstruction = `FOR PRONUNCIATION GAME (SAY IT RIGHT):
      1. Generate 10 items.
      2. MANDATORY: 'exampleSentence' for EVERY item showing its use.
      3. Provide phonetic IPA in 'phonetic' and Vietnamese in 'meaning'.`;
      break;
    default:
      specificInstruction = `10 MCQs. Level ${diffLevel}.`;
  }

  const prompt = `Task: ${specificInstruction}. Output: JSON. All explanations and meanings MUST be in Vietnamese.`;

  try {
    const result = await callGeminiWithFallback("gemini-3-flash-preview", prompt, {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
      temperature: 0.2,
      thinkingConfig: { thinkingBudget: 0 }
    });
    
    const parsed = JSON.parse(cleanJsonResponse(result.text));
    return parsed;
  } catch (error: any) { throw error; }
};

export const evaluateSentenceTransformation = async (original: string, targetPattern: string, studentAnswer: string) => {
  const schema = {
    type: Type.OBJECT,
    properties: {
      status: { type: Type.STRING, description: "Must be 'CORRECT', 'INCORRECT', or 'PARTIAL'" },
      feedback: { type: Type.STRING, description: "Detailed feedback in Vietnamese" },
      explanation: { type: Type.STRING, description: "Simple grammar explanation in Vietnamese" }
    },
    required: ["status", "feedback", "explanation"]
  };
  
  const prompt = `
  Analyze this English Sentence Transformation task.
  Original: "${original}"
  Expected Target: "${targetPattern}"
  Student's Answer: "${studentAnswer}"

  Instructions:
  1. Compare the student's answer to the expected target. 
  2. If it is grammatically correct and conveys the same meaning (even if capitalization/punctuation differs slightly), set status to "CORRECT".
  3. MANDATORY: 'feedback' and 'explanation' MUST be in Vietnamese.
  4. Be encouraging but precise. If the answer is correct, 'feedback' should confirm it.
  5. If incorrect, explain why in simple Vietnamese.
  `;

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
    const result = await callGeminiWithFallback("gemini-3-flash-preview", `Score pronunciation. Target: "${target}", Student: "${transcript}". Advice in Vietnamese.`, {
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
    const result = await callGeminiWithFallback("gemini-3-flash-preview", `Grade writing in Vietnamese. Prompt: ${prompt}. Student: "${studentText}". Grade: ${grade}.`, {
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
    const result = await callGeminiWithFallback("gemini-3-flash-preview", `Score speech in Vietnamese. Target: "${target}". Student: "${transcript}".`, {
      responseMimeType: "application/json",
      responseSchema: schema,
      thinkingConfig: { thinkingBudget: 0 }
    });
    return JSON.parse(cleanJsonResponse(result.text));
  } catch { return null; }
};
