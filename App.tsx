import React, { useState, useEffect } from 'react';
import { GradeLevel, GameType, GameSession, GrammarSubSkill } from './types';
import { GRADE_GROUPS, TEXTBOOKS_BY_GRADE, BADGE_LEVELS, Badge } from './constants';
import { generateGameContent } from './services/geminiService';
import { Button } from './components/Button';
import { QuizGame } from './components/QuizGame';
import { ResultCard } from './components/ResultCard';
import { ListeningGame } from './components/ListeningGame';
import { SpeakingGame } from './components/SpeakingGame';
import { WritingGame } from './components/WritingGame';

// Helper icons
const Icons = {
  Book: () => <svg className="w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
  Trophy: () => <svg className="w-5 h-5 mr-1 text-yellow-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>,
  Badge: () => <svg className="w-5 h-5 mr-1 text-purple-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>,
  Close: () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
};

// Decorative Background Component
const BackgroundDecor = () => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
    <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-red-500 rounded-full mix-blend-overlay filter blur-3xl opacity-60 animate-blob"></div>
    <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-green-500 rounded-full mix-blend-overlay filter blur-3xl opacity-60 animate-blob animation-delay-2000"></div>
    <div className="absolute -bottom-32 left-20 w-96 h-96 bg-yellow-400 rounded-full mix-blend-overlay filter blur-3xl opacity-60 animate-blob animation-delay-4000"></div>
    <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-red-400 rounded-full mix-blend-overlay filter blur-3xl opacity-60 animate-blob animation-delay-2000"></div>
  </div>
);

const App: React.FC = () => {
  // State
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel | null>(null);
  const [selectedGameType, setSelectedGameType] = useState<GameType | null>(null);
  const [selectedSubSkill, setSelectedSubSkill] = useState<GrammarSubSkill | null>(null);
  const [selectedTextbook, setSelectedTextbook] = useState<string>('');
  const [gameData, setGameData] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [totalPoints, setTotalPoints] = useState(0);
  const [showBadges, setShowBadges] = useState(false);

  // Calculate current rank info
  const currentBadge = BADGE_LEVELS.slice().reverse().find(b => totalPoints >= b.score);
  const nextBadge = BADGE_LEVELS.find(b => totalPoints < b.score);

  // Load points
  useEffect(() => {
    const pts = localStorage.getItem('vieteng_points');
    if (pts) setTotalPoints(parseInt(pts));
  }, [finalScore, showBadges]); // Refresh when score updates or badge modal opens

  // Handlers
  const handleStartGame = async () => {
    if (!selectedGrade || !selectedGameType) return;
    if (selectedGameType === GameType.Grammar && !selectedSubSkill) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await generateGameContent(selectedGrade, selectedGameType, selectedTextbook, selectedSubSkill || undefined);
      
      if (!data || !data.questions || data.questions.length === 0) {
        throw new Error("Không tìm thấy câu hỏi nào. Vui lòng thử lại.");
      }

      setGameData({
        grade: selectedGrade,
        gameType: selectedGameType,
        subSkill: selectedSubSkill || undefined,
        questions: data.questions,
        textbookContext: data.textbookContext
      });
    } catch (err) {
      setError("Có lỗi xảy ra khi tạo bài học. Vui lòng thử lại! (Error generating content)");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedGrade(null);
    setSelectedGameType(null);
    setSelectedSubSkill(null);
    setGameData(null);
    setFinalScore(null);
    setSelectedTextbook('');
    setError(null);
  };

  const renderGameComponent = () => {
    if (!gameData) return null;
    
    const commonProps = {
      questions: gameData.questions,
      onComplete: setFinalScore
    };

    switch (gameData.gameType) {
      case GameType.Listening:
        return <ListeningGame {...commonProps} />;
      case GameType.Speaking:
        return <SpeakingGame {...commonProps} />;
      case GameType.Writing:
        return <WritingGame {...commonProps} grade={gameData.grade} />;
      case GameType.Grammar:
        // Pass subSkill here
        return <QuizGame {...commonProps} subSkill={gameData.subSkill} />;
      default:
        return <QuizGame {...commonProps} />;
    }
  };

  // Badge Modal
  const renderBadgeModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto border border-white/50">
        <button 
          onClick={() => setShowBadges(false)}
          className="absolute top-4 right-4 p-2 bg-gray-100/50 rounded-full hover:bg-gray-200 transition-colors"
        >
          <Icons.Close />
        </button>

        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800">Bộ Sưu Tập Huy Hiệu</h2>
          <p className="text-gray-500">Badge Collection</p>
          <div className="mt-4 bg-blue-50 inline-block px-6 py-2 rounded-full">
            <span className="text-blue-600 font-bold">Total Score: {totalPoints}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {BADGE_LEVELS.map((badge) => {
            const isUnlocked = totalPoints >= badge.score;
            return (
              <div 
                key={badge.name}
                className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all ${
                  isUnlocked 
                    ? 'border-yellow-200 bg-yellow-50/50 shadow-md' 
                    : 'border-gray-100 bg-gray-50/50 grayscale opacity-60'
                }`}
              >
                <span className="text-4xl mb-2">{badge.icon}</span>
                <span className={`font-bold text-sm text-center ${isUnlocked ? badge.color : 'text-gray-400'}`}>
                  {badge.name}
                </span>
                <span className="text-xs text-gray-400 mt-1">{badge.score} pts</span>
                {isUnlocked && <span className="mt-2 text-[10px] uppercase font-bold text-green-600 tracking-wider">Unlocked</span>}
              </div>
            );
          })}
        </div>
        
        {nextBadge && (
           <div className="mt-8 text-center bg-gray-100/50 rounded-xl p-4">
              <p className="text-gray-600 text-sm">Next Badge: <strong>{nextBadge.name}</strong> in {nextBadge.score - totalPoints} points</p>
              <div className="w-full bg-gray-300 h-2 rounded-full mt-2 overflow-hidden">
                <div 
                  className="bg-blue-500 h-full transition-all duration-1000"
                  style={{ width: `${(totalPoints / nextBadge.score) * 100}%` }}
                />
              </div>
           </div>
        )}
      </div>
    </div>
  );

  // Views
  const renderGradeSelection = () => (
    <div className="animate-fade-in space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white drop-shadow-lg">
          StudyBloom
        </h1>
        <p className="text-xl text-white font-semibold max-w-2xl mx-auto drop-shadow-md">
          Web học tiếng anh dành cho học sinh Cấp 2 & Cấp 3
        </p>
      </div>

      {Object.entries(GRADE_GROUPS).map(([groupName, grades]) => (
        <div key={groupName} className="bg-white/80 backdrop-blur-md rounded-3xl p-6 shadow-xl border border-white/60 hover:bg-white/90 transition-all">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <span className="p-2 rounded-lg mr-3 bg-blue-100 text-blue-600">
              <Icons.Book />
            </span>
            {groupName}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {grades.map((grade) => (
              <Button 
                key={grade} 
                onClick={() => setSelectedGrade(grade)}
                variant="outline"
                className="hover:scale-105 transition-transform bg-white/50 border-white hover:border-blue-300"
              >
                {grade.replace('Grade ', 'Lớp ')}
              </Button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const renderConfiguration = () => {
    // Determine which textbooks to show based on selected grade
    let availableTextbooks: string[] = [];
    if (selectedGrade) {
      const gradeNum = parseInt(selectedGrade.split(' ')[1]);
      if (gradeNum >= 6 && gradeNum <= 9) {
        availableTextbooks = TEXTBOOKS_BY_GRADE['Secondary'];
      } else {
        availableTextbooks = TEXTBOOKS_BY_GRADE['High'];
      }
    }

    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        <Button onClick={() => setSelectedGrade(null)} variant="outline" size="sm" className="bg-white/80 border-white text-gray-700">
          ← Quay lại
        </Button>
        
        <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white/50">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">
            Thiết lập bài học: <span className="text-blue-600">{selectedGrade?.replace('Grade ', 'Lớp ')}</span>
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Column 1: Textbook */}
            <div>
              <label className="block text-gray-700 font-bold mb-3 uppercase text-xs tracking-wider">Giáo trình (Textbook)</label>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                <div 
                  onClick={() => setSelectedTextbook('')}
                  className={`cursor-pointer p-3 rounded-xl border-2 transition-all ${selectedTextbook === '' ? 'border-blue-500 bg-blue-50/50' : 'border-gray-100 bg-white/50 hover:border-blue-200'}`}
                >
                  <div className="font-bold text-gray-800">Tổng hợp (General)</div>
                </div>
                {availableTextbooks.map(tb => (
                  <div 
                    key={tb}
                    onClick={() => setSelectedTextbook(tb)}
                    className={`cursor-pointer p-3 rounded-xl border-2 transition-all ${selectedTextbook === tb ? 'border-blue-500 bg-blue-50/50' : 'border-gray-100 bg-white/50 hover:border-blue-200'}`}
                  >
                    <div className="font-bold text-gray-800">{tb.split('(')[0]}</div>
                    <div className="text-xs text-gray-500">{tb.includes('(') ? tb.split('(')[1].replace(')', '') : 'Phiên bản chuẩn'}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 2: Game Mode */}
            <div>
              <label className="block text-gray-700 font-bold mb-3 uppercase text-xs tracking-wider">Kỹ năng (Skill)</label>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {Object.values(GameType).map((type) => (
                  <Button 
                    key={type}
                    variant={selectedGameType === type ? 'primary' : 'outline'} 
                    onClick={() => {
                        setSelectedGameType(type);
                        // Reset subskill if switching away from grammar
                        if (type !== GameType.Grammar) setSelectedSubSkill(null);
                        else setSelectedSubSkill(GrammarSubSkill.GrammarQuiz); // Default
                    }}
                    className="text-sm py-4 h-full"
                  >
                    {type}
                  </Button>
                ))}
              </div>

              {/* Sub-skill Selection for Grammar */}
              {selectedGameType === GameType.Grammar && (
                <div className="animate-fade-in bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                  <label className="block text-blue-800 font-bold mb-3 uppercase text-xs tracking-wider">Loại bài tập (Exercise Type)</label>
                  <select 
                    value={selectedSubSkill || ''}
                    onChange={(e) => setSelectedSubSkill(e.target.value as GrammarSubSkill)}
                    className="w-full p-3 rounded-lg border-2 border-blue-200 focus:border-blue-500 focus:ring-0 bg-white text-gray-800 font-medium"
                  >
                    {Object.values(GrammarSubSkill).map((sub) => (
                        <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100">
            <Button 
              onClick={handleStartGame} 
              fullWidth 
              size="lg" 
              variant="secondary"
              disabled={!selectedGameType}
              className="text-lg shadow-xl"
            >
              Bắt đầu ngay (Start Learning)
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative min-h-screen overflow-hidden font-sans text-gray-800">
      <BackgroundDecor />
      
      <div className="relative p-4 md:p-8 max-w-7xl mx-auto z-10">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
           <div className="font-black text-xl text-white/90 tracking-tight drop-shadow-md">StudyBloom</div>
           <div className="flex gap-2">
              <button 
                onClick={() => setShowBadges(true)}
                className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg flex items-center gap-2 border border-white/50 hover:bg-white transition-colors"
              >
                {currentBadge ? (
                  <>
                    <span className="text-xl">{currentBadge.icon}</span>
                    <span className={`font-bold text-sm hidden sm:inline ${currentBadge.color}`}>{currentBadge.name}</span>
                  </>
                ) : (
                  <Icons.Badge />
                )}
                <span className="w-px h-4 bg-gray-200 mx-1"></span>
                <span className="font-bold text-gray-700 text-sm">{totalPoints} pts</span>
              </button>
           </div>
        </header>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-100/90 backdrop-blur-sm border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-6 max-w-2xl mx-auto shadow-sm animate-bounce">
             <p className="font-bold">Lỗi (Error)</p>
             <p>{error}</p>
             <button onClick={() => setError(null)} className="underline mt-2">Đóng</button>
          </div>
        )}

        <main>
          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh] animate-pulse">
              <div className="w-24 h-24 border-8 border-white border-t-blue-500 rounded-full animate-spin mb-8 shadow-2xl"></div>
              <h3 className="text-2xl font-bold text-white drop-shadow-md mb-2">Đang tạo bài học...</h3>
              <p className="text-white/80">AI đang chuẩn bị nội dung {selectedGameType}</p>
            </div>
          ) : !selectedGrade ? (
            renderGradeSelection()
          ) : !gameData ? (
            renderConfiguration()
          ) : finalScore !== null ? (
            <div className="flex items-center justify-center min-h-[60vh]">
              <ResultCard 
                score={finalScore} 
                total={gameData.questions.length * 2} 
                onRetry={() => { setFinalScore(null); }} 
                onHome={handleReset}
              />
            </div>
          ) : (
            <div className="animate-fade-in">
               <div className="flex items-center justify-between mb-6 max-w-3xl mx-auto">
                 <Button onClick={handleReset} variant="outline" size="sm" className="bg-white/80 border-white shadow-sm">Home</Button>
                 <span className="text-xs bg-white/80 px-3 py-1 rounded-full border border-white/50 shadow-sm text-gray-600 truncate max-w-[200px] backdrop-blur-sm">
                    {gameData.textbookContext} {gameData.subSkill ? `- ${gameData.subSkill}` : ''}
                 </span>
               </div>
               {renderGameComponent()}
            </div>
          )}
        </main>
      </div>

      <footer className="text-center text-white/80 mt-12 text-sm pb-4 relative z-10 drop-shadow-sm">
        <p>© 2025 StudyBloom. Aligned with MOET Curriculum.</p>
      </footer>

      {showBadges && renderBadgeModal()}
    </div>
  );
};

export default App;