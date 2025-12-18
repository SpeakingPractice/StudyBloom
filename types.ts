
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
  TypeToFly = 'Flappy Bird (Typing)',
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
  questionText: string; 
  options?: string[]; 
  correctAnswer?: string; 
  explanation: string; 
  topic: string;
  hint?: string; 
  listeningScript?: string; 
  speakingTarget?: string; 
  writingPrompt?: string; 
  phonetic?: string; 
  meaning?: string;  
  exampleSentence?: string;
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
