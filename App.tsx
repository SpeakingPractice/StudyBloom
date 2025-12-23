
import React, { useState, useEffect, useRef } from 'react';
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
  Badge: () => <svg className="w-6 h-6 mr-1 text-yellow-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3L1 9l11 6 9-4.91V17h2V9M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/></svg>,
  Key: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>,
  Close: () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>,
  Check: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
  Mail: () => <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v10a2 2 0 002 2z" /></svg>,
  Send: () => <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>,
};

const BackgroundDecor = () => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
    <div className="absolute top-[-10%] left-[-10%] w-[30rem] h-[30rem] bg-yellow-400/5 rounded-full mix-blend-overlay filter blur-[120px] animate-blob"></div>
    <div className="absolute top-[20%] right-[-10%] w-[40rem] h-[40rem] bg-yellow-500/5 rounded-full mix-blend-overlay filter blur-[150px] animate-blob animation-delay-2000"></div>
  </div>
);

const LetterFlower = () => (
  <span className="inline-block align-middle mx-[-0.08em] relative top-[0.12em] title-flower">
    <svg viewBox="0 0 100 100" className="w-[0.6em] h-[0.6em] drop-shadow-[0_0_8px_rgba(255,215,0,0.6)]">
      <circle cx="50" cy="25" r="22" fill="#FFEA00" />
      <circle cx="75" cy="42" r="22" fill="#FFEA00" />
      <circle cx="65" cy="72" r="22" fill="#FFEA00" />
      <circle cx="35" cy="72" r="22" fill="#FFEA00" />
      <circle cx="25" cy="42" r="22" fill="#FFEA00" />
      <circle cx="50" cy="50" r="15" fill="#FF8C00" />
      <circle cx="50" cy="50" r="10" fill="#FF7000" opacity="0.6" />
    </svg>
  </span>
);

const BanhChung = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={`w-11 h-11 drop-shadow-xl ${className}`}>
    <defs>
      <linearGradient id="banhChungGreen" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#2e7d32" />
        <stop offset="100%" stopColor="#1b5e20" />
      </linearGradient>
    </defs>
    {/* Vỏ bánh */}
    <rect x="5" y="5" width="90" height="90" rx="6" fill="url(#banhChungGreen)" stroke="#0d3311" strokeWidth="1" />
    {/* Lạt buộc */}
    <rect x="5" y="32" width="90" height="4" fill="#f1f8e9" opacity="0.8" />
    <rect x="5" y="64" width="90" height="4" fill="#f1f8e9" opacity="0.8" />
    <rect x="32" y="5" width="4" height="90" fill="#f1f8e9" opacity="0.8" />
    <rect x="64" y="5" width="4" height="90" fill="#f1f8e9" opacity="0.8" />
    {/* Nhãn đỏ trung tâm */}
    <g transform="rotate(45 50 50)">
      <rect x="28" y="28" width="44" height="44" fill="#d32f2f" />
      <rect x="30" y="30" width="40" height="40" fill="none" stroke="#ffd54f" strokeWidth="1" />
    </g>
    {/* Chữ TẾT 2026 */}
    <text x="50" y="47" textAnchor="middle" fill="#ffd54f" fontSize="13" fontWeight="900" style={{ fontFamily: 'sans-serif' }}>TẾT</text>
    <text x="50" y="62" textAnchor="middle" fill="#ffd54f" fontSize="11" fontWeight="900" style={{ fontFamily: 'sans-serif' }}>2026</text>
    {/* Hoa mai nhỏ trang trí góc */}
    <circle cx="82" cy="18" r="6" fill="#ffea00" />
    <circle cx="82" cy="18" r="2.5" fill="#ff8f00" />
  </svg>
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
  const [isVerifyingKey, setIsVerifyingKey] = useState(false);
  const [keyVerificationStatus, setKeyVerificationStatus] = useState<'none' | 'success' | 'fail'>('none');

  useEffect(() => {
    const pts = localStorage.getItem('vieteng_points');
    if (pts) setTotalPoints(parseInt(pts));

    const savedKey = localStorage.getItem('user_gemini_api_key');
    if (savedKey) {
      setApiKeyInput(savedKey);
      setKeyVerificationStatus('success');
    }
  }, [finalScore]);

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setApiKeyInput(val);
    setKeyVerificationStatus('none');
    localStorage.setItem('user_gemini_api_key', val);
    setIsQuotaError(false);
    setError(null);
  };

  const handleVerifyKey = async () => {
    if (!apiKeyInput.trim()) return;
    setIsVerifyingKey(true);
    setKeyVerificationStatus('none');
    
    try {
      await generateGameContent(GradeLevel.Grade6, GameType.Grammar, "", GrammarSubSkill.GrammarQuiz, apiKeyInput);
      setKeyVerificationStatus('success');
      setIsQuotaError(false);
    } catch (err: any) {
      setKeyVerificationStatus('fail');
      setIsQuotaError(true);
    } finally {
      setIsVerifyingKey(false);
    }
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
      setKeyVerificationStatus('success');
    } catch (err: any) {
      const msg = err.message || "Unknown error";
      if (msg.includes("QUOTA_EXCEEDED") || msg.includes("429") || msg.includes("entity was not found") || msg.includes("API_KEY_INVALID")) {
        setIsQuotaError(true);
        setError(null);
        setKeyVerificationStatus('fail');
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

  const handleRetry = () => {
    setFinalScore(null);
    setGameData(null);
    handleStartGame();
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

  const calculateTotalPossibleScore = () => {
    if (!gameData) return 0;
    const count = gameData.questions.length || 0;
    switch (gameData.gameType) {
      case GameType.Writing: return count * 10;
      case GameType.TypeToFly: return count;
      default: return count * 2;
    }
  };

  const currentBadge = BADGE_LEVELS.slice().reverse().find(b => totalPoints >= b.score);

  return (
    <div className="relative min-h-screen font-sans text-gray-100">
      <BackgroundDecor />
      
      {showBadges && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowBadges(false)}></div>
          <div className="relative bg-[#3d0d0d] border-4 border-yellow-500/50 rounded-[2.5rem] w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-[0_0_50px_rgba(255,183,3,0.3)] animate-fade-in-up flex flex-col">
            <div className="p-8 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-red-900/50 to-orange-900/50">
              <div>
                <h3 className="text-3xl font-black text-yellow-400 tracking-tighter uppercase">Kho Huy Hiệu 🏮</h3>
                <p className="text-white/50 font-bold uppercase text-[10px] tracking-widest mt-1">Your Achievements Journey</p>
              </div>
              <button onClick={() => setShowBadges(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"><Icons.Close /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-red-950/20">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                {BADGE_LEVELS.map((badge) => {
                  const isUnlocked = totalPoints >= badge.score;
                  return (
                    <div key={badge.name} className={`flex flex-col items-center p-6 rounded-3xl transition-all border-2 ${isUnlocked ? 'bg-yellow-400/10 border-yellow-500/30 shadow-[0_0_15px_rgba(255,183,3,0.2)]' : 'opacity-20 grayscale border-dashed border-white/10'}`}>
                      <div className="text-5xl mb-3 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">{isUnlocked ? badge.icon : "🔒"}</div>
                      <p className={`font-black text-sm text-center leading-tight ${isUnlocked ? 'text-yellow-400' : 'text-white'}`}>{badge.name}</p>
                      <p className="text-[9px] font-bold text-white/40 mt-1 uppercase tracking-tighter">{badge.score} PTS</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="relative p-2 md:p-8 max-w-7xl mx-auto z-10">
        <header className="flex flex-col md:flex-row items-stretch md:items-center mb-8 gap-4 glass-panel p-4 rounded-[2rem] md:rounded-3xl transition-all duration-500 md:justify-between">
           <div className="flex items-center justify-between w-full md:w-auto gap-4 shrink-0">
              <div className="font-black text-2xl md:text-3xl text-white tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] cursor-pointer whitespace-nowrap hover:scale-105 transition-transform flex items-center gap-2" onClick={handleReset}>
                StudyBloom <span className="text-yellow-500">🧧</span>
              </div>
              <div className="flex md:hidden shrink-0">
                <button onClick={() => setShowBadges(true)} className="flex items-center gap-2 transition-all active:scale-90 px-2 py-1">
                  <span className="text-2xl drop-shadow-[0_0_8px_rgba(255,183,3,0.8)]">{currentBadge?.icon || "🧭"}</span>
                  <span className="font-black text-white text-[10px] tracking-tighter drop-shadow-md">{totalPoints} pts</span>
                </button>
              </div>
           </div>

           {keyVerificationStatus !== 'success' && (
             <div className="w-full md:flex-1 md:max-w-md order-3 md:order-2 flex flex-col items-center animate-fade-in relative pb-8">
                <div className="relative flex items-center group w-full">
                  <div className="absolute left-3 flex items-center pointer-events-none text-white/30 group-focus-within:text-yellow-400 transition-colors"><Icons.Key /></div>
                  <input type="password" value={apiKeyInput} onChange={handleApiKeyChange} placeholder="Dán Google API Key..." className={`w-full bg-white/5 hover:bg-white/10 focus:bg-white/20 backdrop-blur-xl border-2 transition-all pl-11 pr-28 md:pr-24 py-3 rounded-2xl text-yellow-400 text-sm font-black placeholder:text-white/30 cursor-text outline-none ${keyVerificationStatus === 'fail' ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'border-white/10'}`} />
                  <button onClick={handleVerifyKey} disabled={isVerifyingKey || !apiKeyInput} className={`absolute right-1 px-4 py-2 rounded-xl font-black text-[11px] uppercase tracking-tighter transition-all flex items-center justify-center min-w-[80px] ${keyVerificationStatus === 'fail' ? 'bg-red-500 text-white' : 'bg-yellow-500 hover:bg-yellow-600 text-black'} disabled:opacity-50 active:scale-95`}>
                    {isVerifyingKey ? <div className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin"></div> : keyVerificationStatus === 'success' ? <Icons.Check /> : 'Xác nhận'}
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-[10px] text-yellow-500/70 hover:text-yellow-400 font-black uppercase tracking-widest transition-colors flex items-center gap-1">
                    Lấy API key ở đây <span className="text-xs">🔑</span>
                  </a>
                </div>
                {/* Trang trí chân khung nhập liệu */}
                <div className="absolute -bottom-14 left-0 w-full flex justify-between items-end px-2 pointer-events-none">
                  {/* Lồng đèn trái */}
                  <div className="flex flex-col items-center">
                    <div className="w-px h-5 bg-yellow-600/60"></div>
                    <span className="text-2xl lantern-sway -mt-1">🏮</span>
                  </div>

                  {/* 2 Bánh chưng SVG xếp chồng như hình mẫu - Di chuyển lên trên 1 chút bằng mb-2 */}
                  <div className="relative w-20 h-16 flex items-center justify-center mb-2">
                    <BanhChung className="absolute left-0 top-1 transform rotate-[-12deg] z-10" />
                    <BanhChung className="absolute right-0 bottom-0 transform rotate-[6deg] scale-105 z-20" />
                  </div>

                  {/* Lồng đèn phải */}
                  <div className="flex flex-col items-center">
                    <div className="w-px h-5 bg-yellow-600/60"></div>
                    <span className="text-2xl lantern-sway -mt-1">🏮</span>
                  </div>
                </div>
             </div>
           )}

           <div className="hidden md:flex shrink-0 order-3">
              <button onClick={() => setShowBadges(true)} className="glass-panel px-5 py-2.5 rounded-2xl shadow-[0_10px_30px_rgba(255,183,3,0.2)] flex items-center gap-3 border-b-4 border-yellow-600/50 hover:bg-white/10 transition-all active:translate-y-1 active:border-b-0 group">
                {currentBadge ? (<><span className="text-xl md:text-2xl drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] group-hover:scale-110 transition-transform">{currentBadge.icon}</span><span className={`font-black text-xs md:text-sm text-yellow-400`}>{currentBadge.name}</span></>) : (<><Icons.Badge /><span className="font-black text-xs md:text-sm text-yellow-400">Huy hiệu</span></>)}
                <span className="w-px h-5 bg-white/20"></span>
                <span className="font-black text-white text-xs md:text-sm">{totalPoints} pts</span>
              </button>
           </div>
        </header>

        <main>
          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
              <div className="relative w-24 h-24 md:w-32 md:h-32 mb-8">
                 <div className="absolute inset-0 border-8 border-white/10 border-t-yellow-500 rounded-full animate-spin"></div>
                 <div className="absolute inset-0 flex items-center justify-center text-3xl md:text-4xl">🐉</div>
              </div>
              <h3 className="text-xl md:text-2xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.4)] mb-2 text-center uppercase tracking-tighter">Đang bày mâm ngũ quả...</h3>
            </div>
          ) : (!isQuotaError && !selectedGrade) ? (
            <div className="animate-fade-in space-y-8">
              <div className="text-center space-y-4 mb-12 relative flex flex-col items-center">
                <div className="relative inline-block mt-8">
                  <h1 className="text-5xl md:text-9xl font-black tracking-tighter text-white drop-shadow-[0_10px_50px_rgba(255,215,0,0.3)] relative z-10 flex items-center justify-center">
                    StudyBl<LetterFlower /><LetterFlower />m
                  </h1>
                </div>

                <p className="text-[10px] md:text-base text-yellow-400 font-black max-w-3xl mx-auto drop-shadow-lg px-4 uppercase tracking-tight whitespace-nowrap mt-4">
                  Khai bút đầu xuân cùng Tiếng Anh Cấp 2-3
                </p>
              </div>
              <div className="grid gap-8">
              {Object.entries(GRADE_GROUPS).map(([groupName, grades]) => (
                <div key={groupName} className="glass-panel rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 shadow-2xl border-t-4 border-t-yellow-600/50 hover:bg-white/5 transition-all">
                  <h3 className="text-lg md:text-2xl font-black text-white mb-6 md:mb-8 flex items-center gap-4"><span className="p-2 md:p-3 rounded-2xl bg-white/5 text-yellow-400 shadow-inner"><Icons.Book /></span>{groupName} 🌸</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                    {grades.map((grade) => (
                      <Button key={grade} onClick={() => setSelectedGrade(grade)} variant="outline" className="hover:scale-105 transition-all bg-white/5 hover:bg-white/10 border-white/10 text-white text-sm md:text-xl font-black h-16 md:h-20 rounded-[1.2rem] md:rounded-[1.5rem]">{grade.replace('Grade ', 'Lớp ')}</Button>
                    ))}
                  </div>
                </div>
              ))}
              </div>
            </div>
          ) : (!isQuotaError && !gameData) ? (
            <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
              <Button onClick={() => setSelectedGrade(null)} variant="outline" size="sm" className="bg-white/5 border-white/10 text-white font-bold px-6 hover:bg-white/10 rounded-xl">← Trở lại</Button>
              <div className="glass-panel rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-12 shadow-[0_40px_80px_rgba(0,0,0,0.4)] border-b-8 border-yellow-600/30">
                <h2 className="text-2xl md:text-4xl font-black text-white mb-8 md:mb-10 tracking-tighter flex items-center gap-4">Lớp học: <span className="text-yellow-400">{selectedGrade?.replace('Grade ', 'Lớp ')}</span> 🍊</h2>
                <div className="grid md:grid-cols-2 gap-8 md:gap-10">
                  <div>
                    <label className="block text-yellow-400/60 font-black mb-4 uppercase text-[10px] tracking-[0.3em]">Chọn Giáo trình 📚</label>
                    <div className="space-y-4 max-h-[30rem] overflow-y-auto pr-3 custom-scrollbar">
                      <div onClick={() => setSelectedTextbook('')} className={`cursor-pointer p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border-2 transition-all ${selectedTextbook === '' ? 'border-yellow-500 bg-yellow-500/10' : 'border-white/5 bg-black/20 hover:border-white/20'}`}><div className="font-black text-white text-lg md:text-xl">Tổng hợp (General) 🌍</div></div>
                      {(parseInt(selectedGrade!.split(' ')[1]) <= 9 ? TEXTBOOKS_BY_GRADE['Secondary'] : TEXTBOOKS_BY_GRADE['High']).map(tb => (
                        <div key={tb} onClick={() => setSelectedTextbook(tb)} className={`cursor-pointer p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border-2 transition-all ${selectedTextbook === tb ? 'border-yellow-500 bg-yellow-500/10' : 'border-white/5 bg-black/20 hover:border-white/20'}`}><div className="font-black text-white text-lg md:text-xl">{tb.split('(')[0]}</div></div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-yellow-400/60 font-black mb-4 uppercase text-[10px] tracking-[0.3em]">Chọn Kỹ năng ✨</label>
                    <div className="grid grid-cols-2 gap-4 md:gap-5">
                      {Object.values(GameType).map((type) => (
                        <Button key={type} variant={selectedGameType === type ? 'secondary' : 'outline'} onClick={() => { setSelectedGameType(type); if (type === GameType.Grammar) setSelectedSubSkill(GrammarSubSkill.GrammarQuiz); else setSelectedSubSkill(null); }} className={`py-8 md:py-10 h-full rounded-[1.5rem] md:rounded-[2rem] ${selectedGameType === type ? 'bg-red-600 border-red-800' : 'bg-black/20 border-white/5 hover:bg-white/10'}`}>
                          <span className="text-sm md:text-lg font-black text-center leading-tight uppercase tracking-tighter text-white px-2">{type.split(' (')[0]}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-10 md:mt-12"><Button onClick={handleStartGame} fullWidth size="lg" variant="primary" disabled={!selectedGameType} className="text-xl md:text-2xl py-8 md:py-10 h-24 md:h-28 rounded-[1.5rem] md:rounded-[2rem] bg-red-600 border-red-800 hover:bg-red-700 uppercase tracking-tighter">Nhận lì xì bài học 🧧</Button></div>
              </div>
            </div>
          ) : (!isQuotaError && finalScore !== null) ? (
            <ResultCard score={finalScore} total={calculateTotalPossibleScore()} onRetry={handleRetry} onHome={handleReset} />
          ) : (
            !isQuotaError && renderGameComponent()
          )}
        </main>
      </div>

      <footer className="flex flex-col items-center mt-16 pb-12 relative z-10 px-4">
        <div className="text-center text-white/20 text-[9px] md:text-[10px] mb-6">
          <p className="font-black uppercase tracking-[0.5em] mb-2">StudyBloom 🧧 Lunar New Year Edition</p>
        </div>
        <button onClick={() => setShowBadges(true)} className="flex items-center px-8 py-4 rounded-2xl glass-panel border-yellow-500/30 border-2 hover:bg-yellow-600/10 hover:border-yellow-500/60 transition-all duration-300 text-white/60 hover:text-white font-black text-sm shadow-xl group">
          <Icons.Mail /><span className="group-hover:translate-x-0.5 transition-transform">Gửi phản hồi 🧧</span>
        </button>
      </footer>
    </div>
  );
};

export default App;
