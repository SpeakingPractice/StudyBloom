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
  if (percentage === 100) message = "Xuất sắc! (Perfect!) 🌟";
  else if (percentage >= 80) message = MOTIVATIONAL_MESSAGES[0];
  else if (percentage >= 60) message = MOTIVATIONAL_MESSAGES[1];
  else message = "Cố gắng hơn nữa nhé! (Try again!) 💪";

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
    <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-md w-full mx-auto text-center border-4 border-blue-100 animate-fade-in-up">
      <div className="mb-6">
        <h2 className="text-3xl font-extrabold text-gray-800 mt-4">Kết Quả</h2>
        <p className="text-gray-500 text-lg">Results</p>
      </div>

      <div className="relative inline-block mb-4">
         <div className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
            {score}/{total}
         </div>
         <p className="text-sm text-gray-400 font-semibold mt-2">Tổng điểm tích lũy: {currentTotalScore}</p>
      </div>
      
      <p className="text-xl text-orange-500 font-bold mb-8">{message}</p>

      {/* NEW BADGE UNLOCKED SECTION */}
      {newBadges.length > 0 && (
        <div className="bg-yellow-50 rounded-xl p-6 mb-8 border-2 border-yellow-200 animate-bounce shadow-lg">
          <p className="text-sm font-black text-yellow-600 uppercase mb-3 tracking-widest">🎉 New Badge Unlocked! 🎉</p>
          <div className="space-y-4">
            {newBadges.map(badge => (
              <div key={badge.name} className="flex flex-col items-center">
                <span className="text-6xl mb-2 filter drop-shadow-md">{badge.icon}</span>
                <span className={`text-xl font-black ${badge.color}`}>{badge.name}</span>
                <span className="text-xs text-gray-500 font-bold">Reached {badge.score} points</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session Performance Badges (Small) */}
      {percentage === 100 && newBadges.length === 0 && (
        <div className="mb-8">
           <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 text-green-700 font-bold text-sm">
             ⭐ Perfect Score Bonus!
           </span>
        </div>
      )}

      <div className="space-y-3">
        <Button onClick={onRetry} fullWidth variant="primary" size="lg">
          Chơi lại (Play Again)
        </Button>
        <Button onClick={onHome} fullWidth variant="outline" size="lg">
          Chọn bài học khác (Home)
        </Button>
      </div>
    </div>
  );
};