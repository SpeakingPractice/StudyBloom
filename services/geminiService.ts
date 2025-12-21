
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
          correctAnswer: { type: Type.STRING },
          explanation: { type: Type.STRING },
          topic: { type: Type.STRING },
          hint: { type: Type.STRING },
          startingWords: { type: Type.STRING },
          listeningScript: { type: Type.STRING },
          speakingTarget: { type: Type.STRING },
          meaning: { type: Type.STRING },
          exampleSentence: { type: Type.STRING },
          options: { type: Type.ARRAY, items: { type: Type.STRING } }
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
  const gradeInt = parseInt(grade.replace('Grade ', ''));

  if (gameType === GameType.Speaking) {
    specificInstruction = `Generate 5 PERSONAL OPEN QUESTIONS related to the student's life. 
    IMPORTANT: Provide 'hint' as a CLEAR list of 3-4 bullet points separated by '|' character. 
    'meaning' should be 3-5 keywords. No definitions.`;
  } else if (gameType === GameType.Writing) {
    let wordCount = "50-80";
    if (gradeInt === 7) wordCount = "60-150";
    else if (gradeInt === 8) wordCount = "70-150";
    else if (gradeInt === 9) wordCount = "80-150";
    else if (gradeInt >= 10) wordCount = "100-300";
    specificInstruction = `Generate 1 ESSAY topic for ${grade}. Word count: ${wordCount} words. Prompt should be in English.`;
  } else if (gameType === GameType.Grammar && subSkill === GrammarSubSkill.SentenceTrans) {
    specificInstruction = `Sentence transformation tasks. MUST provide 'startingWords' field containing the first 2-3 words of the correct answer.`;
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
      reconstructedTranscript: { type: Type.STRING }
    },
    required: ["score", "feedback", "correctnessLevel", "reconstructedTranscript"]
  };

  const systemInstruction = `You are evaluating a student's answer to the question: "${target}". 
  Student's speech transcript is: "${transcript}". 
  1. SYNC: Your evaluation MUST be based on what is in the transcript.
  2. RECONSTRUCT: Figure out the intended meaning despite minor transcription errors.
  3. JSON only. Vietnamese feedback. Scale 0-100.`;

  const prompt = `${systemInstruction}\nLevel: ${grade}. Transcript: "${transcript}".`;
  const result = await callGeminiWithFallback("gemini-3-flash-preview", prompt, {
    responseMimeType: "application/json",
    responseSchema: schema,
    temperature: 0,
    thinkingConfig: { thinkingBudget: 0 }
  }, userKey);
  return JSON.parse(cleanJsonResponse(result.text));
};

export const evaluateWriting = async (prompt: string, studentText: string, grade: string) => {
  const userKey = localStorage.getItem('user_gemini_api_key') || undefined;
  const schema = {
    type: Type.OBJECT,
    properties: {
      score: { type: Type.INTEGER },
      feedback: { type: Type.STRING },
      corrections: { type: Type.STRING }
    },
    required: ["score", "feedback", "corrections"]
  };
  
  const result = await callGeminiWithFallback("gemini-3-flash-preview", `Grade essay: "${prompt}". Student wrote: "${studentText}". Level: ${grade}. Max score 10. Vietnamese feedback and corrections. Output JSON.`, {
    responseMimeType: "application/json",
    responseSchema: schema,
    temperature: 0,
    thinkingConfig: { thinkingBudget: 0 }
  }, userKey);
  return JSON.parse(cleanJsonResponse(result.text));
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
  const result = await callGeminiWithFallback("gemini-3-flash-preview", `Check rewrite: "${original}" to "${targetPattern}". Student said: "${studentAnswer}". JSON. Vietnamese.`, {
    responseMimeType: "application/json",
    responseSchema: schema,
    temperature: 0,
  }, userKey);
  return JSON.parse(cleanJsonResponse(result.text));
};

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
  const result = await callGeminiWithFallback("gemini-3-flash-preview", `Pron check: "${target}". Transcript: "${transcript}". JSON. Vietnamese.`, {
    responseMimeType: "application/json",
    responseSchema: schema,
    temperature: 0,
  }, userKey);
  return JSON.parse(cleanJsonResponse(result.text));
};
