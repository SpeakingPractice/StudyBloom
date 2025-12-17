export enum GradeLevel {
  Grade6 = 'Grade 6',
  Grade7 = 'Grade 7',
  Grade8 = 'Grade 8',
  Grade9 = 'Grade 9',
  Grade10 = 'Grade 10',
  Grade11 = 'Grade 11',
  Grade12 = 'Grade 12',
}

export enum GameType {
  Grammar = 'Ngữ Pháp (Grammar)',
  Listening = 'Luyện Nghe (Listening)',
  Speaking = 'Luyện Nói (Speaking)',
  Writing = 'Luyện Viết (Writing)',
}

export enum GrammarSubSkill {
  Pronunciation = 'Trắc Nghiệm Phát Âm',
  Stress = 'Trắc Nghiệm Nhấn Âm',
  GrammarQuiz = 'Trắc Nghiệm Ngữ Pháp',
  FillBlank = 'Điền Từ',
  Synonym = 'Chọn Từ Đồng Nghĩa',
  Antonym = 'Chọn Từ Trái Nghĩa',
  Paragraph = 'Hoàn Thành Đoạn Văn',
  WordForm = 'Từ Loại',
  SentenceTrans = 'Viết Lại Câu',
}

export interface QuestionData {
  id: number;
  questionText: string; // The prompt, question, or sentence to fill
  options?: string[]; // Used for Quiz/FillBlank/Listening
  correctAnswer?: string; // Used for auto-checking
  explanation: string; 
  topic: string;
  // Specific fields for new modes
  listeningScript?: string; // For Listening: The text to be read aloud
  speakingTarget?: string; // For Speaking: The target sentence to say
  writingPrompt?: string; // For Writing: The topic instruction
}

export interface GameSession {
  grade: GradeLevel;
  gameType: GameType;
  subSkill?: GrammarSubSkill;
  questions: QuestionData[];
  textbookContext: string;
}

export interface TextbookInfo {
  name: string;
  publisher: string;
}

export interface UserProgress {
  totalScore: number;
  badges: string[];
}