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
  const [birdY, setBirdY] = useState(50); 
  const [isGameOver, setIsGameOver] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const requestRef = useRef<number>(null);
  const velocityRef = useRef(0);
  
  /**
   * PHYSICS: 6s fall from center (50%) to ground (90%).
   * gravity ≈ 0.000617
   */
  const gravity = 0.000617;
  const liftPerWord = -0.4; 
  const maxUpwardVelocity = -1.2;

  const rawTarget = questions[currentIndex]?.questionText || "Ready";
  const currentWord = rawTarget.trim().normalize('NFC');

  /**
   * Robust normalization for match verification.
   * Strips case, spaces, and non-alphanumeric junk.
   */
  const normalizeForMatch = (str: string) => {
    return str
      .normalize('NFC')
      .toLowerCase()
      .replace(/[^a-z0-9]/gi, '')
      .trim();
  };

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

    const cleanUser = normalizeForMatch(val);
    const cleanTarget = normalizeForMatch(currentWord);

    if (cleanUser === cleanTarget && cleanTarget.length > 0) {
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
        <p className="text-gray-500 mb-6 font-bold">Hãy thử lại để bay xa hơn nhé!</p>
        <div className="text-4xl font-black text-blue-600 mb-8">{score} pts</div>
        <Button onClick={() => onComplete(score)} fullWidth variant="primary" size="lg">Xem kết quả</Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto w-full">
      <style>{`
        @keyframes scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .scenery-layer { display: flex; width: 200%; position: absolute; bottom: 0; left: 0; pointer-events: none; white-space: nowrap; }
        .scenery-animate { animation: scroll linear infinite; }
        .layer-far { animation-duration: 40s; opacity: 0.3; }
        .layer-mid { animation-duration: 20s; opacity: 0.6; }
        .layer-near { animation-duration: 10s; z-index: 10; }
      `}</style>

      {/* Game Area */}
      <div className="relative bg-gradient-to-b from-sky-400 to-sky-100 backdrop-blur-md rounded-3xl h-[400px] mb-6 overflow-hidden border-4 border-white shadow-2xl">
        <div className={`scenery-layer layer-far ${hasStarted ? 'scenery-animate' : ''}`}>
           <div className="flex-1 flex items-end justify-around text-8xl pb-8"><span>⛰️</span><span>🏔️</span><span>⛰️</span><span>🏔️</span></div>
           <div className="flex-1 flex items-end justify-around text-8xl pb-8"><span>⛰️</span><span>🏔️</span><span>⛰️</span><span>🏔️</span></div>
        </div>
        <div className={`scenery-layer layer-mid ${hasStarted ? 'scenery-animate' : ''}`}>
           <div className="flex-1 flex items-end justify-around text-6xl pb-4"><span>🏡</span><span>🌳</span><span>🏠</span><span>🌾</span></div>
           <div className="flex-1 flex items-end justify-around text-6xl pb-4"><span>🏡</span><span>🌳</span><span>🏠</span><span>🌾</span></div>
        </div>
        <div className={`scenery-layer layer-near ${hasStarted ? 'scenery-animate' : ''}`}>
           <div className="flex-1 flex items-end justify-around text-3xl pb-1"><span>🌿</span><span>🪵</span><span>🌱</span><span>🌿</span></div>
           <div className="flex-1 flex items-end justify-around text-3xl pb-1"><span>🌿</span><span>🪵</span><span>🌱</span><span>🌿</span></div>
        </div>

        <div className="absolute left-[30%] transition-transform duration-200 ease-out z-20"
          style={{ top: `${birdY}%`, transform: `translateY(-50%) rotate(${velocityRef.current * 10}deg)` }}>
          <div className="text-5xl filter drop-shadow-lg select-none">🐤</div>
        </div>

        {!hasStarted && (
           <div className="absolute inset-0 flex items-center justify-center bg-black/10 z-40 backdrop-blur-[1px]">
              <div className="bg-white/90 px-6 py-3 rounded-2xl border-2 border-sky-200 text-sky-600 font-black uppercase text-sm tracking-tight animate-pulse">
                Gõ để bắt đầu
              </div>
           </div>
        )}

        <div className="absolute top-4 left-4 z-50 bg-white/70 px-3 py-1 rounded-full text-[10px] font-black text-sky-600 shadow-sm border border-sky-100">
          Points: {score}
        </div>
      </div>

      {/* Typing Board - Reduced by 30% */}
      <div className="bg-white/95 rounded-[2rem] px-6 py-4 shadow-2xl text-center border-b-8 border-sky-100 max-w-sm mx-auto">
        <div className="flex flex-col items-center gap-1">
          <p className="text-[9px] font-black text-sky-300 uppercase tracking-widest">Target Word</p>
          <div className="flex justify-center items-center text-3xl font-black tracking-tight text-slate-800">
            {currentWord.split('').map((char, i) => {
              const userChar = userInput[i];
              const isTyped = i < userInput.length;
              const isCorrect = isTyped && char.toLowerCase() === userChar.toLowerCase();
              return (
                <span key={i} className={`inline-block ${isTyped ? (isCorrect ? 'text-sky-500' : 'text-rose-500 scale-110') : 'text-slate-200'}`}>
                  {char}
                </span>
              )
            })}
          </div>
          <div className="px-3 py-1 bg-sky-50 rounded-xl text-sky-700/70 font-bold text-[10px] border border-sky-100 mt-1">
            {questions[currentIndex]?.explanation || "Bay cao nào!"}
          </div>
          <input autoFocus type="text" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false" value={userInput} onChange={handleInputChange}
            className="w-full text-center p-2.5 rounded-xl border-2 border-slate-50 focus:border-sky-300 transition-all text-xl font-black text-sky-600 uppercase mt-2"
            placeholder="..." />
          <div className="mt-2 w-40 h-1 bg-slate-100 rounded-full overflow-hidden">
             <div className="h-full bg-sky-400" style={{ width: `${((currentIndex) / questions.length) * 100}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
};