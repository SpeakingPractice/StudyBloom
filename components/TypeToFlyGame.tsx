
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
  const [lastValidPrefixLen, setLastValidPrefixLen] = useState(0);

  const requestRef = useRef<number>(null);
  const velocityRef = useRef(0);
  
  const gravity = 0.00198; 
  const liftPerWord = -0.315; 
  const maxUpwardVelocity = -1.2;

  const currentQuestion = questions[currentIndex];
  const rawTarget = currentQuestion?.questionText || "Ready";
  const currentWord = rawTarget.trim().normalize('NFC');

  const normalizeForMatch = (str: string) => {
    return str
      .normalize('NFC')
      .toLowerCase()
      .replace(/[^a-z0-9 ]/gi, '') 
      .replace(/\s+/g, ' ') 
      .trim();
  };

  const animate = (time: number) => {
    if (isGameOver) return;
    
    velocityRef.current += gravity;
    
    setBirdY(prev => {
      const nextY = prev + velocityRef.current;
      
      if (nextY >= 90) {
        const audio = new Audio("https://www.myinstants.com/media/sounds/movie_1.mp3");
        audio.play().catch(e => console.log("Audio play blocked", e));
        setIsGameOver(true);
        return 90;
      }
      
      if (nextY <= 3) {
        velocityRef.current = Math.max(0.1, velocityRef.current); 
        return 3;
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

    if (cleanTarget.startsWith(cleanUser)) {
      setLastValidPrefixLen(cleanUser.length);
    } else if (cleanUser.length < lastValidPrefixLen) {
      setLastValidPrefixLen(cleanUser.length);
    }

    if (cleanUser === cleanTarget && cleanTarget.length > 0) {
      velocityRef.current = Math.max(maxUpwardVelocity, liftPerWord);
      
      setScore(s => s + 1);
      setUserInput("");
      setLastValidPrefixLen(0);
      
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
    <div className="max-w-3xl mx-auto w-full px-2">
      <style>{`
        @keyframes scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .scenery-layer { display: flex; width: 200%; position: absolute; bottom: 0; left: 0; pointer-events: none; white-space: nowrap; }
        .scenery-animate { animation: scroll linear infinite; }
        .layer-far { animation-duration: 40s; opacity: 0.3; }
        .layer-mid { animation-duration: 20s; opacity: 0.6; }
        .layer-near { animation-duration: 10s; z-index: 10; }
        
        @keyframes wingFlap {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-45deg); }
        }
        .animate-wing {
          animation: wingFlap 0.15s ease-in-out infinite;
        }
      `}</style>

      {/* Cố định chiều cao game area để mobile keyboard không làm layout nhảy quá nhiều */}
      <div className="relative bg-gradient-to-b from-sky-400 to-sky-100 backdrop-blur-md rounded-3xl h-[180px] md:h-[300px] mb-3 overflow-hidden border-4 border-white shadow-2xl">
        <div className={`scenery-layer layer-far ${hasStarted ? 'scenery-animate' : ''}`}>
           <div className="flex-1 flex items-end justify-around text-6xl pb-8"><span>⛰️</span><span>🏔️</span><span>⛰️</span><span>🏔️</span></div>
           <div className="flex-1 flex items-end justify-around text-6xl pb-8"><span>⛰️</span><span>🏔️</span><span>⛰️</span><span>🏔️</span></div>
        </div>
        <div className={`scenery-layer layer-mid ${hasStarted ? 'scenery-animate' : ''}`}>
           <div className="flex-1 flex items-end justify-around text-4xl pb-4"><span>🏡</span><span>🌳</span><span>🏠</span><span>🌾</span></div>
           <div className="flex-1 flex items-end justify-around text-4xl pb-4"><span>🏡</span><span>🌳</span><span>🏠</span><span>🌾</span></div>
        </div>
        <div className={`scenery-layer layer-near ${hasStarted ? 'scenery-animate' : ''}`}>
           <div className="flex-1 flex items-end justify-around text-2xl pb-1"><span>🌿</span><span>🪵</span><span>🌱</span><span>🌿</span></div>
           <div className="flex-1 flex items-end justify-around text-2xl pb-1"><span>🌿</span><span>🪵</span><span>🌱</span><span>🌿</span></div>
        </div>

        <div className="absolute left-[30%] transition-transform duration-200 ease-out z-50"
          style={{ top: `${birdY}%`, transform: `translateY(-50%) rotate(${velocityRef.current * 20}deg)` }}>
          <div className="relative w-10 h-10 md:w-16 md:h-16 scale-x-[-1]">
            <div className="absolute inset-0 bg-yellow-400 border-[2px] md:border-4 border-black rounded-full shadow-inner"></div>
            <div className="absolute top-[10%] left-[10%] w-[45%] h-[50%] bg-white border-[1px] md:border-[3px] border-black rounded-full flex items-center justify-center">
              <div className="w-[35%] h-[45%] bg-black rounded-full -translate-x-0.5"></div>
            </div>
            <div className="absolute bottom-[20%] -left-[20%] w-[55%] h-[35%] bg-orange-500 border-[1px] md:border-[3px] border-black rounded-full"></div>
            <div className={`absolute top-[35%] right-[5%] w-[45%] h-[40%] bg-white border-[1px] md:border-[3px] border-black rounded-full origin-right ${hasStarted && !isGameOver ? 'animate-wing' : ''}`}></div>
          </div>
        </div>

        {!hasStarted && (
           <div className="absolute inset-0 flex items-center justify-center bg-black/10 z-40 backdrop-blur-[1px]">
              <div className="bg-white/90 px-4 py-2 rounded-xl border-2 border-sky-200 text-sky-600 font-black uppercase text-[10px] tracking-tight animate-pulse shadow-xl">
                Gõ để bắt đầu
              </div>
           </div>
        )}

        <div className="absolute top-3 left-3 z-50 bg-white/70 px-3 py-1 rounded-full text-[9px] font-black text-sky-600 shadow-sm border border-sky-100">
          Pts: {score}
        </div>
      </div>

      {/* Phần điều khiển thu nhỏ cho mobile keyboard */}
      <div className="bg-white rounded-[1.2rem] px-3 py-3 md:py-6 shadow-2xl text-center border-b-6 border-sky-100 max-w-lg mx-auto relative z-20">
        <div className="flex flex-col items-center gap-1.5">
          <p className="text-[9px] font-black text-sky-400/60 uppercase tracking-widest">TARGET WORD</p>
          
          <div className="flex flex-wrap justify-center items-center text-xl md:text-3xl font-black tracking-tight text-slate-800 gap-x-1 mb-2 bg-slate-50/50 p-2 md:p-4 rounded-xl border-2 border-dashed border-sky-100 w-full min-h-[50px]">
            {currentWord.split('').map((char, i) => {
              const userChar = userInput[i];
              const isTyped = i < userInput.length;
              const isCorrect = isTyped && char.toLowerCase() === userChar.toLowerCase();
              
              if (char === ' ') {
                return <span key={i} className="mx-1 bg-sky-200/50 h-5 w-2 rounded-full"></span>;
              }

              return (
                <span 
                  key={i} 
                  className={`inline-block transition-all relative ${
                    isTyped 
                      ? (isCorrect ? 'text-sky-500' : 'text-rose-500 scale-110') 
                      : 'text-slate-300'
                  }`}
                >
                  {char}
                  {!isTyped && <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-slate-200 rounded-full"></span>}
                </span>
              )
            })}
          </div>
          
          <div className="w-full">
            <div className="px-3 py-2 bg-sky-50 rounded-xl border border-sky-100 shadow-inner">
               <div className="flex justify-between items-center mb-0.5">
                 <span className="text-[8px] font-black text-sky-400 uppercase tracking-widest">NGHĨA</span>
                 <div className="flex gap-1.5">
                   {currentQuestion?.wordType && (
                     <span className="bg-blue-600 text-white text-[7px] px-1.5 py-0.5 rounded-full font-black uppercase">
                       {currentQuestion.wordType}
                     </span>
                   )}
                 </div>
               </div>
               <p className="text-sky-800 font-black text-sm md:text-xl leading-tight">
                 {currentQuestion?.explanation || "Học tập vui vẻ!"}
               </p>
            </div>
          </div>

          <input 
            autoFocus 
            type="text" 
            autoComplete="off" 
            autoCorrect="off" 
            autoCapitalize="off" 
            spellCheck="false" 
            value={userInput} 
            onChange={handleInputChange}
            className="w-full text-center p-2 rounded-xl border-2 border-sky-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-100 transition-all text-lg font-black text-sky-600 uppercase mt-2 shadow-inner outline-none"
            placeholder="Type here..." />
          
          <div className="mt-2 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
             <div className="h-full bg-sky-400 transition-all duration-300" style={{ width: `${((currentIndex) / questions.length) * 100}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
};
