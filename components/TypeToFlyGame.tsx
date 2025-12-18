import React, { useState, useEffect, useRef } from 'react';
import { QuestionData } from '../types';
import { Button } from './Button';

interface TypeToFlyGameProps {
  questions: QuestionData[];
  onComplete: (score: number) => void;
}

export const TypeToFlyGame: React.FC<TypeToFlyGameProps> = ({ questions, onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [score, setScore] = useState(0);
  const [birdY, setBirdY] = useState(40); // Percentage from top
  const [isGameOver, setIsGameOver] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const requestRef = useRef<number>(null);
  const velocityRef = useRef(0);
  const gravity = 0.04;
  const lift = -2.5;

  const currentWord = questions[currentIndex]?.questionText || "Ready";

  const animate = (time: number) => {
    if (isGameOver) return;

    velocityRef.current += gravity;
    setBirdY(prev => {
      const nextY = prev + velocityRef.current;
      if (nextY >= 90) {
        setIsGameOver(true);
        return 90;
      }
      if (nextY <= 5) return 5;
      return nextY;
    });

    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (hasStarted && !isGameOver) {
      requestRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [hasStarted, isGameOver]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isGameOver) return;
    if (!hasStarted) setHasStarted(true);

    const val = e.target.value;
    setUserInput(val);

    // If the word is typed correctly
    if (val.toLowerCase().trim() === currentWord.toLowerCase().trim()) {
      // Lift the bird
      velocityRef.current = lift;
      
      // Update score and move to next word
      setScore(s => s + 2);
      setUserInput("");
      
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(i => i + 1);
      } else {
        // Endless loop for now or finish? Let's finish when the list is done
        setTimeout(() => onComplete(score + 2), 500);
      }
    }
  };

  if (isGameOver) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-3xl p-8 shadow-2xl text-center border-4 border-red-100 animate-fade-in">
        <div className="text-6xl mb-4">💥</div>
        <h2 className="text-3xl font-black text-gray-800 mb-2">Game Over!</h2>
        <p className="text-gray-500 mb-6 font-bold">Lần sau gõ nhanh hơn nhé! (Try typing faster next time!)</p>
        <div className="text-4xl font-black text-blue-600 mb-8">{score} pts</div>
        <Button onClick={() => onComplete(score)} fullWidth variant="primary" size="lg">Xem kết quả</Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto w-full">
      {/* Game Area */}
      <div className="relative bg-white/40 backdrop-blur-md rounded-3xl h-[400px] mb-8 overflow-hidden border-4 border-white/50 shadow-inner">
        {/* Clouds decoration */}
        <div className="absolute top-10 left-10 text-4xl opacity-20">☁️</div>
        <div className="absolute top-20 right-20 text-5xl opacity-20">☁️</div>
        <div className="absolute bottom-40 left-1/2 text-3xl opacity-10">☁️</div>

        {/* The Bird */}
        <div 
          className="absolute left-1/2 -translate-x-1/2 transition-transform duration-100 ease-out z-20"
          style={{ top: `${birdY}%`, transform: `translateX(-50%) rotate(${velocityRef.current * 5}deg)` }}
        >
          <div className="text-6xl filter drop-shadow-lg animate-bounce">🐦</div>
          {velocityRef.current < 0 && (
             <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-blue-400 font-black text-xs animate-ping">UP!</div>
          )}
        </div>

        {/* Instructions Overlay */}
        {!hasStarted && (
           <div className="absolute inset-0 flex items-center justify-center bg-blue-900/10 z-30 pointer-events-none">
              <div className="bg-white/90 px-6 py-3 rounded-full shadow-lg font-black text-blue-600 animate-pulse">
                Gõ từ dưới đây để bay cao! (Type to Fly!)
              </div>
           </div>
        )}

        {/* Danger Zone */}
        <div className="absolute bottom-0 w-full h-4 bg-gradient-to-t from-red-500/20 to-transparent"></div>
      </div>

      {/* Typing Interface */}
      <div className="bg-white rounded-3xl p-8 shadow-xl text-center border-b-8 border-gray-100 relative">
        <div className="flex justify-between items-center mb-6">
           <span className="text-xs font-black bg-blue-50 text-blue-500 px-3 py-1 rounded-full uppercase tracking-widest">Score: {score}</span>
           <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{questions[currentIndex]?.topic || "Vocabulary"}</span>
        </div>

        <div className="mb-8 relative inline-block">
          <p className="text-sm font-black text-gray-300 uppercase tracking-[0.3em] mb-2">Type this word:</p>
          <div className="flex justify-center items-center text-5xl md:text-7xl font-black tracking-tight text-gray-800 transition-all">
            {currentWord.split('').map((char, i) => {
              const isTyped = i < userInput.length;
              const isCorrect = isTyped && char.toLowerCase() === userInput[i].toLowerCase();
              return (
                <span 
                  key={i} 
                  className={`transition-colors duration-200 ${isTyped ? (isCorrect ? 'text-blue-600' : 'text-red-500') : 'text-gray-200'}`}
                >
                  {char}
                </span>
              )
            })}
          </div>
          {/* Explanation Tooltip */}
          <div className="mt-4 p-2 bg-blue-50 rounded-lg text-blue-600 font-bold text-xs">
            {questions[currentIndex]?.explanation}
          </div>
        </div>

        <div className="relative max-w-sm mx-auto">
          <input 
            autoFocus
            type="text"
            value={userInput}
            onChange={handleInputChange}
            className="w-full text-center p-4 rounded-xl border-4 border-gray-100 focus:border-blue-500 transition-all text-2xl font-black text-blue-600 uppercase focus:ring-0"
            placeholder="..."
          />
          <div className="absolute -right-12 top-1/2 -translate-y-1/2 hidden md:block">
             <span className="text-3xl animate-bounce">⌨️</span>
          </div>
        </div>

        <p className="mt-6 text-[10px] text-gray-400 font-black uppercase tracking-widest">
           Đừng dừng lại! Trọng lực luôn kéo bạn xuống. (Don't stop! Gravity is constant.)
        </p>
      </div>
    </div>
  );
};