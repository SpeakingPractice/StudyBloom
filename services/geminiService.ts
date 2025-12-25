
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
          correctAnswer: { type: Type.STRING },
          explanation: { type: Type.STRING },
          topic: { type: Type.STRING },
          hint: { type: Type.STRING },
          startingWords: { type: Type.STRING },
          listeningScript: { type: Type.STRING },
          speakingTarget: { type: Type.STRING },
          meaning: { type: Type.STRING },
          exampleSentence: { type: Type.STRING },
          options: { type: Type.ARRAY, items: { type: Type.STRING } },
          wordType: { type: Type.STRING },
          countability: { type: Type.STRING }
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
  const difficultyRange = gradeInt <= 8 ? "A1 to B1 (Elementary to Intermediate)" : "A1 to B2 (Elementary to Upper-Intermediate)";

  if (gameType === GameType.Speaking) {
    specificInstruction = `Generate 5 PERSONAL OPEN QUESTIONS for ${grade} students at ${difficultyRange} level. 
    IMPORTANT: 'hint' field must be a CLEAR list of 3-4 bullet points separated by '|' character. 
    'meaning' field MUST provide 3-5 keywords in English-Vietnamese pair format.`;
  } else if (gameType === GameType.Writing) {
    let wordCount = gradeInt <= 9 ? "80-150" : "150-300";
    specificInstruction = `Generate 1 ESSAY topic for ${grade} (${difficultyRange}). Word count: ${wordCount} words. Based on textbook: ${specificTextbook || 'General'}.`;
  } else if (gameType === GameType.Grammar) {
    const subSkillPrompts: Record<string, string> = {
      [GrammarSubSkill.Pronunciation]: "Pick the word whose underlined part is pronounced differently. Wrap the letters in <u></u> (e.g., 'br<u>ea</u>d').",
      [GrammarSubSkill.Stress]: "Choose the word that has a different stress pattern from the others.",
      [GrammarSubSkill.GrammarQuiz]: "Standard multiple-choice grammar and vocabulary questions.",
      [GrammarSubSkill.FillBlank]: "Complete sentences by filling in the blanks with the correct word/phrase.",
      [GrammarSubSkill.Synonym]: "Choose the word closest in meaning to the underlined word in a sentence.",
      [GrammarSubSkill.Antonym]: "Choose the word opposite in meaning to the underlined word in a sentence.",
      [GrammarSubSkill.Paragraph]: "Generate a short cloze test (filling gaps in a paragraph).",
      [GrammarSubSkill.WordForm]: "Supply the correct form of the word in brackets to complete the sentence.",
      [GrammarSubSkill.SentenceTrans]: "Sentence transformation tasks. MUST provide 'startingWords' with 2-3 starting words of the answer.",
    };

    specificInstruction = `Generate 10 advanced questions for ${grade}. 
    Difficulty: ${difficultyRange}. 
    Type: ${subSkillPrompts[subSkill || GrammarSubSkill.GrammarQuiz]}. 
    Textbook context: ${specificTextbook || 'Global Success'}. 
    Provide detailed explanations in Vietnamese.`;
  } else if (gameType === GameType.TypeToFly) {
    specificInstruction = `Generate 15 vocabulary items for ${grade} (${difficultyRange}). Max 3 words per item. No sentences. Vietnamese in explanation only.`;
  } else {
    specificInstruction = `Standard ${gameType} for ${grade} at ${difficultyRange} level.`;
  }

  const prompt = `Task: ${specificInstruction}. Grade: ${grade}. Textbook: ${specificTextbook || 'General'}. Output JSON. Language: Vietnamese for support parts.`;
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

  const prompt = `Evaluate speech for: "${target}". Transcript: "${transcript}". Level: ${grade}. Score 0-100. Vietnamese feedback. Output JSON.`;
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
  
  const result = await callGeminiWithFallback("gemini-3-flash-preview", `Grade essay: "${prompt}". Student wrote: "${studentText}". Level: ${grade}. Max score 10. Vietnamese feedback. Output JSON.`, {
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

  const prompt = `Compare student's answer to target. Original: "${original}". Target: "${targetPattern}". Student: "${studentAnswer}". Ignore caps/punctuation. Status: CORRECT/INCORRECT. Vietnamese feedback. JSON only.`;

  const result = await callGeminiWithFallback("gemini-3-flash-preview", prompt, {
    responseMimeType: "application/json",
    responseSchema: schema,
    temperature: 0,
    thinkingConfig: { thinkingBudget: 0 }
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
