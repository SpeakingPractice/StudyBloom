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
  const [birdY, setBirdY] = useState(50); // Start at middle
  const [isGameOver, setIsGameOver] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const requestRef = useRef<number>(null);
  const velocityRef = useRef(0);
  
  /**
   * PHYSICS CALCULATION:
   * Goal: Fall from middle (50%) to bottom (90%) in 10 seconds.
   * Distance = 40%. Time = 10s = 600 frames at 60fps.
   * Using constant acceleration (gravity): d = 0.5 * a * t^2
   * 40 = 0.5 * gravity * 600^2  => gravity = 80 / 360,000 = 0.000222
   */
  const gravity = 0.000222;
  const liftPerWord = -0.55; // Upward velocity impulse
  const maxUpwardVelocity = -1.2;

  // Clean the target word to avoid invisible char bugs
  const rawTarget = questions[currentIndex]?.questionText || "Ready";
  const currentWord = rawTarget.trim().normalize('NFC');

  const animate = (time: number) => {
    if (isGameOver) return;

    // Apply gravity
    velocityRef.current += gravity;
    
    setBirdY(prev => {
      const nextY = prev + velocityRef.current;
      
      // Bottom boundary check
      if (nextY >= 90) {
        setIsGameOver(true);
        return 90;
      }
      // Top boundary check
      if (nextY <= 5) {
        velocityRef.current = Math.max(0, velocityRef.current);
        return 5;
      }
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

    // Robust comparison: normalize both strings and ignore case/trailing spaces
    const cleanUser = val.trim().toLowerCase().normalize('NFC');
    const cleanTarget = currentWord.toLowerCase().normalize('NFC');

    // If the word is typed correctly
    if (cleanUser === cleanTarget) {
      // Smoother lift: Add to existing upward momentum, capped for feel
      velocityRef.current = Math.max(maxUpwardVelocity, velocityRef.current + liftPerWord);
      
      setScore(s => s + 2);
      setUserInput("");
      
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(i => i + 1);
      } else {
        // Delay slightly for visual feedback before completion
        setTimeout(() => onComplete(score + 2), 400);
      }
    }
  };

  if (isGameOver) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-3xl p-8 shadow-2xl text-center border-4 border-red-100 animate-fade-in">
        <div className="text-6xl mb-4">🍂</div>
        <h2 className="text-3xl font-black text-gray-800 mb-2">Game Over!</h2>
        <p className="text-gray-500 mb-6 font-bold">Hãy gõ nhanh hơn để chú chim bay cao nhé! (Type faster to fly high!)</p>
        <div className="text-4xl font-black text-blue-600 mb-8">{score} pts</div>
        <Button onClick={() => onComplete(score)} fullWidth variant="primary" size="lg">Xem kết quả</Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto w-full">
      {/* Game Area */}
      <div className="relative bg-gradient-to-b from-blue-50/50 to-white/30 backdrop-blur-md rounded-3xl h-[450px] mb-8 overflow-hidden border-4 border-white/50 shadow-inner">
        {/* Decorative background drift */}
        <div className="absolute top-10 left-10 text-4xl opacity-10 animate-pulse">☁️</div>
        <div className="absolute top-24 right-24 text-6xl opacity-10 animate-bounce">☁️</div>
        <div className="absolute bottom-32 left-1/4 text-3xl opacity-5">☁️</div>

        {/* The Bird: Smaller, gently fluttering */}
        <div 
          className="absolute left-1/2 -translate-x-1/2 transition-transform duration-200 ease-out z-20 flex flex-col items-center"
          style={{ 
            top: `${birdY}%`, 
            transform: `translateX(-50%) rotate(${velocityRef.current * 10}deg)` 
          }}
        >
          {/* Bird emoji with flutter animation */}
          <div className="text-4xl filter drop-shadow-md animate-[pulse_1s_infinite] select-none">🐦</div>
          
          {/* Subtle feedback trail for upward lift */}
          {velocityRef.current < 0 && (
             <div className="absolute -bottom-2 text-blue-300 font-black text-[8px] uppercase tracking-widest opacity-60 animate-ping">Lift</div>
          )}
        </div>

        {/* Start Prompt Overlay */}
        {!hasStarted && (
           <div className="absolute inset-0 flex items-center justify-center bg-blue-900/5 z-30 pointer-events-none">
              <div className="bg-white/80 px-8 py-4 rounded-full shadow-lg border border-white/50 text-blue-600 flex flex-col items-center gap-1">
                <span className="font-black text-lg">Flappy Bird (Typing)</span>
                <span className="text-xs font-bold opacity-70 uppercase tracking-widest">Gõ phím để bắt đầu bay</span>
              </div>
           </div>
        )}

        {/* Danger Ground Zone */}
        <div className="absolute bottom-0 w-full h-8 bg-gradient-to-t from-red-400/10 to-transparent"></div>
      </div>

      {/* Typing Interface: Minimal and Focused */}
      <div className="bg-white/90 backdrop-blur-md rounded-3xl p-8 shadow-2xl text-center border-b-8 border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -z-10 opacity-40"></div>
        
        <div className="flex justify-between items-center mb-4">
           <div className="flex items-center gap-2">
              <span className="text-xs font-black bg-blue-100 text-blue-600 px-3 py-1 rounded-full uppercase tracking-tighter">Score: {score}</span>
           </div>
           <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{questions[currentIndex]?.topic || "Vocabulary"}</span>
        </div>

        <div className="mb-6 relative">
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.4em] mb-3">Target Word</p>
          <div className="flex justify-center items-center text-4xl md:text-5xl font-black tracking-tight text-gray-800 transition-all">
            {currentWord.split('').map((char, i) => {
              const userChar = userInput[i];
              const isTyped = i < userInput.length;
              const isCorrect = isTyped && userChar && char.toLowerCase() === userChar.toLowerCase();
              
              return (
                <span 
                  key={i} 
                  className={`transition-all duration-200 ${
                    isTyped 
                      ? (isCorrect ? 'text-blue-600' : 'text-red-500 scale-110 drop-shadow-sm') 
                      : 'text-gray-200'
                  }`}
                >
                  {char}
                </span>
              )
            })}
          </div>
          
          <div className="mt-4 px-4 py-2 bg-blue-50/50 inline-block rounded-xl text-blue-600/70 font-bold text-xs border border-blue-100/50 max-w-sm">
            {questions[currentIndex]?.explanation || "Hãy gõ từ này chính xác!"}
          </div>
        </div>

        <div className="relative max-w-sm mx-auto">
          <input 
            autoFocus
            type="text"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            value={userInput}
            onChange={handleInputChange}
            className="w-full text-center p-5 rounded-2xl border-4 border-gray-100 focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all text-3xl font-black text-blue-600 uppercase placeholder:text-gray-100"
            placeholder="..."
          />
        </div>

        <div className="mt-8 flex flex-col items-center gap-2">
           <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-loose">
              Chú chim đang rơi chậm... Gõ xong 1 từ để nâng cánh!
           </p>
           <div className="w-48 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-400 transition-all duration-300"
                style={{ width: `${((currentIndex) / questions.length) * 100}%` }}
              />
           </div>
        </div>
      </div>
    </div>
  );
};