
import React, { useState, useEffect } from 'react';
import { GradeLevel, GameType, GameSession, GrammarSubSkill } from './types';
import { GRADE_GROUPS, TEXTBOOKS_BY_GRADE, BADGE_LEVELS } from './constants';
import { generateGameContent } from './services/geminiService';
import { Button } from './components/Button';
import { QuizGame } from './components/QuizGame';
import { ResultCard } from './components/ResultCard';
import { ListeningGame } from './components/ListeningGame';
import { SpeakingGame } from './components/SpeakingGame';
import { WritingGame } from './components/WritingGame';
import { TypeToFlyGame } from './components/TypeToFlyGame';

const Icons = {
  Book: () => <svg className="w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
  Badge: () => <svg className="w-6 h-6 mr-1 text-blue-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3L1 9l11 6 9-4.91V17h2V9M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/></svg>,
  Key: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>,
  Close: () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>,
};

const BackgroundDecor = () => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
    <div className="absolute top-[-10%] left-[-10%] w-[30rem] h-[30rem] bg-red-600/20 rounded-full mix-blend-overlay filter blur-[120px] animate-blob"></div>
    <div className="absolute top-[20%] right-[-10%] w-[40rem] h-[40rem] bg-emerald-600/20 rounded-full mix-blend-overlay filter blur-[150px] animate-blob animation-delay-2000"></div>
    <div className="absolute -bottom-32 left-20 w-[35rem] h-[35rem] bg-amber-500/20 rounded-full mix-blend-overlay filter blur-[130px] animate-blob animation-delay-4000"></div>
  </div>
);

const App: React.FC = () => {
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel | null>(null);
  const [selectedGameType, setSelectedGameType] = useState<GameType | null>(null);
  const [selectedSubSkill, setSelectedSubSkill] = useState<GrammarSubSkill | null>(null);
  const [selectedTextbook, setSelectedTextbook] = useState<string>('');
  const [gameData, setGameData] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isQuotaError, setIsQuotaError] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [totalPoints, setTotalPoints] = useState(0);
  const [showBadges, setShowBadges] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");

  useEffect(() => {
    const pts = localStorage.getItem('vieteng_points');
    if (pts) setTotalPoints(parseInt(pts));

    const savedKey = localStorage.getItem('user_gemini_api_key');
    if (savedKey) setApiKeyInput(savedKey);
  }, [finalScore]);

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setApiKeyInput(val);
    localStorage.setItem('user_gemini_api_key', val);
    setIsQuotaError(false);
    setError(null);
  };

  const handleStartGame = async () => {
    if (!apiKeyInput.trim()) {
      setIsQuotaError(true);
      return;
    }

    if (!selectedGrade || !selectedGameType) return;
    
    setLoading(true);
    setError(null);
    setIsQuotaError(false);
    try {
      const data = await generateGameContent(selectedGrade, selectedGameType, selectedTextbook, selectedSubSkill || undefined, apiKeyInput);
      setGameData({
        grade: selectedGrade,
        gameType: selectedGameType,
        subSkill: selectedSubSkill || undefined,
        questions: data.questions,
        textbookContext: data.textbookContext
      });
    } catch (err: any) {
      const msg = err.message || "Unknown error";
      if (msg.includes("QUOTA_EXCEEDED") || msg.includes("429") || msg.includes("entity was not found") || msg.includes("API_KEY_INVALID")) {
        setIsQuotaError(true);
        setError(null);
      } else {
        setError(msg);
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
    setIsQuotaError(false);
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
      default: return <QuizGame {...commonProps} />;
    }
  };

  const currentBadge = BADGE_LEVELS.slice().reverse().find(b => totalPoints >= b.score);

  return (
    <div className="relative min-h-screen font-sans text-gray-100">
      <BackgroundDecor />
      
      {showBadges && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowBadges(false)}></div>
          <div className="relative bg-[#1a2f23] border-4 border-amber-500/50 rounded-[2.5rem] w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-[0_0_50px_rgba(245,158,11,0.3)] animate-fade-in-up flex flex-col">
            <div className="p-8 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-red-900/50 to-emerald-900/50">
              <div>
                <h3 className="text-3xl font-black text-amber-400 tracking-tighter uppercase">Kho Huy Hiệu 🎄</h3>
                <p className="text-white/50 font-bold uppercase text-[10px] tracking-widest mt-1">Your Achievements Journey</p>
              </div>
              <button onClick={() => setShowBadges(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
                <Icons.Close />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-emerald-950/20">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                {BADGE_LEVELS.map((badge) => {
                  const isUnlocked = totalPoints >= badge.score;
                  return (
                    <div key={badge.name} className={`flex flex-col items-center p-6 rounded-3xl transition-all border-2 ${isUnlocked ? 'bg-amber-400/10 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'opacity-20 grayscale border-dashed border-white/10'}`}>
                      <div className="text-5xl mb-3 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">{isUnlocked ? badge.icon : "🔒"}</div>
                      <p className={`font-black text-sm text-center leading-tight ${isUnlocked ? 'text-amber-400' : 'text-white'}`}>{badge.name}</p>
                      <p className="text-[9px] font-bold text-white/40 mt-1 uppercase tracking-tighter">{badge.score} PTS</p>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="p-8 bg-black/40 border-t border-white/10 text-center">
              <p className="text-sm font-bold text-white/70">Bạn đã thắp sáng được <span className="text-amber-400 font-black">{BADGE_LEVELS.filter(b => totalPoints >= b.score).length}</span> / {BADGE_LEVELS.length} ngôi sao 🌟</p>
            </div>
          </div>
        </div>
      )}

      <div className="relative p-2 md:p-8 max-w-7xl mx-auto z-10">
        <header className="flex items-center justify-between mb-8 gap-4 glass-panel p-4 rounded-3xl transition-all duration-500">
           <div className="flex items-center gap-4 flex-1 min-w-0">
              <div 
                className="font-black text-2xl md:text-3xl text-white tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] cursor-pointer whitespace-nowrap shrink-0 hover:scale-105 transition-transform flex items-center gap-2" 
                onClick={handleReset}
              >
                StudyBloom <span className="text-red-500">🎅</span>
              </div>
              
              <div className="flex-1 max-w-sm">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/50 group-focus-within:text-white transition-colors">
                    <Icons.Key />
                  </div>
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={handleApiKeyChange}
                    placeholder="Dán Google API Key..."
                    className="w-full bg-white/5 hover:bg-white/10 focus:bg-white/20 backdrop-blur-xl border-2 border-white/10 focus:border-amber-400 transition-all pl-11 pr-4 py-2.5 rounded-2xl text-white text-sm font-bold placeholder:text-white/30 cursor-text outline-none"
                  />
                </div>
                <div className="mt-1 flex justify-start pl-1">
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-[10px] text-amber-400/60 hover:text-amber-400 font-bold underline decoration-amber-400/30 transition-all">Lấy API key ở đây 🎁</a>
                </div>
              </div>
           </div>

           <div className="flex shrink-0">
              <button onClick={() => setShowBadges(true)} className="glass-panel px-4 py-2 rounded-2xl shadow-xl flex items-center gap-3 border-b-4 border-amber-600/50 hover:bg-white/10 transition-all active:translate-y-1 active:border-b-0">
                {currentBadge ? (
                  <>
                    <span className="text-xl md:text-2xl drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">{currentBadge.icon}</span>
                    <span className={`font-black text-xs md:text-sm hidden sm:inline text-amber-400`}>{currentBadge.name}</span>
                  </>
                ) : (
                  <>
                    <Icons.Badge />
                    <span className="font-black text-xs md:text-sm text-amber-400">Huy hiệu</span>
                  </>
                )}
                <span className="w-px h-5 bg-white/20"></span>
                <span className="font-black text-white text-xs md:text-sm">{totalPoints} pts</span>
              </button>
           </div>
        </header>

        {isQuotaError && (
          <div className="glass-panel rounded-[2.5rem] p-10 md:p-16 shadow-[0_40px_80px_rgba(0,0,0,0.5)] border-4 border-white/10 mb-8 max-w-2xl mx-auto text-center animate-fade-in-up">
             <div className="w-24 h-24 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse shadow-[0_0_30px_rgba(220,38,38,0.4)]">
                <span className="text-5xl">🎄</span>
             </div>
             <h2 className="text-3xl md:text-4xl font-black text-white mb-4 leading-tight tracking-tighter uppercase">
                Giáng sinh bị gián đoạn? ⛄
             </h2>
             <p className="text-white/60 font-bold mb-10 text-lg max-w-md mx-auto leading-relaxed">
                {apiKeyInput 
                  ? "Mã API Key này dường như đã hết lượt sử dụng. Hãy thay một túi quà (API Key) mới để tiếp tục bài học nhé!"
                  : "Để khởi động cỗ xe tuần lộc AI, bạn cần dán mã API Key cá nhân từ Google AI Studio vào ô bên dưới."}
             </p>
             
             <div className="space-y-6">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-white/30 group-focus-within:text-amber-400 transition-colors">
                    <Icons.Key />
                  </div>
                  <input
                    type="text"
                    value={apiKeyInput}
                    onChange={handleApiKeyChange}
                    placeholder="Dán mã tại đây..."
                    className="w-full bg-black/40 focus:bg-black/60 border-4 border-white/5 focus:border-amber-500 transition-all pl-16 pr-6 py-6 rounded-[2rem] text-white text-xl font-black placeholder:text-white/10 outline-none shadow-inner"
                  />
                </div>

                <div className="mt-[-1rem] pb-4">
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-sm font-bold text-amber-400 underline hover:text-amber-300 transition-colors">Lấy túi quà (API Key) ở đây</a>
                </div>

                <Button onClick={handleStartGame} variant="primary" fullWidth size="lg" className="py-6 text-xl shadow-2xl rounded-[2rem] bg-red-600 border-red-800 hover:bg-red-700">
                   Thắp sáng bài học! 🌟
                </Button>
                
                <button onClick={() => setIsQuotaError(false)} className="text-sm font-black text-white/30 uppercase tracking-widest hover:text-white/60 transition-colors">Để sau</button>
             </div>
          </div>
        )}

        <main>
          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
              <div className="relative w-32 h-32 mb-8">
                 <div className="absolute inset-0 border-8 border-white/10 border-t-red-500 rounded-full animate-spin"></div>
                 <div className="absolute inset-4 border-8 border-white/5 border-t-emerald-500 rounded-full animate-spin [animation-direction:reverse]"></div>
                 <div className="absolute inset-0 flex items-center justify-center text-4xl">🦌</div>
              </div>
              <h3 className="text-2xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.4)] mb-2 text-center uppercase tracking-tighter">Tuần lộc đang chở bài học tới...</h3>
              <p className="text-white/40 font-bold text-center">Tuyết đang rơi và AI đang soạn câu hỏi ^.^</p>
            </div>
          ) : (!isQuotaError && !selectedGrade) ? (
            <div className="animate-fade-in space-y-8">
              <div className="text-center space-y-4 mb-12 relative">
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-5xl opacity-80">🔔</div>
                <h1 className="text-6xl md:text-9xl font-black tracking-tighter text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">StudyBloom</h1>
                <p className="text-xs md:text-base text-amber-400 font-black max-w-3xl mx-auto drop-shadow-lg px-4 opacity-90 uppercase tracking-tight whitespace-nowrap">Phần mềm luyện tiếng Anh cho học sinh cấp 2 và 3</p>
              </div>
              
              <div className="grid gap-8">
              {Object.entries(GRADE_GROUPS).map(([groupName, grades]) => (
                <div key={groupName} className="glass-panel rounded-[2.5rem] p-6 md:p-10 shadow-2xl border-t-4 border-t-red-600/50 hover:bg-white/5 transition-all">
                  <h3 className="text-xl md:text-2xl font-black text-white mb-8 flex items-center gap-4">
                    <span className="p-3 rounded-2xl bg-white/5 text-amber-400 shadow-inner"><Icons.Book /></span>
                    {groupName} {groupName.includes('THCS') ? '🌲' : '⛄'}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {grades.map((grade) => (
                      <Button 
                        key={grade} 
                        onClick={() => setSelectedGrade(grade)} 
                        variant="outline" 
                        className="hover:scale-105 transition-all bg-white/5 hover:bg-white/10 border-white/10 text-white text-base md:text-xl font-black h-20 rounded-[1.5rem]"
                      >
                        {grade.replace('Grade ', 'Lớp ')}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
              </div>
            </div>
          ) : (!isQuotaError && !gameData) ? (
            <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
              <Button onClick={() => setSelectedGrade(null)} variant="outline" size="sm" className="bg-white/5 border-white/10 text-white font-bold px-6 hover:bg-white/10">← Trở lại</Button>
              <div className="glass-panel rounded-[2.5rem] p-8 md:p-12 shadow-[0_40px_80px_rgba(0,0,0,0.4)] border-b-8 border-amber-600/30">
                <h2 className="text-3xl md:text-4xl font-black text-white mb-10 tracking-tighter flex items-center gap-4">
                   Lớp học: <span className="text-red-500">{selectedGrade?.replace('Grade ', 'Lớp ')}</span> 🦌
                </h2>
                <div className="grid md:grid-cols-2 gap-10">
                  <div>
                    <label className="block text-amber-400/60 font-black mb-4 uppercase text-[10px] tracking-[0.3em]">Chọn Giáo trình 📚</label>
                    <div className="space-y-3 max-h-72 overflow-y-auto pr-3 custom-scrollbar">
                      <div onClick={() => setSelectedTextbook('')} className={`cursor-pointer p-6 rounded-[2rem] border-2 transition-all ${selectedTextbook === '' ? 'border-amber-500 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.2)]' : 'border-white/5 bg-black/20 hover:border-white/20'}`}>
                        <div className="font-black text-white text-lg">Tổng hợp (General) 🌍</div>
                        <div className="text-xs font-bold text-white/40 mt-1">Ôn tập toàn diện kiến thức bài bản</div>
                      </div>
                      {(parseInt(selectedGrade!.split(' ')[1]) <= 9 ? TEXTBOOKS_BY_GRADE['Secondary'] : TEXTBOOKS_BY_GRADE['High']).map(tb => (
                        <div key={tb} onClick={() => setSelectedTextbook(tb)} className={`cursor-pointer p-6 rounded-[2rem] border-2 transition-all ${selectedTextbook === tb ? 'border-amber-500 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.2)]' : 'border-white/5 bg-black/20 hover:border-white/20'}`}>
                          <div className="font-black text-white text-base">{tb.split('(')[0]}</div>
                          <div className="text-xs font-bold text-white/40 mt-1 italic">{tb.includes('(') ? tb.split('(')[1].replace(')', '') : 'Phiên bản chuẩn'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-amber-400/60 font-black mb-4 uppercase text-[10px] tracking-[0.3em]">Chọn Kỹ năng ✨</label>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.values(GameType).map((type) => (
                        <Button 
                          key={type} 
                          variant={selectedGameType === type ? 'secondary' : 'outline'} 
                          onClick={() => { setSelectedGameType(type); if (type === GameType.Grammar) setSelectedSubSkill(GrammarSubSkill.GrammarQuiz); else setSelectedSubSkill(null); }} 
                          className={`py-8 h-full rounded-[2rem] ${selectedGameType === type ? 'bg-red-600 border-red-800' : 'bg-black/20 border-white/5'}`}
                        >
                          <span className="text-[11px] font-black text-center leading-tight uppercase tracking-tighter">{type.split(' (')[0]}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
                {selectedGameType === GameType.Grammar && (
                  <div className="mt-10 pt-10 border-t border-white/5">
                    <label className="block text-amber-400/60 font-black mb-4 uppercase text-[10px] tracking-[0.3em]">Dạng bài tập chuyên sâu ❄️</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.values(GrammarSubSkill).map((sub) => (
                        <Button 
                          key={sub} 
                          variant={selectedSubSkill === sub ? 'primary' : 'outline'} 
                          size="sm" 
                          onClick={() => setSelectedSubSkill(sub)}
                          className={`rounded-2xl ${selectedSubSkill === sub ? 'bg-emerald-600 border-emerald-800' : 'bg-black/20 border-white/5'}`}
                        >
                          <span className="text-[10px] font-black uppercase tracking-tighter">{sub}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mt-12">
                  <Button 
                    onClick={handleStartGame} 
                    fullWidth 
                    size="lg" 
                    variant="primary" 
                    disabled={!selectedGameType} 
                    className="text-xl shadow-[0_20px_40px_rgba(220,38,38,0.3)] py-8 h-24 rounded-[2rem] bg-red-600 border-red-800 hover:bg-red-700 uppercase tracking-tighter"
                  >
                    Mở hộp quà bài học 🎁
                  </Button>
                </div>
              </div>
            </div>
          ) : (!isQuotaError && finalScore !== null) ? (
            <ResultCard score={finalScore} total={gameData?.gameType === GameType.TypeToFly ? gameData.questions.length : (gameData?.questions.length || 0) * 2} onRetry={() => { setFinalScore(null); }} onHome={handleReset} />
          ) : (
            !isQuotaError && renderGameComponent()
          )}
        </main>
      </div>

      <footer className="text-center text-white/20 mt-16 text-[10px] pb-12 relative z-10 px-4">
        <p className="font-black uppercase tracking-[0.5em] mb-2">StudyBloom 🎄 Holiday Interactive Edition</p>
        <p className="italic underline underline-offset-4 decoration-white/10">Học tập hiệu quả giữa không khí Giáng sinh ấm áp.</p>
      </footer>
    </div>
  );
};

export default App;
