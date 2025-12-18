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
  const [birdY, setBirdY] = useState(40); 
  const [isGameOver, setIsGameOver] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const requestRef = useRef<number>(null);
  const velocityRef = useRef(0);
  
  /**
   * PHYSICS UPDATE:
   * Goal: Fall from middle (40%) to bottom (90%) in 7 seconds.
   * Distance = 50%. Time = 7s = 420 frames at 60fps.
   * Formula: d = 0.5 * a * t^2 => 50 = 0.5 * gravity * 420^2
   * gravity = 100 / 176400 ≈ 0.000567
   */
  const gravity = 0.000567;
  const liftPerWord = -0.75; // Stronger lift for higher gravity
  const maxUpwardVelocity = -1.5;

  const rawTarget = questions[currentIndex]?.questionText || "Ready";
  const currentWord = rawTarget.trim().normalize('NFC');

  const animate = (time: number) => {
    if (isGameOver) return;

    velocityRef.current += gravity;
    
    setBirdY(prev => {
      const nextY = prev + velocityRef.current;
      
      if (nextY >= 90) {
        setIsGameOver(true);
        return 90;
      }
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
        <p className="text-gray-500 mb-6 font-bold">Quá nhanh rồi! Hãy gõ lẹ tay hơn nhé! (Too fast! Type quicker!)</p>
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
        .layer-far { animation-duration: 25s; opacity: 0.3; }
        .layer-mid { animation-duration: 12s; opacity: 0.6; }
        .layer-near { animation-duration: 6s; z-index: 10; }
      `}</style>

      {/* Game Area */}
      <div className="relative bg-gradient-to-b from-sky-400 to-sky-100 backdrop-blur-md rounded-3xl h-[400px] mb-8 overflow-hidden border-4 border-white shadow-2xl">
        
        {/* Layer 1: Distant Mountains */}
        <div className={`scenery-layer layer-far ${hasStarted ? 'scenery-animate' : ''}`}>
           <div className="flex-1 flex items-end justify-around text-8xl pb-4">
              <span>⛰️</span><span>🏔️</span><span>⛰️</span><span>🏔️</span>
           </div>
           <div className="flex-1 flex items-end justify-around text-8xl pb-4">
              <span>⛰️</span><span>🏔️</span><span>⛰️</span><span>🏔️</span>
           </div>
        </div>

        {/* Layer 2: Houses & Landscapes */}
        <div className={`scenery-layer layer-mid ${hasStarted ? 'scenery-animate' : ''}`}>
           <div className="flex-1 flex items-end justify-around text-6xl pb-2">
              <span>🏡</span><span>🌳</span><span>🏠</span><span>🌾</span><span>🏡</span><span>🌳</span>
           </div>
           <div className="flex-1 flex items-end justify-around text-6xl pb-2">
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

        {/* The Bird: Positioned slightly left to look like it's flying "into" the screen */}
        <div 
          className="absolute left-[25%] transition-transform duration-200 ease-out z-20 flex flex-col items-center"
          style={{ 
            top: `${birdY}%`, 
            transform: `translateY(-50%) rotate(${velocityRef.current * 15}deg)` 
          }}
        >
          <div className="text-5xl filter drop-shadow-lg select-none">🐤</div>
          {velocityRef.current < 0 && (
             <div className="absolute -bottom-4 text-white font-black text-[9px] uppercase tracking-widest drop-shadow-sm animate-bounce">Wings!</div>
          )}
        </div>

        {/* Start Prompt */}
        {!hasStarted && (
           <div className="absolute inset-0 flex items-center justify-center bg-black/10 z-40 backdrop-blur-[2px]">
              <div className="bg-white/90 px-10 py-5 rounded-3xl shadow-2xl border-4 border-sky-200 text-sky-600 flex flex-col items-center gap-2">
                <span className="font-black text-2xl uppercase tracking-tighter">Quick-Fly Typing</span>
                <span className="text-xs font-black opacity-80 uppercase tracking-[0.3em] animate-pulse">Gõ phím để cất cánh!</span>
              </div>
           </div>
        )}

        {/* Score Overlay */}
        <div className="absolute top-6 left-6 z-50">
           <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-2xl shadow-lg border border-sky-100">
              <span className="text-xs font-black text-sky-600 uppercase tracking-widest">Score: {score}</span>
           </div>
        </div>
      </div>

      {/* Typing Interface */}
      <div className="bg-white/95 backdrop-blur-lg rounded-[2.5rem] p-10 shadow-2xl text-center border-b-[12px] border-sky-100 relative overflow-hidden">
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-sky-50 rounded-full opacity-50"></div>
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-sky-50 rounded-full opacity-50"></div>

        <div className="mb-8 relative z-10">
          <p className="text-[11px] font-black text-sky-300 uppercase tracking-[0.5em] mb-4">Gõ từ dưới đây (Type this word)</p>
          <div className="flex justify-center items-center text-5xl md:text-6xl font-black tracking-tight text-slate-800 mb-6">
            {currentWord.split('').map((char, i) => {
              const userChar = userInput[i];
              const isTyped = i < userInput.length;
              const isCorrect = isTyped && userChar && char.toLowerCase() === userChar.toLowerCase();
              
              return (
                <span 
                  key={i} 
                  className={`transition-all duration-150 inline-block ${
                    isTyped 
                      ? (isCorrect ? 'text-sky-500 scale-95' : 'text-rose-500 scale-125 animate-shake') 
                      : 'text-slate-200'
                  }`}
                >
                  {char}
                </span>
              )
            })}
          </div>
          
          <div className="px-6 py-3 bg-sky-50 inline-block rounded-2xl text-sky-700/80 font-bold text-sm border border-sky-100 shadow-sm max-w-md">
            {questions[currentIndex]?.explanation || "Hãy nhanh tay lên nào!"}
          </div>
        </div>

        <div className="relative max-w-md mx-auto z-10">
          <input 
            autoFocus
            type="text"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            value={userInput}
            onChange={handleInputChange}
            className="w-full text-center p-6 rounded-3xl border-4 border-slate-100 focus:border-sky-400 focus:ring-8 focus:ring-sky-50/50 transition-all text-4xl font-black text-sky-600 uppercase placeholder:text-slate-100"
            placeholder="..."
          />
        </div>

        <div className="mt-10 flex flex-col items-center gap-4 z-10">
           <p className="text-[12px] text-slate-400 font-black uppercase tracking-[0.2em]">
              Bạn chỉ có <span className="text-rose-500">7 giây</span> cho mỗi từ!
           </p>
           <div className="w-64 h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
              <div 
                className="h-full bg-sky-400 transition-all duration-500"
                style={{ width: `${((currentIndex) / questions.length) * 100}%` }}
              />
           </div>
        </div>
      </div>
    </div>
  );
};