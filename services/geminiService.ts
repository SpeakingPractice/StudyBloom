import { Type } from "@google/genai";
import { GameType, GradeLevel, QuestionData, GrammarSubSkill } from "../types";

// Priority list for fallback models
const FALLBACK_MODELS = [
  "gemini-3-flash-preview",
  "gemini-3-pro-preview",
  "gemini-2.5-flash-lite-latest"
];

function cleanJsonResponse(text: string): string {
  return text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
}

/**
 * Standard proxy call to the backend.
 */
async function callGeminiProxy(model: string, contents: any, config: any) {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, contents, config }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    // Detect quota exceeded via status code or error message
    if (response.status === 429) {
      throw new Error("QUOTA_EXCEEDED");
    }
    const errorMsg = (data.error || "").toLowerCase();
    if (errorMsg.includes("quota") || errorMsg.includes("rate limit")) {
      throw new Error("QUOTA_EXCEEDED");
    }
    throw new Error(data.error || `API Error: ${response.status}`);
  }
  return data;
}

/**
 * Executes a Gemini request with automatic fallback logic for quota issues.
 */
async function callGeminiWithFallback(defaultModel: string, contents: any, config: any) {
  let lastError = null;
  
  // Try models in priority order
  for (const model of FALLBACK_MODELS) {
    try {
      return await callGeminiProxy(model, contents, config);
    } catch (error: any) {
      lastError = error;
      if (error.message === "QUOTA_EXCEEDED") {
        console.warn(`Quota exceeded for ${model}. Rerouting to fallback model...`);
        continue; // Silent retry with next model
      }
      throw error; // Immediate exit for other errors
    }
  }
  
  throw lastError || new Error("Dịch vụ AI đang tạm thời gián đoạn do giới hạn lưu lượng.");
}

export const generateSpeech = async (text: string): Promise<string | null> => {
  try {
    const systemInstruction = `
      Act as a voice actor with a natural, human-like, and inspiring voice.
      Rules: Clear delivery, natural pauses, moderate pace.
    `;

    // Multimodal models require structured contents
    const contents = [{
      parts: [{ text: `${systemInstruction}\n\nRead the following text clearly: "${text}"` }]
    }];

    // TTS specific model
    const result = await callGeminiProxy("gemini-2.5-flash-preview-tts", contents, {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
      }
    });
    
    return result.audio || null;
  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
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
  const gradeLevelInstruction = parseInt(grade.replace('Grade ', '')) <= 9 
    ? "Difficulty: Secondary School (A1-A2/B1). Simple vocabulary."
    : "Difficulty: High School (B1+/B2). Natural B2 vocabulary.";

  switch (gameType) {
    case GameType.Grammar:
      specificInstruction = `Create 10 mixed grammar Multiple Choice Questions. Topic must be in format "English Topic (Vietnamese Topic)".`;
      if (subSkill === GrammarSubSkill.SentenceTrans) {
        specificInstruction = `Create 10 Sentence Transformation Questions. The 'hint' field MUST contain the first 2-3 words of the 'correctAnswer'.`;
      }
      break;
    case GameType.Listening:
      specificInstruction = `Create 5 listening challenges. 'listeningScript' MUST be inspiring. ${gradeLevelInstruction}`;
      break;
    case GameType.Speaking:
      specificInstruction = `Create 5 speaking challenges. ${gradeLevelInstruction}`;
      break;
    case GameType.Writing:
      specificInstruction = `Create 1 writing challenge paragraph topic. ${gradeLevelInstruction}`;
      break;
    case GameType.TypeToFly:
      specificInstruction = `Create 20 UNIQUE vocabulary words for ${grade}. questionText must be strictly the word only.`;
      break;
    case GameType.SayItRight:
      specificInstruction = `Create 10 UNIQUE pronunciation words for ${grade}.`;
      break;
  }

  const prompt = `Expert English Teacher for Vietnam MOET. Grade: ${grade}. Task: ${specificInstruction}. Output: JSON only. Explanations in Vietnamese. Ensure all questionText strings are clean and trimmed.`;

  try {
    const result = await callGeminiWithFallback("gemini-3-flash-preview", prompt, {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
      temperature: 0.8,
    });
    const parsed = JSON.parse(cleanJsonResponse(result.text));
    
    if (parsed.questions) {
      parsed.questions = parsed.questions.map((q: QuestionData) => ({
        ...q,
        questionText: q.questionText.trim(),
        correctAnswer: q.correctAnswer?.trim()
      }));
    }
    
    return parsed;
  } catch (error: any) {
    throw error;
  }
};

export const evaluatePronunciation = async (target: string, transcript: string) => {
  const schema = {
    type: Type.OBJECT,
    properties: {
      isCorrect: { type: Type.BOOLEAN },
      feedback: { type: Type.STRING },
      score: { type: Type.INTEGER },
      advice: { type: Type.STRING }
    },
    required: ["isCorrect", "feedback", "score", "advice"]
  };
  const prompt = `Evaluate pronunciation: Target "${target}", Student "${transcript}". Be encouraging.`;
  try {
    const result = await callGeminiWithFallback("gemini-3-flash-preview", prompt, {
      responseMimeType: "application/json",
      responseSchema: schema
    });
    return JSON.parse(cleanJsonResponse(result.text));
  } catch (error) {
    return null;
  }
};

export const evaluateWriting = async (prompt: string, studentText: string, grade: string) => {
  const gradingSchema = {
    type: Type.OBJECT,
    properties: {
      score: { type: Type.INTEGER },
      feedback: { type: Type.STRING },
      corrections: { type: Type.STRING }
    }
  };
  try {
    const result = await callGeminiWithFallback("gemini-3-flash-preview", `Grade writing for ${grade} student. Prompt: ${prompt}. Answer: "${studentText}".`, {
      responseMimeType: "application/json",
      responseSchema: gradingSchema
    });
    return JSON.parse(cleanJsonResponse(result.text));
  } catch (error: any) {
    return {};
  }
};

export const evaluateSpeaking = async (target: string, transcript: string, grade: string) => {
  const speakingGradingSchema = {
    type: Type.OBJECT,
    properties: {
      score: { type: Type.INTEGER },
      feedback: { type: Type.STRING },
      correctnessLevel: { type: Type.STRING, enum: ["EXCELLENT", "GOOD", "NEEDS_IMPROVEMENT"] }
    },
    required: ["score", "feedback", "correctnessLevel"]
  };
  try {
    const result = await callGeminiWithFallback("gemini-3-flash-preview", `Evaluate speech. Target: "${target}". Transcript: "${transcript}".`, {
      responseMimeType: "application/json",
      responseSchema: speakingGradingSchema
    });
    return JSON.parse(cleanJsonResponse(result.text));
  } catch (error: any) {
    return null;
  }
};

export const evaluateSentenceTransformation = async (original: string, targetPattern: string, studentAnswer: string) => {
  const schema = {
    type: Type.OBJECT,
    properties: {
      status: { type: Type.STRING, enum: ["CORRECT", "CORRECT_DIFFERENT_STRUCTURE", "INCORRECT"] },
      feedback: { type: Type.STRING },
      isGrammaticallyCorrect: { type: Type.BOOLEAN },
      meaningMaintained: { type: Type.BOOLEAN },
      explanation: { type: Type.STRING }
    },
    required: ["status", "feedback", "isGrammaticallyCorrect", "meaningMaintained", "explanation"]
  };

  const prompt = `Evaluate transformation. Original: "${original}". Target Pattern: "${targetPattern}". Student: "${studentAnswer}".`;

  try {
    const result = await callGeminiWithFallback("gemini-3-flash-preview", prompt, {
      responseMimeType: "application/json",
      responseSchema: schema
    });
    return JSON.parse(cleanJsonResponse(result.text));
  } catch (error) {
    return null;
  }
};