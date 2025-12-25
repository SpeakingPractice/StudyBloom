
import React, { useState, useEffect, useMemo } from 'react';
import { QuestionData, GrammarSubSkill } from '../types';
import { Button } from './Button';
import { evaluateSentenceTransformation } from '../services/geminiService';

interface QuizGameProps {
  questions: QuestionData[];
  onComplete: (score: number) => void;
  subSkill?: GrammarSubSkill;
}

export const QuizGame: React.FC<QuizGameProps> = ({ questions, onComplete, subSkill }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  
  const [userInput, setUserInput] = useState("");
  const [isInputCorrect, setIsInputCorrect] = useState<boolean | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [aiResult, setAiResult] = useState<{status: string, feedback: string, explanation: string} | null>(null);

  const currentQuestion = questions[currentIndex];
  const isInputMode = subSkill === GrammarSubSkill.SentenceTrans;

  // Xáo trộn options mỗi khi đổi câu hỏi để tránh việc đáp án đúng luôn ở vị trí cố định
  const shuffledOptions = useMemo(() => {
    if (!currentQuestion || !currentQuestion.options) return [];
    return [...currentQuestion.options].sort(() => Math.random() - 0.5);
  }, [currentIndex, currentQuestion]);

  useEffect(() => {
    setSelectedOption(null);
    setShowFeedback(false);
    setUserInput("");
    setIsInputCorrect(null);
    setAiResult(null);
  }, [currentIndex]);

  if (!currentQuestion) return null;

  const handleOptionClick = (option: string) => {
    if (showFeedback) return;
    setSelectedOption(option);
    setShowFeedback(true);
    // Kiểm tra đáp án chính xác
    if (option === currentQuestion.correctAnswer) {
      setScore(prev => prev + 2);
    }
  };

  const handleInputCheck = async () => {
    if (showFeedback || isEvaluating) return;
    setIsEvaluating(true);
    const result = await evaluateSentenceTransformation(
      currentQuestion.questionText, 
      currentQuestion.correctAnswer || "", 
      userInput
    );
    setIsEvaluating(false);

    if (result) {
      setAiResult(result);
      const correct = result.status === "CORRECT";
      setIsInputCorrect(correct);
      setShowFeedback(true);
      if (correct) setScore(prev => prev + 2);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onComplete(score);
    }
  };

  const getButtonVariant = (option: string) => {
    if (!showFeedback) return selectedOption === option ? 'primary' : 'outline';
    if (option === currentQuestion.correctAnswer) return 'success'; 
    if (option === selectedOption && option !== currentQuestion.correctAnswer) return 'danger';
    return 'outline';
  };

  const getStartingHint = () => {
    if (currentQuestion.startingWords) return currentQuestion.startingWords;
    if (currentQuestion.correctAnswer) {
      const parts = currentQuestion.correctAnswer.split(' ');
      return parts.slice(0, 2).join(' ') + "...";
    }
    return "Hãy bắt đầu viết...";
  };

  return (
    <div className="max-w-2xl mx-auto w-full">
      <div className="mb-6 bg-gray-200/50 backdrop-blur-sm rounded-full h-4 overflow-hidden border border-white/30">
        <div className="bg-blue-500 h-full transition-all duration-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} />
      </div>

      <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl p-6 md:p-8 border border-white/50">
        <div className="flex justify-between items-center mb-4">
          <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
            Câu {currentIndex + 1}/{questions.length}
          </span>
          <span className="text-blue-500 font-black text-[10px] uppercase tracking-wider bg-blue-50 px-3 py-1 rounded-full">
            {currentQuestion.topic}
          </span>
        </div>

        <div className="text-center mb-8">
           <h3 className="text-xl md:text-2xl font-black text-gray-800 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: currentQuestion.questionText }} />
          
          {isInputMode && (
            <div className="mt-4 p-5 bg-blue-50 rounded-2xl border-2 border-dashed border-blue-200 shadow-inner">
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Bắt đầu bằng (Start with):</p>
              <p className="text-xl font-bold text-blue-700 underline decoration-blue-300 underline-offset-4 mb-3">
                {getStartingHint()}
              </p>
              <div className="pt-2 border-t border-blue-100">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Cấu trúc gợi ý:</p>
                <p className="text-sm font-bold text-blue-800 italic">{currentQuestion.hint || "S + V..."}</p>
              </div>
            </div>
          )}
        </div>

        {isInputMode ? (
          <div className="mb-6 space-y-4">
            <textarea 
              value={userInput} 
              onChange={(e) => setUserInput(e.target.value)} 
              disabled={showFeedback || isEvaluating}
              placeholder="Nhập câu trả lời của bạn..."
              className={`w-full p-4 text-lg border-2 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all resize-none h-32 font-bold text-gray-900 ${
                isInputCorrect === true ? 'border-green-500 bg-green-50' : isInputCorrect === false ? 'border-red-500 bg-red-50' : 'border-gray-100 bg-white'
              }`} 
            />
            {!showFeedback && (
              <div className="flex">
                 <Button onClick={handleInputCheck} disabled={!userInput.trim() || isEvaluating} variant="primary" fullWidth>
                    {isEvaluating ? "Đang kiểm tra..." : "Kiểm tra"}
                 </Button>
              </div>
            )}
            {showFeedback && aiResult && (
              <div className={`p-6 rounded-2xl border-2 animate-fade-in ${isInputCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                 <p className="font-black text-gray-800">{aiResult.feedback}</p>
                 <p className="text-gray-900 font-black mt-2">Đáp án: {currentQuestion.correctAnswer}</p>
                 <p className="text-gray-600 text-sm mt-2 font-bold italic">{aiResult.explanation}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {shuffledOptions.map((option, idx) => (
              <Button key={idx} variant={getButtonVariant(option)} onClick={() => handleOptionClick(option)} fullWidth className="text-left py-4 px-6">
                <span className="mr-3 font-black text-blue-400">{String.fromCharCode(65 + idx)}.</span>
                <span dangerouslySetInnerHTML={{ __html: option }} />
              </Button>
            ))}
          </div>
        )}

        {showFeedback && (
          <div className="flex justify-end mt-4">
             <Button onClick={handleNext} size="lg" variant="secondary">Tiếp theo →</Button>
          </div>
        )}
      </div>
    </div>
  );
};
