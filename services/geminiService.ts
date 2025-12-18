
import { Type } from "@google/genai";
import { GameType, GradeLevel, QuestionData, GrammarSubSkill } from "../types";

// Danh sách các model dự phòng với tên chính xác theo SDK mới nhất
const FALLBACK_MODELS = [
  "gemini-3-flash-preview",
  "gemini-flash-latest",
  "gemini-flash-lite-latest"
];

function cleanJsonResponse(text: string): string {
  return text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
}

/**
 * Phân tích thông báo lỗi từ API để lấy thông tin hữu ích cho người dùng
 */
function parseErrorMessage(error: any): string {
  try {
    if (typeof error === 'string') {
      const parsed = JSON.parse(error);
      return parsed.error?.message || parsed.message || error;
    }
    return error.message || "Đã xảy ra lỗi không xác định.";
  } catch {
    return error.message || String(error);
  }
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
    if (response.status === 429) {
      throw new Error("QUOTA_EXCEEDED");
    }
    const errorMsg = (data.error || "").toLowerCase();
    if (errorMsg.includes("quota") || errorMsg.includes("rate limit")) {
      throw new Error("QUOTA_EXCEEDED");
    }
    // Trả về nội dung lỗi thô để callGeminiWithFallback xử lý
    throw new Error(typeof data.error === 'object' ? JSON.stringify(data.error) : data.error || `API Error: ${response.status}`);
  }
  return data;
}

/**
 * Executes a Gemini request with automatic fallback logic for quota issues.
 */
async function callGeminiWithFallback(defaultModel: string, contents: any, config: any) {
  let lastError = null;
  for (const model of FALLBACK_MODELS) {
    try {
      return await callGeminiProxy(model, contents, config);
    } catch (error: any) {
      lastError = error;
      if (error.message === "QUOTA_EXCEEDED") {
        console.warn(`Model ${model} hết quota, đang chuyển sang model tiếp theo...`);
        continue;
      }
      // Nếu là lỗi 404 hoặc lỗi khác không phải quota, vẫn thử model tiếp theo nếu có thể
      if (error.message.includes("404") || error.message.includes("NOT_FOUND")) {
        continue;
      }
      throw new Error(parseErrorMessage(error.message));
    }
  }
  throw new Error(lastError ? parseErrorMessage(lastError.message) : "Dịch vụ AI đang tạm thời gián đoạn.");
}

export const generateSpeech = async (text: string): Promise<string | null> => {
  try {
    const contents = [{
      parts: [{ text: `Read clearly: "${text}"` }]
    }];
    const result = await callGeminiProxy("gemini-2.5-flash-preview-tts", contents, {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
      }
    });
    return result.audio || null;
  } catch (error) {
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
    ? "Difficulty: Secondary School (A1-A2 level). ONLY simple, high-frequency vocabulary. No complex idioms."
    : "Difficulty: High School (B1-B2 level). Natural vocabulary.";

  switch (gameType) {
    case GameType.Grammar:
      specificInstruction = `10 grammar MCQs.`;
      if (subSkill === GrammarSubSkill.SentenceTrans) {
        specificInstruction = `10 Sentence Transformation Questions. Hint must be first 2 words.`;
      }
      break;
    case GameType.Listening:
      specificInstruction = `5 listening tasks. ${gradeLevelInstruction}`;
      break;
    case GameType.Speaking:
      specificInstruction = `5 speaking tasks. ${gradeLevelInstruction}`;
      break;
    case GameType.Writing:
      specificInstruction = `1 simple paragraph topic. ${gradeLevelInstruction}`;
      break;
    case GameType.TypeToFly:
      specificInstruction = `20 simple words for typing practice.`;
      break;
    case GameType.SayItRight:
      specificInstruction = `10 common words for pronunciation.`;
      break;
  }

  const prompt = `Task: ${specificInstruction}. Grade: ${grade}. Textbook: ${specificTextbook || 'MOET Standard'}. Language: Vietnamese explanations. Format: JSON.`;

  try {
    const result = await callGeminiWithFallback("gemini-3-flash-preview", prompt, {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
      temperature: 0.7,
      thinkingConfig: { thinkingBudget: 0 }
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
      advice: { type: Type.STRING }
    },
    required: ["isCorrect", "feedback", "advice"]
  };
  try {
    const result = await callGeminiWithFallback("gemini-3-flash-preview", `Score pronunciation. Target: "${target}", Student: "${transcript}".`, {
      responseMimeType: "application/json",
      responseSchema: schema,
      thinkingConfig: { thinkingBudget: 0 }
    });
    return JSON.parse(cleanJsonResponse(result.text));
  } catch (error) {
    return null;
  }
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
    const result = await callGeminiWithFallback("gemini-3-flash-preview", `Grade writing for ${grade}. Prompt: ${prompt}. Answer: "${studentText}".`, {
      responseMimeType: "application/json",
      responseSchema: schema,
      thinkingConfig: { thinkingBudget: 0 }
    });
    return JSON.parse(cleanJsonResponse(result.text));
  } catch (error: any) {
    return {};
  }
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
    const result = await callGeminiWithFallback("gemini-3-flash-preview", `Score speech. Target: "${target}". Student: "${transcript}".`, {
      responseMimeType: "application/json",
      responseSchema: schema,
      thinkingConfig: { thinkingBudget: 0 }
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
      status: { type: Type.STRING },
      feedback: { type: Type.STRING },
      explanation: { type: Type.STRING }
    }
  };
  try {
    const result = await callGeminiWithFallback("gemini-3-flash-preview", `Score transformation. Original: "${original}". Target: "${targetPattern}". Student: "${studentAnswer}".`, {
      responseMimeType: "application/json",
      responseSchema: schema,
      thinkingConfig: { thinkingBudget: 0 }
    });
    return JSON.parse(cleanJsonResponse(result.text));
  } catch (error) {
    return null;
  }
};
