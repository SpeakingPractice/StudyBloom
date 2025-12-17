import { GameType, GradeLevel, QuestionData, GrammarSubSkill } from "../types";

// Define Type locally to avoid importing the heavy Node.js SDK in the browser
const Type = {
  STRING: 'STRING',
  NUMBER: 'NUMBER',
  INTEGER: 'INTEGER',
  BOOLEAN: 'BOOLEAN',
  ARRAY: 'ARRAY',
  OBJECT: 'OBJECT'
};

// Helper to get key
const getApiKey = () => localStorage.getItem('GEMINI_API_KEY') || '';

// Helper to clean AI response (removes markdown code blocks if present)
function cleanJsonResponse(text: string): string {
  return text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
}

// Helper to call the backend proxy
async function callGeminiProxy(model: string, contents: any, config: any) {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error("API Key missing. Please refresh and enter your key.");
  }

  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey // Pass key to backend
    },
    body: JSON.stringify({
      model,
      contents,
      config
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("INVALID_KEY");
    }
    throw new Error(data.error || `API Error: ${response.status}`);
  }

  return data;
}

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.INTEGER },
          questionText: { type: Type.STRING, description: "The visible question text." },
          options: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "Options for multiple choice. Empty for Speaking/Writing/Sentence Transformation." 
          },
          correctAnswer: { type: Type.STRING, description: "Correct answer string." },
          explanation: { type: Type.STRING, description: "Vietnamese explanation." },
          topic: { type: Type.STRING },
          listeningScript: { type: Type.STRING, description: "Text for TTS to read." },
          speakingTarget: { type: Type.STRING, description: "Sentence to read aloud (Speaking mode only)." },
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
    ? "Difficulty: Secondary School (A1-A2/B1). Focus on fundamental vocabulary."
    : "Difficulty: High School (B1+/B2). Focus on B2 level vocabulary.";

  switch (gameType) {
    case GameType.Grammar:
      if (subSkill) {
        switch (subSkill) {
          case GrammarSubSkill.Pronunciation:
            specificInstruction = `Create 5 Multiple Choice Questions. Topic: Pronunciation.
            Format: Give a list of 4 words as options. The 'questionText' should be: "Choose the word whose underlined part is pronounced differently from the others." 
            IMPORTANT: In the 'options', wrap the specific phoneme part in parentheses e.g. "h(a)t".`;
            break;
          case GrammarSubSkill.Stress:
            specificInstruction = `Create 5 Multiple Choice Questions. Topic: Word Stress.
            Format: Give 4 words. The 'questionText' should be: "Choose the word that has a different stress pattern from the others."`;
            break;
          case GrammarSubSkill.GrammarQuiz:
            specificInstruction = `Create 5 Multiple Choice Questions covering general grammar points suitable for ${grade}.`;
            break;
          case GrammarSubSkill.FillBlank:
            specificInstruction = `Create 5 Multiple Choice Questions (Cloze style) with '______' placeholder.`;
            break;
          case GrammarSubSkill.Synonym:
            specificInstruction = `Create 5 Multiple Choice Questions for Synonyms (CLOSEST in meaning).`;
            break;
          case GrammarSubSkill.Antonym:
            specificInstruction = `Create 5 Multiple Choice Questions for Antonyms (OPPOSITE in meaning).`;
            break;
          case GrammarSubSkill.Paragraph:
            specificInstruction = `Create 5 Questions based on a short paragraph context.`;
            break;
          case GrammarSubSkill.WordForm:
            specificInstruction = `Create 5 Multiple Choice Questions. Topic: Word Forms.`;
            break;
          case GrammarSubSkill.SentenceTrans:
            specificInstruction = `Create 5 Sentence Transformation Questions. Provide original and starting words.`;
            break;
          default:
            specificInstruction = `Create 5 grammar Multiple Choice Questions.`;
        }
      } else {
        specificInstruction = `Create 5 mixed grammar Multiple Choice Questions.`;
      }
      break;

    case GameType.Listening:
      specificInstruction = `Create 2 listening challenges. 'listeningScript' MUST be a dialogue or short story. ${gradeLevelInstruction}`;
      break;
    case GameType.Speaking:
      specificInstruction = `Create 4 speaking challenges. 
      'speakingTarget' MUST be NATURAL SPOKEN ENGLISH using contractions and A1-B2 vocabulary. ${gradeLevelInstruction}`;
      break;
    case GameType.Writing:
      specificInstruction = `Create 1 writing challenge. 
      IMPORTANT FORMAT for 'questionText':
      Line 1: The main task/essay prompt (e.g., "Write a paragraph about...").
      Subsequent lines: Each suggestion must start with a dash '-' on a NEW LINE.
      Vocabulary: Use simple, common English (Level A1 to B2) for all suggestions. Avoid academic jargon.
      ${gradeLevelInstruction}`;
      break;
  }

  const prompt = `
    Role: Expert English Teacher for Vietnam MOET Curriculum.
    Grade: ${grade}.
    Task: ${specificInstruction}
    Textbook: ${specificTextbook || "Standard MOET Curriculum"}.
    ${gradeLevelInstruction}
    Output: JSON only. Explanations in Vietnamese.
  `;

  try {
    const result = await callGeminiProxy(modelId, prompt, {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
      temperature: 0.7,
    });

    if (!result.text) throw new Error("No response content from AI");
    return JSON.parse(cleanJsonResponse(result.text));
  } catch (error: any) {
    if (error.message === 'INVALID_KEY') throw error;
    console.error("Gemini API Error:", error);
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
    const result = await callGeminiProxy("gemini-3-flash-preview", `Grade this English writing for a ${grade} Vietnamese student.
      Prompt: ${prompt}
      Student Answer: "${studentText}"
      Provide score (0-20), helpful feedback in Vietnamese, and a corrected version.`, 
      {
        responseMimeType: "application/json",
        responseSchema: gradingSchema
      }
    );
    
    if (!result.text) return {};
    return JSON.parse(cleanJsonResponse(result.text));
  } catch (error: any) {
    if (error.message === 'INVALID_KEY') throw error;
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
    const result = await callGeminiProxy("gemini-3-flash-preview", `Evaluate this speaking attempt for a ${grade} Vietnamese student.
      Target: "${target}"
      Student Spoke: "${transcript}"
      
      Instructions:
      - Even if the transcript is not 100% correct, provide a score (0-100).
      - Point out EXACTLY what was wrong (e.g., missed words, mispronunciation of specific letters) in Vietnamese.
      - Be encouraging but strict on clarity.`, 
      {
        responseMimeType: "application/json",
        responseSchema: speakingGradingSchema
      }
    );
    
    if (!result.text) return null;
    return JSON.parse(cleanJsonResponse(result.text));
  } catch (error: any) {
    return null;
  }
};