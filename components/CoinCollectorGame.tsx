import React, { useState, useEffect, useMemo } from 'react';
import { QuestionData } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface CoinCollectorGameProps {
  questions: QuestionData[];
  onComplete: (score: number) => void;
}

export const CoinCollectorGame: React.FC<CoinCollectorGameProps> = ({ questions, onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [showFeedback, setShowFeedback] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isJumping, setIsJumping] = useState(false);
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);
  const [showScorePopup, setShowScorePopup] = useState(false);

  const currentQuestion = questions[currentIndex];

  useEffect(() => {
    if (currentQuestion && currentQuestion.options) {
      setShuffledOptions([...currentQuestion.options].sort(() => Math.random() - 0.5));
    }
  }, [currentIndex, currentQuestion]);

  const handleAnswer = (answer: string) => {
    if (showFeedback) return;
    
    setSelectedAnswer(answer);
    setShowFeedback(true);
    
    const correct = answer === currentQuestion.correctAnswer;
    setIsCorrect(correct);

    if (correct) {
      setScore(s => s + 10);
      setIsJumping(true);
      setShowScorePopup(true);
      setTimeout(() => setIsJumping(false), 600);
      setTimeout(() => setShowScorePopup(false), 800);
    } else {
      setHearts(h => {
        const newHearts = h - 1;
        if (newHearts <= 0) {
          // Restart after short delay
          setTimeout(() => {
            setHearts(3);
            setCurrentIndex(0);
            setScore(0);
            setShowFeedback(false);
            setSelectedAnswer(null);
            setIsCorrect(null);
          }, 1500);
        }
        return newHearts;
      });
    }
  };

  const handleNext = () => {
    setShowFeedback(false);
    setSelectedAnswer(null);
    setIsCorrect(null);
    
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onComplete(score);
    }
  };

  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="max-w-3xl mx-auto w-full flex flex-col items-center">
      {/* HUD */}
      <div className="w-full bg-[#1A1A2E] border-4 border-[#FBD000] p-4 rounded-xl mb-4 flex justify-between items-center z-20">
        <div className="flex items-center gap-2">
          <span className="text-[#FBD000] text-xl">⭐</span>
          <span className="pixel-font text-[#FBD000] text-sm">{score}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[#E52521] text-xl">
            {Array.from({ length: 3 }).map((_, i) => (
              <span key={i} className={i < hearts ? 'opacity-100' : 'opacity-20'}>♥</span>
            ))}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="pixel-font text-[#43B047] text-[10px]">LVL {currentIndex + 1}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-4 bg-black/20 rounded-full overflow-hidden border-2 border-[#8B6914] mb-8">
        <div 
          className="h-full bg-[#FBD000] transition-all duration-500" 
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Game Area */}
      <div className="relative w-full aspect-[4/3] bg-[#5C94FC] rounded-2xl border-8 border-[#8B6914] overflow-hidden flex flex-col items-center p-8">
        {/* Sky Stuff */}
        <div className="absolute top-[10%] left-[10%] w-20 h-8 bg-white/40 rounded-full animate-pulse"></div>
        <div className="absolute top-[20%] right-[15%] w-24 h-10 bg-white/30 rounded-full animate-pulse delay-75"></div>

        {/* Word Box */}
        <div className="relative z-10 w-full max-w-sm">
          <div className="bg-[#8B4513] border-4 border-[#FBD000] p-6 rounded-lg shadow-[0_6px_0_rgba(0,0,0,0.3)] text-center">
            <h2 className="pixel-font text-xl text-white drop-shadow-[2px_2px_0_#5C3010] uppercase tracking-wider">{currentQuestion.questionText}</h2>
          </div>
          <div className="mt-2 text-center">
             <span className="pixel-font text-[9px] text-white/70 uppercase tracking-widest">{currentQuestion.hint}</span>
          </div>
        </div>

        {/* Options (Coins) */}
        <div className="grid grid-cols-2 gap-6 mt-12 w-full max-w-md relative z-10">
          {shuffledOptions.map((opt, idx) => {
            const isSelected = selectedAnswer === opt;
            const isAnswerCorrect = opt === currentQuestion.correctAnswer;
            
            let coinColor = "bg-[#FBD000]";
            let borderColor = "border-[#C8980A]";
            let shadowColor = "shadow-[0_5px_0_#8B6914]";

            if (showFeedback) {
              if (isSelected) {
                if (isCorrect) {
                  coinColor = "bg-[#43B047]";
                  borderColor = "border-[#256B28]";
                  shadowColor = "shadow-[0_5px_0_#174D0F]";
                } else {
                  coinColor = "bg-[#E52521]";
                  borderColor = "border-[#8B1A18]";
                  shadowColor = "shadow-[0_5px_0_#5C0F0C]";
                }
              } else if (isAnswerCorrect) {
                // Flash current correct if user got it wrong
                coinColor = "bg-[#43B047] opacity-60";
                borderColor = "border-[#256B28]";
              }
            }

            return (
              <motion.button
                key={idx}
                whileHover={!showFeedback ? { scale: 1.05 } : {}}
                whileTap={!showFeedback ? { scale: 0.95 } : {}}
                onClick={() => handleAnswer(opt)}
                disabled={showFeedback}
                className={`relative h-24 rounded-lg border-4 transition-all flex items-center justify-center p-4 text-center ${coinColor} ${borderColor} ${shadowColor} ${!isCorrect && isSelected ? 'animate-shake' : ''}`}
              >
                <div className="absolute top-2 right-2 text-black/10 font-black">?</div>
                <span className="pixel-font text-[8px] md:text-[10px] text-[#5C3010] uppercase tracking-tighter leading-tight drop-shadow-sm">
                  {opt}
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* Character */}
        <div className="absolute bottom-[10%] left-1/2 -translate-x-1/2">
           <motion.div 
             animate={isJumping ? { y: -80 } : { y: 0 }}
             transition={{ type: "spring", stiffness: 300, damping: 20 }}
             className="text-6xl filter drop-shadow-lg relative"
           >
             {isCorrect === false ? '💀' : isCorrect === true ? '🎉' : '👨‍🔧'}
             <AnimatePresence>
               {showScorePopup && (
                 <motion.span 
                   initial={{ opacity: 0, y: 0, scale: 0.5 }}
                   animate={{ opacity: 1, y: -40, scale: 1.2 }}
                   exit={{ opacity: 0 }}
                   className="absolute -top-12 left-1/2 -translate-x-1/2 pixel-font text-[#FBD000] text-sm whitespace-nowrap drop-shadow-[0_2px_0_#8B6914]"
                 >
                   +10
                 </motion.span>
               )}
             </AnimatePresence>
           </motion.div>
        </div>

        {/* Ground inside game area */}
        <div className="absolute bottom-0 left-0 w-full h-[15%] flex flex-col">
          <div className="h-4 bg-[#43B047] w-full border-t-2 border-[#256B28]"></div>
          <div className="flex-1 bg-[#E8D5A3] w-full grid grid-cols-8 gap-1 p-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-[#8B4513] border-b-2 border-r-2 border-[#5C3010]"></div>
            ))}
          </div>
        </div>
      </div>

      {/* Next Button */}
      <AnimatePresence>
        {showFeedback && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mt-8 w-full max-w-xs"
          >
            <button 
              onClick={handleNext}
              className="w-full h-16 bg-[#E52521] border-4 border-[#8B1A18] rounded-xl shadow-[0_6px_0_#5C0F0C] active:translate-y-1 active:shadow-none transition-all pixel-font text-white text-xs uppercase tracking-[0.2em]"
            >
              Next Level ▶
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Heart Warning */}
      {hearts <= 0 && (
         <div className="mt-4 text-center">
            <p className="pixel-font text-[#E52521] text-[10px] animate-pulse">GAME OVER! RESTARTING...</p>
         </div>
      )}
    </div>
  );
};
