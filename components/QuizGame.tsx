
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

  const percentage = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="max-w-2xl mx-auto w-full">
      <div className="mb-8 relative pt-6">
        <div className="bg-[#1A1A2E] rounded-full h-6 border-4 border-[#FBD000] overflow-hidden relative">
          <div className="bg-[#E52521] h-full transition-all duration-500 shadow-[0_0_15px_rgba(229,37,33,0.5)]"
            style={{ width: `${percentage}%` }} />
        </div>
        <div className="absolute top-0 transition-all duration-500 flex items-center justify-center transform -translate-x-1/2"
             style={{ left: `${percentage}%` }}>
          <span className="text-3xl filter drop-shadow-md animate-bounce">
            {percentage === 100 ? '⭐' : '🍄'}
          </span>
        </div>
      </div>

      <div className="glass-panel p-6 md:p-8 bg-[#E8D5A3]">
        <div className="flex justify-between items-center mb-6">
          <span className="bg-[#E52521] text-white pixel-font text-[8px] px-3 py-2 rounded-lg border-b-4 border-[#8B1A18] uppercase">
            WORLD {currentIndex + 1}-{questions.length}
          </span>
          <span className="bg-[#049CD8] text-white pixel-font text-[8px] px-3 py-2 rounded-lg border-b-4 border-[#025A80] uppercase">
            {currentQuestion.topic}
          </span>
        </div>

        <div className="text-center mb-10">
           <h3 className="mario-font text-lg md:text-2xl text-[#5C3010] leading-relaxed drop-shadow-sm"
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
          <div className="mb-8 space-y-4">
            <textarea 
              value={userInput} 
              onChange={(e) => setUserInput(e.target.value)} 
              disabled={showFeedback || isEvaluating}
              placeholder="YOUR ANSWER HERE..."
              className={`w-full p-6 text-lg border-4 rounded-xl transition-all resize-none h-32 pixel-font text-[10px] ${
                isInputCorrect === true ? 'border-[#43B047] bg-[#43B047]/10' : isInputCorrect === false ? 'border-[#E52521] bg-[#E52521]/10' : 'border-[#8B6914]/20 bg-white'
              } focus:outline-none focus:border-[#049CD8] text-[#5D2E17] placeholder:text-[#5D2E17]/30 shadow-inner`} 
            />
            {!showFeedback && (
              <div className="flex">
                 <button onClick={handleInputCheck} disabled={!userInput.trim() || isEvaluating} className="w-full bg-[#43B047] border-4 border-[#256B28] text-white pixel-font text-[10px] py-6 shadow-[0_4px_0_#256B28] active:translate-y-1 active:shadow-none transition-all rounded-xl disabled:opacity-50">
                    {isEvaluating ? "CHECKING..." : "CHECK ANSWER!"}
                 </button>
              </div>
            )}
            {showFeedback && aiResult && (
              <div className={`p-6 rounded-2xl border-4 animate-fade-in ${isInputCorrect ? 'bg-[#43B047]/20 border-[#43B047]' : 'bg-[#E52521]/20 border-[#E52521]'}`}>
                 <p className="pixel-font text-[8px] text-[#5D2E17] mb-2">{aiResult.feedback}</p>
                 <p className="pixel-font text-[10px] text-[#5D2E17]">ANSWER: {currentQuestion.correctAnswer}</p>
                 <p className="text-[10px] text-[#5D2E17]/70 font-bold mt-4 italic">{aiResult.explanation}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {shuffledOptions.map((option, idx) => {
              const variant = getButtonVariant(option);
              let bgColor = "bg-white";
              let borderColor = "border-[#8B6914]/20";
              let textColor = "text-[#5D2E17]";
              
              if (variant === 'success') { bgColor = "bg-[#43B047]"; borderColor = "border-[#256B28]"; textColor = "text-white"; }
              else if (variant === 'danger') { bgColor = "bg-[#E52521]"; borderColor = "border-[#8B1A18]"; textColor = "text-white"; }
              else if (variant === 'primary') { bgColor = "bg-[#FBD000]"; borderColor = "border-[#C8980A]"; textColor = "text-[#5D2E17]"; }

              return (
                <button 
                  key={idx} 
                  onClick={() => handleOptionClick(option)} 
                  className={`flex items-center w-full text-left p-5 md:p-6 border-4 rounded-xl transition-all shadow-[0_4px_0_rgba(139,105,20,0.1)] active:translate-y-1 active:shadow-none ${bgColor} ${borderColor} ${textColor}`}
                >
                  <span className={`mr-4 pixel-font text-[8px] ${variant === 'outline' ? 'text-[#049CD8]' : 'text-inherit'}`}>{String.fromCharCode(65 + idx)}.</span>
                  <span className="font-bold text-sm md:text-base leading-relaxed" dangerouslySetInnerHTML={{ __html: option }} />
                </button>
              );
            })}
          </div>
        )}

        {showFeedback && !isInputMode && (
          <div className="mb-8 p-6 bg-[#049CD8]/10 rounded-2xl border-4 border-[#049CD8]/30 animate-fade-in">
             <div className="flex items-center gap-3 mb-3">
               <span className="text-2xl">💡</span>
               <p className="pixel-font text-[8px] text-[#049CD8] uppercase tracking-widest">TIPS & HINTS</p>
             </div>
             <p className="text-[11px] font-bold text-[#5C3010] leading-relaxed">
               {currentQuestion.explanation || "Keep going, Mario!"}
             </p>
          </div>
        )}

        {showFeedback && (
          <div className="flex justify-end mt-6">
             <button onClick={handleNext} className="bg-[#43B047] border-4 border-[#256B28] text-white pixel-font text-[10px] px-8 py-4 shadow-[0_4px_0_#256B28] active:translate-y-1 active:shadow-none transition-all rounded-xl">
               NEXT LEVEL →
             </button>
          </div>
        )}
      </div>
    </div>
  );
};
