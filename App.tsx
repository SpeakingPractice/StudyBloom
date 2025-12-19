
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
    <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-red-500 rounded-full mix-blend-overlay filter blur-3xl opacity-60 animate-blob"></div>
    <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-green-500 rounded-full mix-blend-overlay filter blur-3xl opacity-60 animate-blob animation-delay-2000"></div>
    <div className="absolute -bottom-32 left-20 w-96 h-96 bg-yellow-400 rounded-full mix-blend-overlay filter blur-3xl opacity-60 animate-blob animation-delay-4000"></div>
    <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-red-400 rounded-full mix-blend-overlay filter blur-3xl opacity-60 animate-blob animation-delay-2000"></div>
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
      // Pass the key to the generator service
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
    <div className="relative min-h-screen overflow-hidden font-sans text-gray-800">
      <BackgroundDecor />
      
      {/* Badge Modal Overlay */}
      {showBadges && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowBadges(false)}></div>
          <div className="relative bg-white/95 rounded-[2.5rem] w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl animate-fade-in-up flex flex-col">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-3xl font-black text-gray-900 tracking-tighter">Kho Huy Hiệu</h3>
                <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest mt-1">Your Achievements Journey</p>
              </div>
              <button onClick={() => setShowBadges(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <Icons.Close />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                {BADGE_LEVELS.map((badge) => {
                  const isUnlocked = totalPoints >= badge.score;
                  return (
                    <div key={badge.name} className={`flex flex-col items-center p-6 rounded-3xl transition-all border-2 ${isUnlocked ? 'bg-blue-50/50 border-blue-100 scale-100' : 'opacity-40 grayscale border-dashed border-gray-200 scale-95'}`}>
                      <div className="text-5xl mb-3 drop-shadow-sm">{isUnlocked ? badge.icon : "🔒"}</div>
                      <p className={`font-black text-sm text-center leading-tight ${badge.color}`}>{badge.name}</p>
                      <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase tracking-tighter">{badge.score} PTS</p>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="p-8 bg-gray-50/50 border-t border-gray-100 text-center">
              <p className="text-sm font-bold text-gray-600">Bạn đã đạt được <span className="text-blue-600 font-black">{BADGE_LEVELS.filter(b => totalPoints >= b.score).length}</span> / {BADGE_LEVELS.length} huy hiệu</p>
            </div>
          </div>
        </div>
      )}

      <div className="relative p-2 md:p-8 max-w-7xl mx-auto z-10">
        <header className="flex items-center justify-between mb-8 gap-4 bg-black/10 backdrop-blur-md p-4 rounded-3xl md:bg-transparent md:p-0 md:rounded-none transition-all duration-500">
           <div className="flex items-center gap-4 flex-1 min-w-0">
              <div 
                className="font-black text-2xl md:text-3xl text-white tracking-tighter drop-shadow-lg cursor-pointer whitespace-nowrap shrink-0 hover:scale-105 transition-transform" 
                onClick={handleReset}
              >
                StudyBloom
              </div>
              
              {/* Ô nhập API Key ĐÃ ĐƯỢC MỞ KHÓA CHO PHÉP NHẬP */}
              <div className="flex-1 max-w-sm">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/50 group-focus-within:text-white transition-colors">
                    <Icons.Key />
                  </div>
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={handleApiKeyChange}
                    placeholder="Dán Google API Key vào đây..."
                    className="w-full bg-white/10 hover:bg-white/20 focus:bg-white/30 backdrop-blur-xl border-2 border-white/20 focus:border-blue-400 transition-all pl-11 pr-4 py-2.5 rounded-2xl text-white text-sm font-bold placeholder:text-white/40 cursor-text outline-none"
                  />
                  {apiKeyInput.length > 5 && (
                    <div className="absolute inset-y-0 right-3 flex items-center">
                      <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.8)]"></div>
                    </div>
                  )}
                </div>
              </div>
           </div>

           <div className="flex shrink-0">
              <button onClick={() => setShowBadges(true)} className="bg-white/95 backdrop-blur-sm px-4 py-2 rounded-2xl shadow-xl flex items-center gap-3 border-b-4 border-gray-200 hover:bg-white transition-all active:translate-y-1 active:border-b-0">
                {currentBadge ? (
                  <>
                    <span className="text-xl md:text-2xl">{currentBadge.icon}</span>
                    <span className={`font-black text-xs md:text-sm hidden sm:inline ${currentBadge.color}`}>{currentBadge.name}</span>
                  </>
                ) : (
                  <>
                    <Icons.Badge />
                    <span className="font-black text-xs md:text-sm text-blue-600">Huy hiệu</span>
                  </>
                )}
                <span className="w-px h-5 bg-gray-200"></span>
                <span className="font-black text-gray-800 text-xs md:text-sm">{totalPoints} pts</span>
              </button>
           </div>
        </header>

        {/* Khung nhập API Key trực quan khi lỗi */}
        {isQuotaError && (
          <div className="bg-white/95 backdrop-blur-2xl rounded-[2.5rem] p-10 md:p-16 shadow-[0_40px_80px_rgba(0,0,0,0.2)] border-4 border-white mb-8 max-w-2xl mx-auto text-center animate-fade-in-up">
             <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
                <span className="text-5xl">🔑</span>
             </div>
             <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4 leading-tight tracking-tighter uppercase">
                {apiKeyInput ? "Lỗi API Key hiện tại" : "Cần nhập API Key"}
             </h2>
             <p className="text-gray-500 font-bold mb-10 text-lg max-w-md mx-auto leading-relaxed">
                {apiKeyInput 
                  ? "Mã này có vẻ đã hết lượt dùng hoặc không hợp lệ. Vui lòng dán một mã khác vào ô bên dưới."
                  : "Để sử dụng trí tuệ nhân tạo Gemini, bạn cần dán mã API Key cá nhân từ Google AI Studio vào ô dưới đây."}
             </p>
             
             <div className="space-y-6">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                    <Icons.Key />
                  </div>
                  <input
                    type="text"
                    value={apiKeyInput}
                    onChange={handleApiKeyChange}
                    placeholder="AIzaSy..."
                    className="w-full bg-gray-50 focus:bg-white border-4 border-gray-100 focus:border-blue-400 transition-all pl-16 pr-6 py-6 rounded-[2rem] text-gray-800 text-xl font-black placeholder:text-gray-300 outline-none shadow-inner"
                  />
                </div>

                <Button onClick={handleStartGame} variant="primary" fullWidth size="lg" className="py-6 text-xl shadow-2xl rounded-[2rem]">
                   Xác nhận và tiếp tục 🚀
                </Button>
                
                <button onClick={() => setIsQuotaError(false)} className="text-sm font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors">Để sau</button>
             </div>

             <div className="mt-8 pt-8 border-t border-gray-100">
               <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-xs font-bold text-blue-500 underline opacity-70 hover:opacity-100">Lấy mã API miễn phí tại đây (Google AI Studio)</a>
             </div>
          </div>
        )}

        {error && !isQuotaError && (
          <div className="bg-red-500/10 backdrop-blur-md border-2 border-red-500/20 text-red-200 p-6 rounded-3xl mb-8 max-w-2xl mx-auto shadow-xl animate-fade-in-up">
             <div className="flex items-start gap-4">
               <span className="text-3xl">⚠️</span>
               <div className="flex-1">
                 <p className="font-black text-lg uppercase tracking-tight mb-1">Hệ thống bận (Service Error)</p>
                 <p className="text-sm font-medium opacity-90 mb-4">{error}</p>
                 <button onClick={() => setError(null)} className="underline text-xs font-black uppercase tracking-widest hover:text-white">Đóng</button>
               </div>
             </div>
          </div>
        )}

        <main>
          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh] animate-pulse">
              <div className="w-24 h-24 border-8 border-white/20 border-t-blue-500 rounded-full animate-spin mb-8 shadow-2xl"></div>
              <h3 className="text-2xl font-black text-white drop-shadow-md mb-2 text-center uppercase tracking-tighter">Đang khởi tạo bài học AI...</h3>
              <p className="text-white/60 font-bold text-center">Chúng mình đang soạn câu hỏi cho bạn ^.^</p>
            </div>
          ) : (!isQuotaError && !selectedGrade) ? (
            <div className="animate-fade-in space-y-8">
              <div className="text-center space-y-4 mb-12">
                <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-white drop-shadow-2xl">StudyBloom</h1>
                <p className="text-lg md:text-2xl text-white font-bold max-w-2xl mx-auto drop-shadow-lg px-4 opacity-90">Phần mềm luyện tiếng Anh bám sát chương trình GDPT mới nhất</p>
              </div>
              {Object.entries(GRADE_GROUPS).map(([groupName, grades]) => (
                <div key={groupName} className="bg-white/10 backdrop-blur-xl rounded-[2.5rem] p-6 md:p-8 shadow-2xl border border-white/20 hover:bg-white/15 transition-all mb-6">
                  <h3 className="text-xl md:text-2xl font-black text-white mb-6 flex items-center">
                    <span className="p-3 rounded-2xl mr-4 bg-white/20 text-white shrink-0"><Icons.Book /></span>{groupName}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {grades.map((grade) => (
                      <Button key={grade} onClick={() => setSelectedGrade(grade)} variant="outline" className="hover:scale-105 transition-all bg-white text-blue-600 border-white text-base md:text-lg font-black h-16">{grade.replace('Grade ', 'Lớp ')}</Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (!isQuotaError && !gameData) ? (
            <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
              <Button onClick={() => setSelectedGrade(null)} variant="outline" size="sm" className="bg-white/20 border-white/30 text-white font-bold px-6">← Quay lại</Button>
              <div className="bg-white/95 backdrop-blur-2xl rounded-[2.5rem] p-8 md:p-12 shadow-[0_40px_80px_rgba(0,0,0,0.2)] border-b-8 border-gray-100">
                <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-8 tracking-tighter">Lớp học: <span className="text-blue-600">{selectedGrade?.replace('Grade ', 'Lớp ')}</span></h2>
                <div className="grid md:grid-cols-2 gap-8 md:gap-12">
                  <div>
                    <label className="block text-gray-400 font-black mb-4 uppercase text-xs tracking-[0.2em]">Chọn Giáo trình</label>
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-3 custom-scrollbar">
                      <div onClick={() => setSelectedTextbook('')} className={`cursor-pointer p-5 rounded-3xl border-2 transition-all ${selectedTextbook === '' ? 'border-blue-500 bg-blue-50 shadow-lg' : 'border-gray-100 bg-white hover:border-blue-200'}`}>
                        <div className="font-black text-gray-900 text-lg">Tổng hợp (General)</div>
                        <div className="text-xs font-bold text-gray-400 mt-1">Ôn tập toàn diện kiến thức lớp {selectedGrade!.split(' ')[1]}</div>
                      </div>
                      {(parseInt(selectedGrade!.split(' ')[1]) <= 9 ? TEXTBOOKS_BY_GRADE['Secondary'] : TEXTBOOKS_BY_GRADE['High']).map(tb => (
                        <div key={tb} onClick={() => setSelectedTextbook(tb)} className={`cursor-pointer p-5 rounded-3xl border-2 transition-all ${selectedTextbook === tb ? 'border-blue-500 bg-blue-50 shadow-lg' : 'border-gray-100 bg-white hover:border-blue-200'}`}>
                          <div className="font-black text-gray-900 text-base">{tb.split('(')[0]}</div>
                          <div className="text-xs font-bold text-gray-400 mt-1 opacity-70 italic">{tb.includes('(') ? tb.split('(')[1].replace(')', '') : 'Phiên bản chuẩn'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-400 font-black mb-4 uppercase text-xs tracking-[0.2em]">Chọn Kỹ năng</label>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.values(GameType).map((type) => (
                        <Button key={type} variant={selectedGameType === type ? 'primary' : 'outline'} onClick={() => { setSelectedGameType(type); if (type === GameType.Grammar) setSelectedSubSkill(GrammarSubSkill.GrammarQuiz); else setSelectedSubSkill(null); }} className="py-6 md:py-8 h-full">
                          <span className="text-xs md:text-sm font-black text-center leading-tight">{type.split(' (')[0]}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
                {selectedGameType === GameType.Grammar && (
                  <div className="mt-8 pt-8 border-t border-gray-100">
                    <label className="block text-gray-400 font-black mb-4 uppercase text-xs tracking-[0.2em]">Dạng bài tập chuyên sâu</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.values(GrammarSubSkill).map((sub) => (
                        <Button key={sub} variant={selectedSubSkill === sub ? 'secondary' : 'outline'} size="sm" onClick={() => setSelectedSubSkill(sub)}>
                          <span className="text-[10px] font-black uppercase">{sub}</span>
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
                    className="text-xl shadow-2xl py-6 h-20 uppercase tracking-tighter"
                  >
                    Bắt đầu học ngay 🚀
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

      <footer className="text-center text-white/50 mt-16 text-xs pb-12 relative z-10 px-4">
        <p className="font-black uppercase tracking-[0.3em] mb-2">StudyBloom Interactive Learning</p>
        <p className="italic underline underline-offset-4 decoration-white/20">Hệ thống AI cá nhân hóa theo từng người học.</p>
      </footer>
    </div>
  );
};

export default App;
