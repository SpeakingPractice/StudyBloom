import { Type, Schema } from "@google/genai";
import { GameType, GradeLevel, QuestionData, GrammarSubSkill } from "../types";

// Helper to call the backend proxy
async function callGeminiProxy(model: string, contents: any, config: any) {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      contents,
      config
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API Request failed with status ${response.status}`);
  }

  return response.json(); // Returns { text: "..." }
}

const responseSchema: Schema = {
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
          listeningScript: { type: Type.STRING, description: "Text for TTS to read. Use 'Speaker: Text' format for dialogues. Ensure proper punctuation (. ! ?)." },
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
  
  const modelId = "gemini-2.5-flash"; 

  let specificInstruction = "";
  
  // Define grade-based difficulty instructions
  const gradeLevelInstruction = parseInt(grade.replace('Grade ', '')) <= 9 
    ? "Difficulty: Secondary School (A1-A2/B1). Focus on fundamental tenses (Present/Past/Future), comparisons, modals, basic prepositions, and daily vocabulary."
    : "Difficulty: High School (B1+/B2). Focus on advanced tenses, inversion, subjunctive, phrasal verbs, collocations, idioms, and academic vocabulary.";

  switch (gameType) {
    case GameType.Grammar:
      if (subSkill) {
        switch (subSkill) {
          case GrammarSubSkill.Pronunciation:
            specificInstruction = `Create 10 Multiple Choice Questions. Topic: Pronunciation.
            Format: Give a list of 4 words as options. The 'questionText' should be: "Choose the word whose underlined part is pronounced differently from the others." 
            IMPORTANT: In the 'options', wrap the specific phoneme part in parentheses e.g. "h(a)t".`;
            break;
          case GrammarSubSkill.Stress:
            specificInstruction = `Create 10 Multiple Choice Questions. Topic: Word Stress.
            Format: Give 4 words. The 'questionText' should be: "Choose the word that has a different stress pattern from the others."`;
            break;
          case GrammarSubSkill.GrammarQuiz:
            specificInstruction = `Create 10 Multiple Choice Questions covering general grammar points suitable for ${grade}.
            Includes tenses, prepositions, articles, conjunctions.`;
            break;
          case GrammarSubSkill.FillBlank:
            specificInstruction = `Create 10 Multiple Choice Questions (Cloze style).
            'questionText' must contain a '______' placeholder. Provide 4 options to fill the blank.`;
            break;
          case GrammarSubSkill.Synonym:
            specificInstruction = `Create 10 Multiple Choice Questions. Topic: Synonyms (CLOSEST in meaning).
            'questionText' should be a sentence with a CAPITALIZED word. Ask for the word CLOSEST in meaning.`;
            break;
          case GrammarSubSkill.Antonym:
            specificInstruction = `Create 10 Multiple Choice Questions. Topic: Antonyms (OPPOSITE in meaning).
            'questionText' should be a sentence with a CAPITALIZED word. Ask for the word OPPOSITE in meaning.`;
            break;
          case GrammarSubSkill.Paragraph:
            specificInstruction = `Create 10 Questions based on a short paragraph context.
            However, present them as individual sentences with blanks related to a cohesive topic (e.g., Environment, Technology).
            'questionText' should have a blank. Options should be transition words or context-dependent vocabulary.`;
            break;
          case GrammarSubSkill.WordForm:
            specificInstruction = `Create 10 Multiple Choice Questions. Topic: Word Forms (Noun, Verb, Adjective, Adverb).
            'questionText': A sentence with a blank. Options: 4 variations of the same root word (e.g., beauty, beautiful, beautifully, beautify).`;
            break;
          case GrammarSubSkill.SentenceTrans:
            specificInstruction = `Create 10 Sentence Transformation Questions. Topic: Sentence Transformation.
            'questionText': Provide the original sentence AND the starting words of the new sentence (e.g., "I haven't seen him for two years. -> The last time...").
            'correctAnswer': The FULL correct rewritten sentence (e.g., "The last time I saw him was two years ago").
            'options': Leave empty array [].`;
            break;
          default:
            specificInstruction = `Create 10 grammar Multiple Choice Questions.`;
        }
      } else {
        specificInstruction = `Create 10 mixed grammar Multiple Choice Questions.`;
      }
      break;

    case GameType.Listening:
      specificInstruction = `Create 3 listening challenges. 'listeningScript' MUST be a dialogue (e.g., 'Mom: Time for bed!\nTom: Not yet.') or a short story. Ensure distinct speakers and emotions. 'questionText' is a comprehension question with 4 options. ${gradeLevelInstruction}`;
      break;
    case GameType.Speaking:
      specificInstruction = `Create 5 speaking challenges. 'questionText' is instruction (e.g., 'Read this sentence'). 'speakingTarget' is the English sentence the student must say. ${gradeLevelInstruction}`;
      break;
    case GameType.Writing:
      specificInstruction = `Create 1 writing challenge. 
      'questionText' must be the essay prompt followed by 3-4 bullet points (suggestions) on what to include. 
      Format: "Write a paragraph about [Topic].\n- Suggestion 1\n- Suggestion 2\n- Suggestion 3". 
      'topic' is the genre. ${gradeLevelInstruction}`;
      break;
  }

  const prompt = `
    Role: Expert English Teacher for Vietnam MOET Curriculum (Secondary & High School).
    Grade: ${grade}.
    Task: ${specificInstruction}
    Textbook Reference: ${specificTextbook || "Standard MOET Curriculum (Global Success, Friends Global, etc.)"}.
    
    ${gradeLevelInstruction}

    Output: JSON. Ensure explanations are in Vietnamese and explain clearly why the answer is correct based on grammar rules.
  `;

  try {
    const result = await callGeminiProxy(modelId, prompt, {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
      temperature: 0.7,
    });

    const text = result.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to generate content.");
  }
};

export const evaluateWriting = async (prompt: string, studentText: string, grade: string) => {
  const gradingSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      score: { type: Type.INTEGER, description: "Score out of 20" },
      feedback: { type: Type.STRING, description: "Constructive feedback in Vietnamese" },
      corrections: { type: Type.STRING, description: "Corrected version of the text" }
    }
  };

  try {
    const result = await callGeminiProxy("gemini-2.5-flash", `Grade this English writing for a ${grade} Vietnamese student.
      Prompt: ${prompt}
      Student Answer: "${studentText}"
      Provide score (0-20), helpful feedback in Vietnamese, and a corrected version.`, 
      {
        responseMimeType: "application/json",
        responseSchema: gradingSchema
      }
    );
    
    return JSON.parse(result.text || "{}");
  } catch (error) {
    console.error("Evaluation Error:", error);
    return {};
  }
};