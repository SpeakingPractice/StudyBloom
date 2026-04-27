
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
        required: ["id", "questionText", "correctAnswer", "explanation", "topic", "options"],
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
    'meaning' field MUST provide 3-5 keywords in English-Vietnamese pair format.
    'explanation' field MUST provide a short tips for speaking well in Vietnamese.`;
  } else if (gameType === GameType.Writing) {
    let wordCount = gradeInt <= 9 ? "80-150" : "150-300";
    specificInstruction = `Generate 1 ESSAY topic for ${grade} (${difficultyRange}). Word count: ${wordCount} words. Based on textbook: ${specificTextbook || 'General'}.
    'explanation' field: provide a 1-sentence tip on how to structure this specific essay in Vietnamese.`;
  } else if (gameType === GameType.Grammar) {
    const subSkillPrompts: Record<string, string> = {
      [GrammarSubSkill.Pronunciation]: "Pick the word whose underlined part is pronounced differently. IMPORTANT: Underline the SPECIFIC phonemes being tested (e.g., '<u>th</u>ink', '<u>th</u>ere'). Wrap letters in <u></u>. Ensure IPA accuracy.",
      [GrammarSubSkill.Stress]: "Choose the word that has a different stress pattern. Wrap the stressed syllable in <b></b> or use an apostrophe before the stressed syllable.",
      [GrammarSubSkill.GrammarQuiz]: "Standard multiple-choice grammar/vocabulary questions.",
      [GrammarSubSkill.FillBlank]: "Complete sentences by filling in the blanks.",
      [GrammarSubSkill.Synonym]: "Choose the word closest in meaning to the underlined word.",
      [GrammarSubSkill.Antonym]: "Choose the word opposite in meaning to the underlined word.",
      [GrammarSubSkill.Paragraph]: "Generate a short cloze test.",
      [GrammarSubSkill.WordForm]: "Supply the correct form of the word in brackets.",
      [GrammarSubSkill.SentenceTrans]: "Sentence transformation. Provide 'startingWords'.",
    };

    specificInstruction = `Generate 10 advanced questions for ${grade}. Difficulty: ${difficultyRange}. Type: ${subSkillPrompts[subSkill || GrammarSubSkill.GrammarQuiz]}. 
    IMPORTANT: 
    - 'options' MUST NOT contain A, B, C, D prefixes. 
    - 'correctAnswer' MUST exactly match one string in 'options'. 
    - 'explanation' field MUST provide a CONCISE (1 sentence) grammatical explanation in Vietnamese why the answer is correct.
    - Randomize correct answer position.`;
  } else if (gameType === GameType.TypeToFly) {
    // UPDATED: Added explicit word length and difficulty constraints per grade
    let lengthConstraint = "";
    if (gradeInt === 6) {
      lengthConstraint = "ONLY words with 3-5 letters. Use VERY simple A1 level words (e.g., cat, tree, jump). NO complex or academic words.";
    } else if (gradeInt === 7) {
      lengthConstraint = "ONLY words with 4-6 letters. Common A1-A2 level vocabulary.";
    } else if (gradeInt <= 9) {
      lengthConstraint = "Words with 5-10 letters. B1 level vocabulary.";
    } else {
      lengthConstraint = "Advanced words with 8-15 letters. B2-C1 academic level vocabulary.";
    }

    specificInstruction = `Generate 15 UNIQUE and RANDOM vocabulary items for ${grade} students. 
    ${lengthConstraint}
    CRITICAL: 'questionText' MUST ONLY contain the English word itself (e.g. "Neighbor"). 
    NO instructions or sentences in questionText.
    VARIETY: Ensure the list is randomized and different from previous generations by including a mix of different themes (nature, city, hobby, technology).
    'explanation' field: provide ONLY the Vietnamese meaning.`;
  } else if (gameType === GameType.CoinCollector) {
    let cefrLevel = "";
    if (gradeInt <= 7) cefrLevel = "A1 to A2";
    else if (gradeInt <= 9) cefrLevel = "B1";
    else cefrLevel = "B2";

    specificInstruction = `Generate 10 English vocabulary multiple-choice questions for ${grade} (${cefrLevel} level).
    - 'questionText' MUST be the English word itself.
    - 'hint' MUST be a short part-of-speech and simplified synonym/context (e.g., "noun — a large animal", "adjective — feeling happy").
    - 'options' MUST have 4 strings (unique, in English).
    - 'correctAnswer' MUST match one of the options.
    - 'explanation' is not used but provide Vietnamese meaning.`;
  } else {
    specificInstruction = `Standard ${gameType} for ${grade} at ${difficultyRange} level. 'explanation' field MUST have 1 short Vietnamese sentence.`;
  }

  const prompt = `Task: ${specificInstruction}. Grade: ${grade}. Textbook: ${specificTextbook || 'General'}. Output JSON. Language: Vietnamese for support parts (explanation, meaning). Generation Timestamp: ${Date.now()}.`;
  const result = await callGeminiWithFallback("gemini-3-flash-preview", prompt, {
    responseMimeType: "application/json",
    responseSchema: responseSchema,
    temperature: 0.8, // Increased temperature for more variety in word selection
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
