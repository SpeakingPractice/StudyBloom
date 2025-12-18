
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
import { TypeToFlyGame } from './components/TypeToFlyGame';
import { SayItRightGame } from './components/SayItRightGame';

// Helper icons
const Icons = {
  Book: () => <svg className="w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
  Badge: () => <svg className="w-6 h-6 mr-1 text-blue-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3L1 9l11 6 9-4.91V17h2V9M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/></svg>,
  Key: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>,
};

const BackgroundDecor = () => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
    <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-red-500 rounded-full mix-blend-overlay filter blur-3xl opacity-60 animate-blob"></div>
    <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-green-500 rounded-full mix-blend-overlay filter blur-3xl opacity-60 animate-blob animation-delay-2000"></div>
    <div className="absolute -bottom-32 left-20 w-96 h-96 bg-yellow-400 rounded-full mix-blend-overlay filter blur-3xl opacity-60 animate-blob animation-delay-4000"></div>
    <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-red-400 rounded-full mix-blend-overlay filter blur-3xl opacity-60 animate-blob animation-delay-2000"></div>
  </div>
);

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState(localStorage.getItem('user_api_key') || '');
  const [showKeyInput, setShowKeyInput] = useState(!localStorage.getItem('user_api_key'));
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

  useEffect(() => {
    const pts = localStorage.getItem('vieteng_points');
    if (pts) setTotalPoints(parseInt(pts));
  }, [finalScore, showBadges]);

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newKey = e.target.value;
    setApiKey(newKey);
    localStorage.setItem('user_api_key', newKey);
    // Hide input once a full key seems to be pasted (typically ~39 chars for AIza...)
    if (newKey.trim().length > 20) {
      setShowKeyInput(false);
    }
  };

  const handleStartGame = async () => {
    if (!selectedGrade || !selectedGameType) return;
    if (!apiKey.trim()) {
      setError("Vui lòng nhập API Key ở ô phía trên trước khi bắt đầu.");
      setShowKeyInput(true);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await generateGameContent(selectedGrade, selectedGameType, selectedTextbook, selectedSubSkill || undefined);
      setGameData({
        grade: selectedGrade,
        gameType: selectedGameType,
        subSkill: selectedSubSkill || undefined,
        questions: data.questions,
        textbookContext: data.textbookContext
      });
    } catch (err: any) {
      const msg = err.message || "Unknown error";
      setError(msg);
      // Re-show input if it's a key/quota related error
      if (msg.includes("API Key") || msg.includes("Quota") || msg.includes("limit") || msg.includes("Requested entity was not found")) {
        setShowKeyInput(true);
      }
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
    const commonProps = { questions: gameData.questions, onComplete: setFinalScore };
    switch (gameData.gameType) {
      case GameType.Listening: return <ListeningGame {...commonProps} />;
      case GameType.Speaking: return <SpeakingGame {...commonProps} />;
      case GameType.Writing: return <WritingGame {...commonProps} grade={gameData.grade} />;
      case GameType.Grammar: return <QuizGame {...commonProps} subSkill={gameData.subSkill} />;
      case GameType.TypeToFly: return <TypeToFlyGame {...commonProps} />;
      case GameType.SayItRight: return <SayItRightGame {...commonProps} />;
      default: return <QuizGame {...commonProps} />;
    }
  };

  const currentBadge = BADGE_LEVELS.slice().reverse().find(b => totalPoints >= b.score);

  return (
    <div className="relative min-h-screen overflow-hidden font-sans text-gray-800">
      <BackgroundDecor />
      
      <div className="relative p-2 md:p-8 max-w-7xl mx-auto z-10">
        <header className="flex items-center justify-between mb-8 gap-2 bg-black/10 backdrop-blur-md p-3 rounded-2xl md:bg-transparent md:p-0 md:rounded-none transition-all duration-500">
           {/* LOGO + API KEY BOX - LEFT SIDE */}
           <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
              <div 
                className="font-black text-lg md:text-xl text-white tracking-tight drop-shadow-md cursor-pointer whitespace-nowrap shrink-0 hover:scale-105 transition-transform" 
                onClick={handleReset}
              >
                StudyBloom
              </div>
              
              {showKeyInput ? (
                <div className="flex flex-col flex-1 max-w-[180px] md:max-w-xs animate-fade-in">
                  <div className="flex items-center bg-white rounded-lg border-2 border-white/20 shadow-lg px-2 py-1 focus-within:ring-2 focus-within:ring-blue-400 transition-all">
                    <span className="text-gray-400 mr-1.5 shrink-0"><Icons.Key /></span>
                    <input 
                      type="password"
                      value={apiKey}
                      onChange={handleApiKeyChange}
                      placeholder="Dán API Key..."
                      className="bg-transparent border-none text-gray-800 text-[10px] md:text-xs font-bold placeholder:text-gray-400 focus:ring-0 w-full outline-none"
                    />
                  </div>
                  <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    className="text-[9px] md:text-[10px] text-white/80 font-bold underline mt-1 ml-1 hover:text-white transition-colors"
                  >
                    Get a free API key here
                  </a>
                </div>
              ) : (
                <div className="group relative flex items-center">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse mr-2 shadow-[0_0_8px_rgba(74,222,128,0.8)]"></div>
                  <span className="text-[10px] font-black text-white/50 uppercase tracking-widest hidden sm:block">AI Link Active</span>
                  <button 
                    onClick={() => setShowKeyInput(true)} 
                    className="ml-2 text-[10px] font-bold text-white/40 hover:text-white/90 transition-colors hidden group-hover:block"
                  >
                    (Edit Key)
                  </button>
                </div>
              )}
           </div>

           {/* BADGE / POINTS - RIGHT SIDE */}
           <div className="flex shrink-0">
              <button onClick={() => setShowBadges(true)} className="bg-white/95 backdrop-blur-sm px-3 py-1.5 md:px-4 md:py-2 rounded-full shadow-lg flex items-center gap-1.5 md:gap-2 border border-white/50 hover:bg-white transition-colors">
                {currentBadge ? (
                  <>
                    <span className="text-lg md:text-xl">{currentBadge.icon}</span>
                    <span className={`font-black text-[10px] md:text-sm hidden sm:inline ${currentBadge.color}`}>{currentBadge.name}</span>
                  </>
                ) : (
                  <>
                    <Icons.Badge />
                    <span className="font-black text-[10px] md:text-sm text-blue-600">Huy hiệu</span>
                  </>
                )}
                <span className="w-px h-3 md:h-4 bg-gray-200 mx-0.5 md:mx-1"></span>
                <span className="font-black text-gray-700 text-[10px] md:text-sm">{totalPoints} <span className="hidden md:inline">pts</span></span>
              </button>
           </div>
        </header>

        {error && (
          <div className="bg-red-100/90 backdrop-blur-sm border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-6 max-w-2xl mx-auto shadow-sm animate-fade-in-up">
             <p className="font-bold">Lỗi (Error)</p>
             <p className="text-sm break-words">{error}</p>
             <button onClick={() => setError(null)} className="underline mt-2 text-xs font-bold">Đóng (Close)</button>
          </div>
        )}

        <main>
          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh] animate-pulse">
              <div className="w-20 h-20 md:w-24 md:h-24 border-8 border-white border-t-blue-500 rounded-full animate-spin mb-8 shadow-2xl"></div>
              <h3 className="text-xl md:text-2xl font-bold text-white drop-shadow-md mb-2 text-center">Đang soạn bài học...</h3>
              <p className="text-white/80 text-center">Bạn đợi một chút để mình chuẩn bị nhé ^.^</p>
            </div>
          ) : !selectedGrade ? (
            <div className="animate-fade-in space-y-8">
              <div className="text-center space-y-4 mb-8 md:mb-12">
                <h1 className="text-4xl md:text-7xl font-extrabold tracking-tight text-white drop-shadow-lg">StudyBloom</h1>
                <p className="text-base md:text-xl text-white font-semibold max-w-2xl mx-auto drop-shadow-md px-4">Web học tiếng anh thông minh dành cho học sinh Cấp 2 & Cấp 3</p>
              </div>
              {Object.entries(GRADE_GROUPS).map(([groupName, grades]) => (
                <div key={groupName} className="bg-white/80 backdrop-blur-md rounded-3xl p-5 md:p-6 shadow-xl border border-white/60 hover:bg-white/90 transition-all mb-4 md:mb-6">
                  <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-4 flex items-center">
                    <span className="p-2 rounded-lg mr-3 bg-blue-100 text-blue-600 shrink-0"><Icons.Book /></span>{groupName}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                    {grades.map((grade) => (
                      <Button key={grade} onClick={() => setSelectedGrade(grade)} variant="outline" className="hover:scale-105 transition-transform bg-white/50 border-white text-sm md:text-base">{grade.replace('Grade ', 'Lớp ')}</Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : !gameData ? (
            <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
              <Button onClick={() => setSelectedGrade(null)} variant="outline" size="sm" className="bg-white/80 border-white text-gray-700">← Quay lại</Button>
              <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-6 md:p-8 shadow-2xl border border-white/50">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">Thiết lập: <span className="text-blue-600">{selectedGrade?.replace('Grade ', 'Lớp ')}</span></h2>
                <div className="grid md:grid-cols-2 gap-6 md:gap-8">
                  <div>
                    <label className="block text-gray-700 font-bold mb-3 uppercase text-[10px] md:text-xs tracking-wider">Giáo trình (Textbook)</label>
                    <div className="space-y-2 max-h-48 md:max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                      <div onClick={() => setSelectedTextbook('')} className={`cursor-pointer p-3 md:p-4 rounded-xl md:rounded-2xl border-2 transition-all ${selectedTextbook === '' ? 'border-blue-500 bg-blue-50/50' : 'border-gray-100 bg-white/50 hover:border-blue-200'}`}>
                        <div className="font-bold text-gray-800 text-base md:text-lg">Tổng hợp (General)</div>
                      </div>
                      {(parseInt(selectedGrade.split(' ')[1]) <= 9 ? TEXTBOOKS_BY_GRADE['Secondary'] : TEXTBOOKS_BY_GRADE['High']).map(tb => (
                        <div key={tb} onClick={() => setSelectedTextbook(tb)} className={`cursor-pointer p-3 md:p-4 rounded-xl md:rounded-2xl border-2 transition-all ${selectedTextbook === tb ? 'border-blue-500 bg-blue-50/50' : 'border-gray-100 bg-white/50 hover:border-blue-200'}`}>
                          <div className="font-bold text-gray-800 text-sm md:text-base">{tb.split('(')[0]}</div>
                          <div className="text-[10px] text-gray-500">{tb.includes('(') ? tb.split('(')[1].replace(')', '') : 'Chuẩn'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-3 uppercase text-[10px] md:text-xs tracking-wider">Kỹ năng (Skill)</label>
                    <div className="grid grid-cols-2 gap-2 md:gap-3">
                      {Object.values(GameType).map((type) => (
                        <Button key={type} variant={selectedGameType === type ? 'primary' : 'outline'} onClick={() => { setSelectedGameType(type); if (type === GameType.Grammar) setSelectedSubSkill(GrammarSubSkill.GrammarQuiz); else setSelectedSubSkill(null); }} className="py-3 md:py-5 h-full">
                          <span className="text-[10px] md:text-sm font-black text-center leading-tight">{type.split(' (')[0]}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-8 pt-6 border-t border-gray-100">
                  <Button onClick={handleStartGame} fullWidth size="lg" variant="secondary" disabled={!selectedGameType} className="text-base md:text-lg shadow-xl py-4">Bắt đầu bài học</Button>
                </div>
              </div>
            </div>
          ) : finalScore !== null ? (
            <ResultCard score={finalScore} total={(gameData.gameType === GameType.SayItRight || gameData.gameType === GameType.TypeToFly) ? gameData.questions.length : gameData.questions.length * 2} onRetry={() => { setFinalScore(null); }} onHome={handleReset} />
          ) : (
            renderGameComponent()
          )}
        </main>
      </div>

      <footer className="text-center text-white/80 mt-12 text-[10px] md:text-sm pb-8 relative z-10 px-4">
        <p>© 2025 StudyBloom. Aligned with MOET English Curriculum.</p>
        <p className="mt-1 opacity-60 italic">Cá nhân hóa việc học bằng sức mạnh AI.</p>
      </footer>
    </div>
  );
};

export default App;
