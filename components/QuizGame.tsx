
import React, { useState, useEffect } from 'react';
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
  
  // Input mode state
  const [userInput, setUserInput] = useState("");
  const [isInputCorrect, setIsInputCorrect] = useState<boolean | null>(null);
  const [hintCount, setHintCount] = useState(0); 
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [aiResult, setAiResult] = useState<{status: string, feedback: string, explanation: string} | null>(null);

  const currentQuestion = questions[currentIndex];
  const isInputMode = subSkill === GrammarSubSkill.SentenceTrans;

  // Reset state on question change
  useEffect(() => {
    setSelectedOption(null);
    setShowFeedback(false);
    setUserInput("");
    setIsInputCorrect(null);
    setHintCount(0);
    setAiResult(null);
  }, [currentIndex]);

  if (!currentQuestion) return null;

  const handleOptionClick = (option: string) => {
    if (showFeedback) return;
    
    setSelectedOption(option);
    setShowFeedback(true);

    if (option === currentQuestion.correctAnswer) {
      setScore(prev => prev + 2); // 2 points per correct answer
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

      if (correct) {
        setScore(prev => prev + 2);
      }
    } else {
      // Fallback strict check
      const normalize = (s: string) => s.toLowerCase().replace(/[.,!?;:]/g, '').trim().replace(/\s+/g, ' ');
      const user = normalize(userInput);
      const target = normalize(currentQuestion.correctAnswer || "");
      const isMatch = user === target;
      setIsInputCorrect(isMatch);
      setShowFeedback(true);
      if (isMatch) setScore(prev => prev + 2);
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
    if (option === currentQuestion.correctAnswer) return 'primary'; 
    if (option === selectedOption && option !== currentQuestion.correctAnswer) return 'danger';
    return 'outline';
  };

  const getButtonStyle = (option: string) => {
    if (!showFeedback) return "";
    if (option === currentQuestion.correctAnswer) return "!bg-green-500 !border-green-700 !text-white";
    return "";
  };

  const getHintText = () => {
    if (!currentQuestion.correctAnswer) return "";
    const words = currentQuestion.correctAnswer.split(' ');
    // Always start with at least 2 words if requested
    const reveal = Math.max(2, hintCount);
    return words.slice(0, Math.min(words.length, reveal)).join(' ') + "...";
  };

  const handleShowHint = () => {
    if (hintCount === 0) setHintCount(3);
    else setHintCount(prev => prev + 2);
  };

  return (
    <div className="max-w-2xl mx-auto w-full">
      {/* Progress Bar */}
      <div className="mb-6 bg-gray-200/50 backdrop-blur-sm rounded-full h-4 overflow-hidden border border-white/30">
        <div 
          className="bg-blue-500 h-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl p-6 md:p-8 border border-white/50 relative overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <span className="bg-blue-100 text-blue-800 text-xs font-black px-3 py-1 rounded-full uppercase tracking-widest">
            Câu hỏi {currentIndex + 1}/{questions.length}
          </span>
          <span className="text-gray-400 font-bold text-sm tracking-tight">{currentQuestion.topic}</span>
        </div>

        <div className="text-center mb-8">
           <h3 className="text-xl md:text-2xl font-black text-gray-800 leading-relaxed">
            {currentQuestion.questionText}
          </h3>
          {isInputMode && (
            <div className="mt-4 p-4 bg-blue-50 rounded-2xl border-2 border-dashed border-blue-200">
              <p className="text-xs font-black text-blue-400 uppercase tracking-widest mb-1">Bắt đầu bằng (Start with):</p>
              <p className="text-xl font-bold text-blue-700 underline decoration-blue-300 underline-offset-4">
                {currentQuestion.hint || (currentQuestion.correctAnswer?.split(' ').slice(0, 2).join(' ') + "...")}
              </p>
            </div>
          )}
        </div>

        {/* RENDER FOR INPUT MODE (Sentence Transformation) */}
        {isInputMode ? (
          <div className="mb-6 space-y-4">
            <textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              disabled={showFeedback || isEvaluating}
              placeholder="Nhập câu trả lời của bạn tại đây..."
              className={`w-full p-4 text-lg border-2 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all resize-none h-32 font-medium ${
                isInputCorrect === true ? 'border-green-500 bg-green-50/50' : 
                isInputCorrect === false ? 'border-red-500 bg-red-50/50' : 
                'border-gray-100 bg-white/50'
              }`}
            />
            
            {!showFeedback && (
              <div className="flex gap-3">
                 <Button onClick={handleInputCheck} disabled={!userInput.trim() || isEvaluating} variant="primary" fullWidth className="relative">
                    {isEvaluating ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Đang kiểm tra...
                      </span>
                    ) : 'Kiểm tra (Check)'}
                 </Button>
                 <Button 
                   onClick={handleShowHint} 
                   variant="outline" 
                   disabled={isEvaluating}
                   className="bg-yellow-50 border-yellow-200 text-yellow-700 whitespace-nowrap px-4"
                 >
                    Gợi ý (Hint) 💡
                 </Button>
              </div>
            )}

            {hintCount > 0 && !showFeedback && (
              <div className="bg-yellow-50/80 border border-yellow-200 p-4 rounded-xl animate-fade-in shadow-sm">
                <p className="text-yellow-800 font-bold mb-1 text-xs uppercase tracking-wider">Từ tiếp theo gợi ý:</p>
                <p className="text-gray-700 text-lg italic font-medium">{getHintText()}</p>
              </div>
            )}
            
            {showFeedback && aiResult && (
              <div className={`p-6 rounded-2xl border-2 animate-fade-in-up shadow-lg ${
                isInputCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              }`}>
                 <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">
                      {isInputCorrect ? "🌟" : "💡"}
                    </span>
                    <div>
                      <p className={`font-black uppercase text-xs tracking-widest ${
                        isInputCorrect ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {isInputCorrect ? 'Tuyệt vời!' : 'Chưa chính xác'}
                      </p>
                      <p className="text-gray-800 font-bold">{aiResult.feedback}</p>
                    </div>
                 </div>
                 
                 <div className="space-y-4">
                   <div className="bg-white/60 p-4 rounded-xl border border-white">
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter mb-1">Đáp án gợi ý:</p>
                     <p className="text-gray-800 font-bold text-base">{currentQuestion.correctAnswer}</p>
                   </div>
                   
                   <div className="pt-2">
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter mb-1">Giải thích (Simple Explanation):</p>
                     <p className="text-gray-700 text-sm leading-relaxed">{aiResult.explanation}</p>
                   </div>
                 </div>
              </div>
            )}
          </div>
        ) : (
        /* RENDER FOR MULTIPLE CHOICE */
          <div className="grid grid-cols-1 gap-4 mb-6">
            {currentQuestion.options?.map((option, idx) => (
              <Button
                key={idx}
                variant={getButtonVariant(option)}
                className={`text-left justify-start h-auto py-4 px-6 text-lg ${getButtonStyle(option)}`}
                onClick={() => handleOptionClick(option)}
                fullWidth
              >
                {option}
              </Button>
            ))}
          </div>
        )}

        {(showFeedback && !isInputMode) && (
          <div className="bg-white/50 border border-gray-100 rounded-xl p-4 mb-6 animate-fade-in shadow-inner">
            <p className="font-black text-xs text-gray-400 uppercase tracking-widest mb-1">Giải thích (Explanation):</p>
            <p className="text-gray-700 text-sm leading-relaxed italic">{currentQuestion.explanation}</p>
          </div>
        )}

        <div className="flex justify-end gap-3">
          {showFeedback && (
             <Button onClick={handleNext} size="lg" variant="secondary" className="shadow-xl px-10">
               {currentIndex === questions.length - 1 ? 'Kết thúc' : 'Tiếp theo →'}
             </Button>
          )}
        </div>
      </div>
    </div>
  );
};
