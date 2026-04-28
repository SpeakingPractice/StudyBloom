
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
  CoinCollector = 'Coin Collector (Vocab)',
}

export enum GrammarSubSkill {
  Pronunciation = 'Pronunciation',
  Stress = 'Word Stress',
  GrammarQuiz = 'Grammar Quiz',
  FillBlank = 'Fill in the Blank',
  Synonym = 'Synonyms',
  Antonym = 'Antonyms',
  Paragraph = 'Complete the Passage',
  WordForm = 'Word Form',
  SentenceTrans = 'Rewrite the Sentence',
}

export interface QuestionData {
  id: number;
  questionText: string; 
  options?: string[]; 
  correctAnswer?: string; 
  explanation: string; 
  topic: string;
  hint?: string; 
  startingWords?: string; // New: explicit starting words for sentence transformation
  listeningScript?: string; 
  speakingTarget?: string; 
  writingPrompt?: string; 
  phonetic?: string; 
  meaning?: string;  
  exampleSentence?: string;
  wordType?: string;
  countability?: string;
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

export interface CustomWord {
  id: string;
  word: string;
  partOfSpeech: 'Noun' | 'Verb' | 'Adjective' | 'Adverb' | 'Phrase';
  definition: string;
  example?: string;
  pronunciation?: string;
  addedAt: number;
}

export interface CustomFolder {
  id: string;
  name: string;
  icon: string;
  color: string;
  createdAt: number;
  words: CustomWord[];
}

export enum ViewMode {
  Home,
  PracticeSelection,
  Questions,
  Game,
  Result,
  VocabManager,
}
