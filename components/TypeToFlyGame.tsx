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
  const [birdY, setBirdY] = useState(50); // Start at center (50%)
  const [isGameOver, setIsGameOver] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const requestRef = useRef<number>(null);
  const velocityRef = useRef(0);
  
  /**
   * PHYSICS ADJUSTMENT:
   * Target: Fall from 50% to 90% (40% distance) in 6 seconds.
   * Time = 6s = 360 frames (at 60fps).
   * Formula: d = 0.5 * gravity * t^2
   * 40 = 0.5 * gravity * 360^2
   * gravity = 80 / 129600 ≈ 0.000617
   */
  const gravity = 0.000617;
  const liftPerWord = -0.4; // Gentler lift impulse as requested
  const maxUpwardVelocity = -1.2;

  const rawTarget = questions[currentIndex]?.questionText || "Ready";
  const currentWord = rawTarget.trim().normalize('NFC');

  const animate = (time: number) => {
    if (isGameOver) return;

    // Smooth gravity application
    velocityRef.current += gravity;
    
    setBirdY(prev => {
      const nextY = prev + velocityRef.current;
      
      // Bottom boundary (Ground)
      if (nextY >= 90) {
        setIsGameOver(true);
        return 90;
      }
      // Top boundary (Sky)
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

    const cleanUser = val.trim().toLowerCase().normalize('NFC');
    const cleanTarget = currentWord.toLowerCase().normalize('NFC');

    if (cleanUser === cleanTarget) {
      // Apply a gentle lift instead of a sharp jump
      velocityRef.current = Math.max(maxUpwardVelocity, velocityRef.current + liftPerWord);
      setScore(s => s + 1);
      setUserInput("");
      
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(i => i + 1);
      } else {
        setTimeout(() => onComplete(score + 1), 400);
      }
    }
  };

  if (isGameOver) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-3xl p-8 shadow-2xl text-center border-4 border-red-100 animate-fade-in">
        <div className="text-6xl mb-4">🍂</div>
        <h2 className="text-3xl font-black text-gray-800 mb-2">Game Over!</h2>
        <p className="text-gray-500 mb-6 font-bold">Bạn đã hạ cánh an toàn. Hãy thử lại để bay xa hơn nhé!</p>
        <div className="text-4xl font-black text-blue-600 mb-8">{score} pts</div>
        <Button onClick={() => onComplete(score)} fullWidth variant="primary" size="lg">Xem kết quả</Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto w-full">
      <style>{`
        @keyframes scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .scenery-layer {
          display: flex;
          width: 200%;
          position: absolute;
          bottom: 0;
          left: 0;
          pointer-events: none;
          white-space: nowrap;
        }
        .scenery-animate {
          animation: scroll linear infinite;
        }
        .layer-far { animation-duration: 30s; opacity: 0.3; }
        .layer-mid { animation-duration: 15s; opacity: 0.6; }
        .layer-near { animation-duration: 8s; z-index: 10; }
        .shake-input { animation: shake 0.5s; }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
      `}</style>

      {/* Game Area - Increased vertical space for movement */}
      <div className="relative bg-gradient-to-b from-sky-400 to-sky-100 backdrop-blur-md rounded-3xl h-[450px] mb-6 overflow-hidden border-4 border-white shadow-2xl">
        
        {/* Layer 1: Distant Mountains */}
        <div className={`scenery-layer layer-far ${hasStarted ? 'scenery-animate' : ''}`}>
           <div className="flex-1 flex items-end justify-around text-8xl pb-6">
              <span>⛰️</span><span>🏔️</span><span>⛰️</span><span>🏔️</span>
           </div>
           <div className="flex-1 flex items-end justify-around text-8xl pb-6">
              <span>⛰️</span><span>🏔️</span><span>⛰️</span><span>🏔️</span>
           </div>
        </div>

        {/* Layer 2: Houses & Landscapes */}
        <div className={`scenery-layer layer-mid ${hasStarted ? 'scenery-animate' : ''}`}>
           <div className="flex-1 flex items-end justify-around text-6xl pb-3">
              <span>🏡</span><span>🌳</span><span>🏠</span><span>🌾</span><span>🏡</span><span>🌳</span>
           </div>
           <div className="flex-1 flex items-end justify-around text-6xl pb-3">
              <span>🏡</span><span>🌳</span><span>🏠</span><span>🌾</span><span>🏡</span><span>🌳</span>
           </div>
        </div>

        {/* Layer 3: Grass & Fences (Closest) */}
        <div className={`scenery-layer layer-near ${hasStarted ? 'scenery-animate' : ''}`}>
           <div className="flex-1 flex items-end justify-around text-3xl pb-1">
              <span>🌿</span><span>🪵</span><span>🌱</span><span>🪵</span><span>🌿</span><span>🌱</span><span>🪵</span>
           </div>
           <div className="flex-1 flex items-end justify-around text-3xl pb-1">
              <span>🌿</span><span>🪵</span><span>🌱</span><span>🪵</span><span>🌿</span><span>🌱</span><span>🪵</span>
           </div>
        </div>

        {/* The Bird: Faces right, looking forward into the oncoming background */}
        <div 
          className="absolute left-[30%] transition-transform duration-200 ease-out z-20 flex flex-col items-center"
          style={{ 
            top: `${birdY}%`, 
            transform: `translateY(-50%) rotate(${velocityRef.current * 10}deg)` 
          }}
        >
          <div className="text-5xl filter drop-shadow-lg select-none scale-x-100">🐤</div>
          {velocityRef.current < 0 && (
             <div className="absolute -bottom-4 text-white font-black text-[8px] uppercase tracking-widest drop-shadow-sm opacity-60">Lift</div>
          )}
        </div>

        {/* Start Prompt Overlay */}
        {!hasStarted && (
           <div className="absolute inset-0 flex items-center justify-center bg-black/10 z-40 backdrop-blur-[2px]">
              <div className="bg-white/90 px-8 py-4 rounded-3xl shadow-xl border-4 border-sky-200 text-sky-600 flex flex-col items-center gap-1">
                <span className="font-black text-xl uppercase tracking-tighter">Study-Fly Typing</span>
                <span className="text-xs font-black opacity-80 uppercase tracking-widest animate-pulse">Gõ phím để bắt đầu</span>
              </div>
           </div>
        )}

        {/* Score Display */}
        <div className="absolute top-6 left-6 z-50">
           <div className="bg-white/80 backdrop-blur-sm px-4 py-1.5 rounded-2xl shadow-md border border-sky-100">
              <span className="text-xs font-black text-sky-600 uppercase tracking-widest">Points: {score}</span>
           </div>
        </div>
      </div>

      {/* Typing Interface - Height reduced by 40% as requested */}
      <div className="bg-white/95 backdrop-blur-lg rounded-[2rem] px-8 py-4 shadow-2xl text-center border-b-8 border-sky-100 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-sky-50 rounded-full opacity-40"></div>

        <div className="relative z-10 flex flex-col items-center gap-2">
          <p className="text-[10px] font-black text-sky-300 uppercase tracking-[0.4em]">Target Word</p>
          
          <div className="flex justify-center items-center text-4xl md:text-5xl font-black tracking-tight text-slate-800 mb-2">
            {currentWord.split('').map((char, i) => {
              const userChar = userInput[i];
              const isTyped = i < userInput.length;
              const isCorrect = isTyped && userChar && char.toLowerCase() === userChar.toLowerCase();
              
              return (
                <span 
                  key={i} 
                  className={`transition-all duration-150 inline-block ${
                    isTyped 
                      ? (isCorrect ? 'text-sky-500' : 'text-rose-500 scale-110') 
                      : 'text-slate-200'
                  }`}
                >
                  {char}
                </span>
              )
            })}
          </div>
          
          <div className="px-4 py-1.5 bg-sky-50 inline-block rounded-xl text-sky-700/70 font-bold text-xs border border-sky-100 shadow-sm max-w-md">
            {questions[currentIndex]?.explanation || "Hãy gõ từ này chính xác!"}
          </div>

          <div className="relative w-full max-w-sm mx-auto mt-2">
            <input 
              autoFocus
              type="text"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              value={userInput}
              onChange={handleInputChange}
              className="w-full text-center p-3 rounded-2xl border-4 border-slate-50 focus:border-sky-300 focus:ring-4 focus:ring-sky-50 transition-all text-2xl font-black text-sky-600 uppercase placeholder:text-slate-100"
              placeholder="..."
            />
          </div>

          <div className="mt-4 flex flex-col items-center gap-1">
             <div className="w-48 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-sky-400 transition-all duration-500"
                  style={{ width: `${((currentIndex) / questions.length) * 100}%` }}
                />
             </div>
             <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                Đừng lo, bạn có nhiều thời gian để gõ!
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};