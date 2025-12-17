import React, { useState, useEffect } from 'react';
import { QuestionData, GrammarSubSkill } from '../types';
import { Button } from './Button';

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
  const [showSuggestion, setShowSuggestion] = useState(false);

  const currentQuestion = questions[currentIndex];
  const isInputMode = subSkill === GrammarSubSkill.SentenceTrans;

  // Reset state on question change
  useEffect(() => {
    setSelectedOption(null);
    setShowFeedback(false);
    setUserInput("");
    setIsInputCorrect(null);
    setShowSuggestion(false);
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

  const handleInputCheck = () => {
    if (showFeedback) return;

    const normalize = (s: string) => s.toLowerCase().replace(/[.,!?;:]/g, '').trim().replace(/\s+/g, ' ');
    const user = normalize(userInput);
    const correct = normalize(currentQuestion.correctAnswer || "");
    
    const isCorrect = user === correct;
    setIsInputCorrect(isCorrect);
    setShowFeedback(true);

    if (isCorrect) {
      setScore(prev => prev + 2);
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

  return (
    <div className="max-w-2xl mx-auto w-full">
      {/* Progress Bar */}
      <div className="mb-6 bg-gray-200 rounded-full h-4 overflow-hidden">
        <div 
          className="bg-blue-500 h-full transition-all duration-500 ease-out"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 border-b-8 border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full uppercase">
            Question {currentIndex + 1}/{questions.length}
          </span>
          <span className="text-gray-400 font-bold text-sm">{currentQuestion.topic}</span>
        </div>

        <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-8 leading-relaxed text-center">
          {currentQuestion.questionText}
        </h3>

        {/* RENDER FOR INPUT MODE (Sentence Transformation) */}
        {isInputMode ? (
          <div className="mb-6 space-y-4">
            <textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              disabled={showFeedback}
              placeholder="Type your rewritten sentence here..."
              className={`w-full p-4 text-lg border-2 rounded-xl focus:ring-0 focus:border-blue-500 transition-colors resize-none h-32 ${
                isInputCorrect === true ? 'border-green-500 bg-green-50' : 
                isInputCorrect === false ? 'border-red-500 bg-red-50' : 
                'border-gray-300'
              }`}
            />
            
            {!showFeedback && (
              <div className="flex gap-3">
                 <Button onClick={handleInputCheck} disabled={!userInput.trim()} variant="primary" fullWidth>
                    Kiểm tra (Check)
                 </Button>
                 <Button 
                   onClick={() => setShowSuggestion(true)} 
                   variant="secondary" 
                   className="bg-yellow-500 hover:bg-yellow-600 border-yellow-700"
                 >
                    Gợi ý (Suggest) 💡
                 </Button>
              </div>
            )}

            {showSuggestion && !showFeedback && (
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl animate-fade-in">
                <p className="text-yellow-800 font-bold mb-1">Gợi ý đáp án (Suggested Answer):</p>
                <p className="text-gray-700 italic select-all">{currentQuestion.correctAnswer}</p>
                <p className="text-xs text-yellow-600 mt-2">* Bạn có thể sao chép đáp án này nếu quá khó (You can copy this answer).</p>
              </div>
            )}
            
            {showFeedback && isInputCorrect === false && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-xl">
                 <p className="text-red-700 font-bold">Đáp án đúng (Correct Answer):</p>
                 <p className="text-gray-800 text-lg">{currentQuestion.correctAnswer}</p>
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

        {showFeedback && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 animate-fade-in">
            <p className="font-bold text-blue-800 mb-1">Giải thích (Explanation):</p>
            <p className="text-blue-700">{currentQuestion.explanation}</p>
          </div>
        )}

        <div className="flex justify-end">
          <Button 
            disabled={!showFeedback} 
            onClick={handleNext}
            size="lg"
            variant="secondary"
          >
            {currentIndex === questions.length - 1 ? 'Kết thúc (Finish)' : 'Câu tiếp theo (Next) →'}
          </Button>
        </div>
      </div>
    </div>
  );
};