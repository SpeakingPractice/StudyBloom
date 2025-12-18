import { GameType, GradeLevel, QuestionData, GrammarSubSkill } from "../types";

const Type = {
  STRING: 'STRING',
  NUMBER: 'NUMBER',
  INTEGER: 'INTEGER',
  BOOLEAN: 'BOOLEAN',
  ARRAY: 'ARRAY',
  OBJECT: 'OBJECT'
};

const getApiKey = () => localStorage.getItem('GEMINI_API_KEY') || '';

function cleanJsonResponse(text: string): string {
  return text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
}

async function callGeminiProxy(model: string, contents: any, config: any) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key missing.");

  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey
    },
    body: JSON.stringify({ model, contents, config }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new Error("INVALID_KEY");
    throw new Error(data.error || `API Error: ${response.status}`);
  }
  return data;
}

export const generateSpeech = async (text: string): Promise<string | null> => {
  try {
    // Highly specific prompt to ensure the voice characteristics requested by the user
    const systemInstruction = `
      Act as a voice actor with a natural, human-like, and inspiring voice.
      Rules for delivery:
      - Use a moderate pace — not too fast, not flat or mechanical.
      - Add natural pauses at commas, full stops, and after important ideas.
      - Gently emphasize key words and phrases that convey emotion, motivation, and hope.
      - Use dynamic intonation with clear rises and falls in pitch.
      - The delivery should feel like a warm, encouraging conversation, not a scripted reading.
      - Keep the voice clear, friendly, and positive, creating a sense of trust and connection.
      - Avoid an advertising tone, avoid exaggerated drama, and avoid robotic delivery.
      - Goal: Help the listener feel motivated, focused, and emotionally engaged.
    `;

    const result = await callGeminiProxy("gemini-2.5-flash-preview-tts", 
      `${systemInstruction}\n\nRead the following text: "${text}"`,
      {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
        }
      }
    );
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
          listeningScript: { type: Type.STRING },
          speakingTarget: { type: Type.STRING },
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
  const modelId = "gemini-3-flash-preview"; 
  let specificInstruction = "";
  const gradeLevelInstruction = parseInt(grade.replace('Grade ', '')) <= 9 
    ? "Difficulty: Secondary School (A1-A2/B1). Simple vocabulary."
    : "Difficulty: High School (B1+/B2). Natural B2 vocabulary.";

  switch (gameType) {
    case GameType.Grammar:
      specificInstruction = `Create 5 mixed grammar Multiple Choice Questions.`;
      if (subSkill === GrammarSubSkill.SentenceTrans) {
        specificInstruction = `Create 5 Sentence Transformation Questions. Provide original and starting words.`;
      }
      break;
    case GameType.Listening:
      specificInstruction = `Create 2 listening challenges. 'listeningScript' MUST be inspiring and warm. ${gradeLevelInstruction}`;
      break;
    case GameType.Speaking:
      specificInstruction = `Create 4 speaking challenges. 'speakingTarget' MUST be NATURAL SPOKEN ENGLISH with contractions. ${gradeLevelInstruction}`;
      break;
    case GameType.Writing:
      specificInstruction = `Create 1 writing challenge. 
      FORMAT for 'questionText':
      Line 1: Main task (e.g., "Write a paragraph about...").
      Subsequent lines: Each suggestion starts with '-' on a NEW LINE.
      Vocabulary: Use VERY SIMPLE English (Level A1 to B2) for all suggestions. No complex jargon.
      ${gradeLevelInstruction}`;
      break;
  }

  const prompt = `Expert English Teacher for Vietnam MOET. Grade: ${grade}. Task: ${specificInstruction}. Output: JSON only. Explanations in Vietnamese.`;

  try {
    const result = await callGeminiProxy(modelId, prompt, {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
      temperature: 0.7,
    });
    return JSON.parse(cleanJsonResponse(result.text));
  } catch (error: any) {
    throw error;
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
    const result = await callGeminiProxy("gemini-3-flash-preview", `Grade this English writing for a ${grade} Vietnamese student. Prompt: ${prompt}. Student Answer: "${studentText}". Provide score (0-20), Vietnamese feedback, and corrections. Use A1-B2 level feedback.`, {
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
    const result = await callGeminiProxy("gemini-3-flash-preview", `Act as a faithful transcription evaluator. 
      The student's transcript contains exact speech features including hesitations and repeats. 
      Evaluate the clarity and correctness of the spoken attempt against the target sentence.
      Target: "${target}"
      Student Spoke: "${transcript}"
      Point out specific errors in Vietnamese. Be encouraging.`, {
      responseMimeType: "application/json",
      responseSchema: speakingGradingSchema
    });
    return JSON.parse(cleanJsonResponse(result.text));
  } catch (error: any) {
    return null;
  }
};