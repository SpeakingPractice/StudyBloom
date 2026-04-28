
import React, { useEffect, useState } from 'react';
import { Button } from './Button';
import { MOTIVATIONAL_MESSAGES, BADGE_LEVELS, Badge } from '../constants';

interface ResultCardProps {
  score: number;
  total: number;
  onRetry: () => void;
  onHome: () => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({ score, total, onRetry, onHome }) => {
  const [newBadges, setNewBadges] = useState<Badge[]>([]);
  const [currentTotalScore, setCurrentTotalScore] = useState(0);

  const percentage = Math.round((score / total) * 100);
  
  let message = "";
  if (percentage === 100) message = "Perfect! (Perfect!) 🧧";
  else if (percentage >= 80) message = MOTIVATIONAL_MESSAGES[0];
  else if (percentage >= 60) message = MOTIVATIONAL_MESSAGES[1];
  else message = "Try again! (Try again!) 🐉";

  useEffect(() => {
    // 1. Get previous total
    const prevTotal = parseInt(localStorage.getItem('vieteng_points') || '0');
    
    // 2. Calculate new total
    const newTotal = prevTotal + score;
    setCurrentTotalScore(newTotal);

    // 3. Save to storage
    localStorage.setItem('vieteng_points', newTotal.toString());

    // 4. Check for newly unlocked badges
    // A badge is unlocked if its threshold is between prevTotal (exclusive) and newTotal (inclusive)
    const unlocked = BADGE_LEVELS.filter(b => b.score > prevTotal && b.score <= newTotal);
    
    if (unlocked.length > 0) {
      setNewBadges(unlocked);
    }
  }, [score]);

  return (
    <div className="glass-panel p-8 max-w-md w-full mx-auto text-center border-4 border-[#8B6914] animate-fade-in-up bg-[#E8D5A3]">
      <div className="mb-6">
        <h2 className="pixel-font text-xl text-[#E52521] mt-4 drop-shadow-[2px_2px_0_#8B1A18]">LEVEL COMPLETE!</h2>
        <p className="font-bold text-[10px] text-[#5C3010] mt-2 uppercase tracking-widest">Kết quả bài học</p>
      </div>

      <div className="relative inline-block mb-4 p-6 bg-[#1A1A2E] rounded-2xl border-4 border-[#FBD000] shadow-[0_4px_0_rgba(0,0,0,0.2)]">
         <div className="pixel-font text-3xl text-[#FBD000] drop-shadow-[2px_2px_0_#C8980A]">
            {score}/{total}
         </div>
         <p className="pixel-font text-[8px] text-white/60 mt-4">TOTAL SCORE: {currentTotalScore}</p>
      </div>
      
      <p className="pixel-font text-[10px] text-[#43B047] mb-8 leading-relaxed drop-shadow-[1px_1px_0_#256B28]">{message}</p>

      {/* NEW BADGE UNLOCKED SECTION */}
      {newBadges.length > 0 && (
        <div className="bg-[#1A1A2E] rounded-xl p-6 mb-8 border-4 border-[#FBD000] animate-bounce shadow-lg">
          <p className="pixel-font text-[8px] text-[#FBD000] uppercase mb-4 tracking-widest">🎉 NEW POWER-UP! 🎉</p>
          <div className="space-y-4">
            {newBadges.map(badge => (
              <div key={badge.name} className="flex flex-col items-center">
                <span className="text-6xl mb-2 filter drop-shadow-[0_0_15px_rgba(251,208,0,0.5)]">{badge.icon}</span>
                <span className={`pixel-font text-[10px] ${badge.color}`}>{badge.name}</span>
                <span className="pixel-font text-[7px] text-white/50 mt-2">REACHED {badge.score} PTS</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session Performance Badges (Small) */}
      {percentage === 100 && newBadges.length === 0 && (
        <div className="mb-8">
           <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#43B047] text-white pixel-font text-[8px] shadow-[0_3px_0_#256B28]">
             ⭐ PERFECT CLEAR!
           </span>
        </div>
      )}

      <div className="space-y-4">
        <button onClick={onRetry} className="w-full bg-[#43B047] border-4 border-[#256B28] text-white pixel-font text-[10px] py-6 shadow-[0_4px_0_#256B28] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center rounded-xl">
          PLAY AGAIN
        </button>
        <button onClick={onHome} className="w-full border-4 border-[#8B6914] text-[#8B6914] pixel-font text-[10px] py-6 hover:bg-white/50 transition-all flex items-center justify-center rounded-xl">
          MAIN MENU
        </button>
      </div>
    </div>
  );
};
