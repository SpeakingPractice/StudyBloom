
import React, { useState, useEffect, useRef } from 'react';
import { GradeLevel, GameType, GameSession, GrammarSubSkill, ViewMode, CustomFolder } from './types';
import { GRADE_GROUPS, TEXTBOOKS_BY_GRADE, BADGE_LEVELS } from './constants';
import { generateGameContent } from './services/geminiService';
import { Button } from './components/Button';
import { QuizGame } from './components/QuizGame';
import { ResultCard } from './components/ResultCard';
import { ListeningGame } from './components/ListeningGame';
import { SpeakingGame } from './components/SpeakingGame';
import { WritingGame } from './components/WritingGame';
import { TypeToFlyGame } from './components/TypeToFlyGame';
import { CoinCollectorGame } from './components/CoinCollectorGame';
import { VocabManager } from './components/VocabManager';

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
  <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10 sky-bg">
    {/* Clouds */}
    <div className="absolute top-[10%] left-[5%] w-32 h-12 bg-white rounded-full opacity-80 cloud-float" style={{ animationDelay: '0s' }}></div>
    <div className="absolute top-[15%] left-[8%] w-20 h-10 bg-white rounded-full opacity-80 cloud-float" style={{ animationDelay: '0.5s' }}></div>
    
    <div className="absolute top-[25%] right-[10%] w-40 h-14 bg-white rounded-full opacity-80 cloud-float" style={{ animationDelay: '1s' }}></div>
    <div className="absolute top-[30%] right-[12%] w-24 h-12 bg-white rounded-full opacity-80 cloud-float" style={{ animationDelay: '1.5s' }}></div>

    <div className="absolute top-[50%] left-[40%] w-28 h-10 bg-white rounded-full opacity-60 cloud-float" style={{ animationDelay: '2s' }}></div>

    {/* Mario Hills */}
    <div className="absolute bottom-[2%] left-[-5%] w-64 h-32 bg-[#43B047] rounded-t-full border-t-4 border-[#256B28] opacity-40"></div>
    <div className="absolute bottom-0 right-[-10%] w-[40rem] h-48 bg-[#43B047] rounded-t-full border-t-4 border-[#256B28] opacity-30"></div>
    
    {/* Ground */}
    <div className="absolute bottom-0 left-0 w-full h-8 bg-[#43B047] border-t-4 border-[#256B28]"></div>
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
    <rect x="5" y="5" width="90" height="90" rx="6" fill="url(#banhChungGreen)" stroke="#0d3311" strokeWidth="1" />
    <rect x="5" y="32" width="90" height="4" fill="#f1f8e9" opacity="0.8" />
    <rect x="5" y="64" width="90" height="4" fill="#f1f8e9" opacity="0.8" />
    <rect x="32" y="5" width="4" height="90" fill="#f1f8e9" opacity="0.8" />
    <rect x="64" y="5" width="4" height="90" fill="#f1f8e9" opacity="0.8" />
    <g transform="rotate(45 50 50)">
      <rect x="28" y="28" width="44" height="44" fill="#d32f2f" />
      <rect x="30" y="30" width="40" height="40" fill="none" stroke="#ffd54f" strokeWidth="1" />
    </g>
    <text x="50" y="47" textAnchor="middle" fill="#ffd54f" fontSize="13" fontWeight="900" style={{ fontFamily: 'sans-serif' }}>TẾT</text>
    <text x="50" y="62" textAnchor="middle" fill="#ffd54f" fontSize="11" fontWeight="900" style={{ fontFamily: 'sans-serif' }}>2026</text>
    <circle cx="82" cy="18" r="6" fill="#ffea00" />
    <circle cx="82" cy="18" r="2.5" fill="#ff8f00" />
  </svg>
);

const App: React.FC = () => {
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel | null>(null);
  const [selectedGameType, setSelectedGameType] = useState<GameType | null>(null);
  const [selectedSubSkill, setSelectedSubSkill] = useState<GrammarSubSkill | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Home);
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

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!bgMusicRef.current) {
      bgMusicRef.current = new Audio();
      bgMusicRef.current.loop = true;
      bgMusicRef.current.volume = 0.3;
    }

    const musicUrl = (gameData && !finalScore) 
      ? "https://www.myinstants.com/media/sounds/mario-kart-wii-theme-song.mp3"
      : "https://www.myinstants.com/media/sounds/mario-game-theme_mD9VfO7.mp3";

    if (isAudioEnabled) {
      if (bgMusicRef.current.src !== musicUrl) {
        bgMusicRef.current.src = musicUrl;
      }
      bgMusicRef.current.play().catch(e => console.log("Audio play blocked", e));
    } else {
      bgMusicRef.current.pause();
    }
  }, [isAudioEnabled, gameData, finalScore]);

  const toggleAudio = () => setIsAudioEnabled(!isAudioEnabled);

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
      if (!data.questions || data.questions.length === 0) {
        throw new Error("Không tìm thấy câu hỏi phù hợp. Vui lòng thử chọn kỹ năng khác hoặc giáo trình khác bạn nhé!");
      }
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
      if (msg.includes("QUOTA_EXCEEDED") || msg.includes("429") || msg.includes("entity was not found") || msg.includes("API_KEY_INVALID") || msg.includes("leaked") || msg.includes("403") || msg.includes("401") || msg.includes("PERMISSION_DENIED")) {
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
    setViewMode(ViewMode.Home);
  };

  const handlePracticeFolder = (folder: CustomFolder) => {
    const customQuestions = folder.words.map((w, idx) => {
      let otherWords = folder.words
        .filter(other => other.id !== w.id)
        .map(other => other.word);
      
      const wrongOptions = otherWords.sort(() => Math.random() - 0.5).slice(0, 3);
      const options = [w.word, ...wrongOptions].sort(() => Math.random() - 0.5);

      return {
        id: idx,
        questionText: w.definition,
        options: options,
        correctAnswer: w.word,
        explanation: `${w.word} (${w.partOfSpeech.toLowerCase()}): ${w.definition}`,
        topic: folder.name,
        exampleSentence: w.example,
        phonetic: w.pronunciation
      };
    });

    setGameData({
      grade: GradeLevel.Grade12,
      gameType: GameType.CoinCollector,
      questions: customQuestions as any,
      textbookContext: folder.name
    });
    setSelectedGrade(GradeLevel.Grade12);
    setViewMode(ViewMode.Home); 
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
      case GameType.CoinCollector: return <CoinCollectorGame {...commonProps} />;
      default: return <QuizGame {...commonProps} />;
    }
  };

  const calculateTotalPossibleScore = () => {
    if (!gameData) return 0;
    const count = gameData.questions.length || 0;
    switch (gameData.gameType) {
      case GameType.Writing: return count * 10;
      case GameType.TypeToFly: return count;
      case GameType.CoinCollector: return count * 10;
      default: return count * 2;
    }
  };

  const submitFeedback = async () => {
    if (!feedbackText.trim() || isSendingFeedback) return;
    setIsSendingFeedback(true);
    try {
      await fetch("https://formsubmit.co/ajax/mquan1997td@gmail.com", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          email: userEmail || "Không để lại email",
          message: feedbackText,
          _subject: "Góp Ý Web Luyen Tieng Anh"
        })
      });
      setFeedbackSuccess(true);
      setFeedbackText("");
      setUserEmail("");
      setTimeout(() => {
        setShowFeedbackModal(false);
        setFeedbackSuccess(false);
      }, 2500);
    } catch (e) {
      alert("Hệ thống bận, vui lòng thử lại sau!");
    } finally {
      setIsSendingFeedback(false);
    }
  };

  const currentBadge = BADGE_LEVELS.slice().reverse().find(b => totalPoints >= b.score);

  return (
    <div className="relative min-h-screen font-sans text-[#7c3a2a]">
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

      {showFeedbackModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !isSendingFeedback && setShowFeedbackModal(false)}></div>
          <div className="relative glass-panel bg-[#E8D5A3] w-full max-w-lg p-8 shadow-2xl animate-fade-in border-4 border-[#8B6914]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="pixel-font text-xs text-[#E52521] flex items-center gap-2 uppercase">SEND A TIP! 🧧</h3>
              <button onClick={() => !isSendingFeedback && setShowFeedbackModal(false)} className="text-[#5C3010]/40 hover:text-[#5C3010] transition-colors"><Icons.Close /></button>
            </div>
            <p className="pixel-font text-[7px] text-[#5C3010]/60 uppercase tracking-widest mb-6">WE ARE LISTENING TO YOUR FEEDBACK</p>
            {feedbackSuccess ? (
              <div className="py-12 flex flex-col items-center animate-fade-in text-center">
                 <div className="w-16 h-16 bg-[#43B047]/20 rounded-full flex items-center justify-center mb-4 border-4 border-[#43B047]"><Icons.Check className="text-[#43B047]" /></div>
                 <p className="pixel-font text-[10px] text-[#43B047]">SUCCESS! 🌸</p>
                 <p className="pixel-font text-[7px] text-[#5C3010]/60 mt-4 uppercase">THANKS FOR YOUR CONTRIBUTION.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block pixel-font text-[7px] text-[#5C3010]/70 uppercase tracking-widest mb-2 px-1">YOUR EMAIL</label>
                  <input type="email" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} placeholder="example@gmail.com" className="w-full bg-white/20 border-4 border-[#8B6914]/20 rounded-xl p-3 text-[#5D2E17] font-bold outline-none focus:border-[#049CD8] transition-all placeholder:text-[#5D2E17]/30" />
                </div>
                <div>
                  <label className="block pixel-font text-[7px] text-[#5C3010]/70 uppercase tracking-widest mb-2 px-1">MESSAGE</label>
                  <textarea value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} placeholder="Nhập góp ý hoặc báo lỗi tại đây..." className="w-full h-32 bg-white/20 border-4 border-[#8B6914]/20 rounded-xl p-3 text-[#5D2E17] font-bold outline-none focus:border-[#049CD8] transition-all resize-none placeholder:text-[#5D2E17]/30" />
                </div>
                <button onClick={submitFeedback} disabled={!feedbackText.trim() || isSendingFeedback} className="w-full py-5 bg-[#E52521] border-4 border-[#8B1A18] text-white pixel-font text-[10px] shadow-[0_6px_0_#8B1A18] active:translate-y-1 active:shadow-none transition-all rounded-xl disabled:opacity-50">
                  {isSendingFeedback ? "SENDING..." : "SEND NOW! 🧧"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="relative p-2 md:p-8 max-w-7xl mx-auto z-10">
        <header className="flex flex-col md:flex-row items-stretch md:items-center mb-8 gap-4 brick-panel p-4 rounded-xl transition-all duration-500 md:justify-between shadow-[0_4px_0_#5C3010]">
           <div className="flex items-center justify-between w-full md:w-auto gap-4 shrink-0">
              <div className="pixel-font text-lg md:text-2xl tracking-tighter cursor-pointer whitespace-nowrap hover:scale-105 transition-transform flex items-center gap-2 text-[#FBD000] drop-shadow-[2px_2px_0_#8B6914]" onClick={handleReset}>
                StudyBloom <span className="text-2xl">🍄</span>
              </div>
              <div className="flex md:hidden shrink-0">
                <button onClick={() => setShowBadges(true)} className="flex items-center gap-2 transition-all active:scale-90 px-3 py-1.5 bg-[#1A1A2E] border-2 border-[#FBD000] rounded-full">
                  <div className="w-4 h-4 bg-[#FBD000] border-2 border-[#C8980A] rounded-full animate-pulse"></div>
                  <span className="pixel-font text-[#FBD000] text-[8px] tracking-tighter">{totalPoints} pts</span>
                </button>
              </div>
           </div>

           {keyVerificationStatus !== 'success' && (
             <div className="w-full md:flex-1 md:max-w-md order-3 md:order-2 flex flex-col items-center animate-fade-in relative">
                <div className="relative flex items-center group w-full">
                  <input type="password" value={apiKeyInput} onChange={handleApiKeyChange} placeholder="Paste Google API Key..." className={`w-full bg-white/20 border-2 transition-all px-4 py-2 rounded-xl pixel-font text-[10px] text-white placeholder:text-white/40 cursor-text outline-none ${keyVerificationStatus === 'fail' ? 'border-red-500' : 'border-white/30 focus:border-[#FBD000]'}`} />
                  <button onClick={handleVerifyKey} disabled={isVerifyingKey || !apiKeyInput} className={`absolute right-1 px-3 py-1.5 rounded-lg pixel-font text-[8px] uppercase transition-all flex items-center justify-center min-w-[60px] ${keyVerificationStatus === 'fail' ? 'bg-[#E52521] text-white shadow-[0_3px_0_#8B1A18]' : 'bg-[#43B047] hover:bg-[#256B28] text-white shadow-[0_3px_0_#256B28]'} disabled:opacity-50 active:translate-y-[2px] active:shadow-none`}>
                    {isVerifyingKey ? <div className="w-2 h-2 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'OK!'}
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-[8px] text-white/60 hover:text-[#FBD000] font-bold uppercase tracking-widest transition-colors flex items-center gap-1 pixel-font">GET KEY HERE <span className="text-xs">🔑</span></a>
                </div>
             </div>
           )}

           <div className="hidden md:flex shrink-0 order-3 items-center gap-4">
              <button 
                onClick={toggleAudio}
                className="w-10 h-10 rounded-full bg-[#1A1A2E] border-2 border-[#FBD000] flex items-center justify-center text-lg hover:scale-110 transition-all active:scale-95 shadow-[0_3px_0_rgba(251,208,0,0.3)]"
                title={isAudioEnabled ? "Tắt nhạc" : "Bật nhạc"}
              >
                {isAudioEnabled ? '🔊' : '🔇'}
              </button>
              <button onClick={() => setShowBadges(true)} className="bg-[#1A1A2E] px-4 py-2 rounded-full border-2 border-[#FBD000] flex items-center gap-3 hover:scale-105 transition-all active:scale-95 group shadow-[0_3px_0_rgba(251,208,0,0.3)]">
                <div className="w-4 h-4 bg-[#FBD000] border-2 border-[#C8980A] rounded-full animate-bounce flex items-center justify-center text-[8px] text-[#C8980A] font-bold">●</div>
                <span className="pixel-font text-[9px] text-[#FBD000]">{currentBadge?.name || 'Explorer'}</span>
                <span className="w-px h-4 bg-[#FBD000]/30 font-bold"></span>
                <span className="pixel-font text-[#FBD000] text-[9px]">{totalPoints} pts</span>
              </button>
           </div>
        </header>

        <main>
          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
              <div className="relative w-24 h-24 md:w-32 md:h-32 mb-8">
                 <div className="absolute inset-0 border-8 border-black/5 border-t-orange-500 rounded-full animate-spin"></div>
                 <div className="absolute inset-0 flex items-center justify-center text-3xl md:text-4xl animate-pulse">🌟</div>
              </div>
              <h3 className="text-xl md:text-2xl font-black text-[#7c3a2a] drop-shadow-sm mb-2 text-center uppercase tracking-tighter">Đợi xíu, mình đang chọn bài phù hợp cho bạn 😉</h3>
            </div>
          ) : isQuotaError ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in p-8 text-center bg-white/60 backdrop-blur-xl rounded-[3rem] border-4 border-orange-500 shadow-2xl max-w-3xl mx-auto mt-12">
              <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mb-6 text-4xl shadow-inner border-2 border-orange-200">🔑</div>
              <h3 className="text-2xl md:text-3xl font-black text-[#7c3a2a] mb-4 uppercase tracking-tighter">Cần Xác Thực API Key</h3>
              <p className="text-[#7c3a2a]/70 font-bold mb-8 max-w-md">Vui lòng nhập Google AI API Key ở thanh công cụ phía trên hoặc kiểm tra lại kết nối bạn nhé!</p>
              <div className="p-4 bg-orange-50 rounded-2xl border-2 border-orange-200 text-sm text-[#7c3a2a]/80 font-bold mb-6"> Quota bị giới hạn hoặc Key không hợp lệ. </div>
              <Button onClick={() => setIsQuotaError(false)} variant="primary" className="bg-orange-600 border-orange-800 text-white px-10 py-4 rounded-2xl shadow-lg">Tôi đã hiểu</Button>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh] animate-fade-in p-8 text-center bg-white/40 rounded-[3rem] border-4 border-red-200">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6 text-4xl shadow-inner">⚠️</div>
              <h3 className="text-2xl font-black text-red-600 mb-4 uppercase tracking-tighter">Rất tiếc, đã có lỗi xảy ra!</h3>
              <p className="text-[#7c3a2a]/70 font-bold mb-8 max-w-md">{error}</p>
              <div className="flex gap-4">
                <Button onClick={handleRetry} variant="primary" className="bg-orange-600 border-orange-800 text-white">Thử lại lần nữa</Button>
                <Button onClick={handleReset} variant="outline" className="border-[#7c3a2a]/20">Về trang chủ</Button>
              </div>
            </div>
          ) : viewMode === ViewMode.VocabManager ? (
            <VocabManager onBack={() => { setViewMode(ViewMode.Home); setSelectedGrade(null); }} onPractice={handlePracticeFolder} />
          ) : !selectedGrade ? (
            <div className="animate-fade-in space-y-8">
              <div className="text-center space-y-4 mb-12 relative flex flex-col items-center">
                <div className="relative inline-block mt-8">
                  <h1 className="text-3xl md:text-5xl lg:text-7xl pixel-font tracking-tight relative z-10 flex items-center justify-center gap-1 md:gap-3 flex-wrap">
                    <span className="text-[#E52521] drop-shadow-[4px_4px_0_#8B1A18]">S</span>
                    <span className="text-[#049CD8] drop-shadow-[4px_4px_0_#025A80]">t</span>
                    <span className="text-[#FBD000] drop-shadow-[4px_4px_0_#C8980A]">u</span>
                    <span className="text-[#43B047] drop-shadow-[4px_4px_0_#256B28]">d</span>
                    <span className="text-[#E52521] drop-shadow-[4px_4px_0_#8B1A18]">y</span>
                    <span className="text-[#FBD000] drop-shadow-[4px_4px_0_#C8980A]">B</span>
                    <span className="text-[#E52521] drop-shadow-[4px_4px_0_#8B1A18]">l</span>
                    <span className="text-[#049CD8] drop-shadow-[4px_4px_0_#025A80]">o</span>
                    <span className="text-[#43B047] drop-shadow-[4px_4px_0_#256B28]">o</span>
                    <span className="text-[#E52521] drop-shadow-[4px_4px_0_#8B1A18]">m</span>
                  </h1>
                </div>
                <p className="pixel-font text-[8px] md:text-xs text-white drop-shadow-[2px_2px_0_#3A5FAA] max-w-3xl mx-auto px-4 uppercase tracking-widest mt-6">— Explore the English World —</p>
              </div>
              <div className="grid gap-12">
              {Object.entries(GRADE_GROUPS).map(([groupName, grades]) => (
                <div key={groupName} className="glass-panel p-6 md:p-10 border-t-8 border-[#C4A96B] bg-[#E8D5A3]">
                  <h3 className="text-sm md:text-xl pixel-font text-[#5C3010] mb-6 md:mb-10 flex items-center gap-4">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-[#E52521] border-4 border-[#8B1A18] rounded-lg flex items-center justify-center text-lg shadow-[0_3px_0_#8B1A18]">📚</div>
                    {groupName.toUpperCase()}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
                    {grades.map((grade) => (
                      <div key={grade} onClick={() => setSelectedGrade(grade)} className="q-block group p-6 md:p-8 flex items-center justify-center cursor-pointer relative overflow-hidden">
                        <span className="pixel-font text-[10px] md:text-xs text-[#5C3010] relative z-10">{grade.toUpperCase()}</span>
                        <div className="absolute top-1 right-2 text-xl md:text-3xl text-black/10 font-black">?</div>
                      </div>
                    ))}
                    {groupName.includes('High School') && (
                      <div onClick={() => setViewMode(ViewMode.VocabManager)} className="q-block group p-6 md:p-8 flex items-center justify-center cursor-pointer relative overflow-hidden bg-[#FBD000] border-[#8B6914] shadow-[0_4px_0_#8B6914] hover:bg-[#FFE033] transition-all">
                        <span className="pixel-font text-[10px] md:text-xs text-[#5C3010] relative z-10">ADD NEW WORDS ➕</span>
                        <div className="absolute inset-0 bg-white/20 animate-pulse pointer-events-none"></div>
                        <div className="absolute top-1 right-2 text-xl md:text-3xl text-black/10 font-black">?</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              </div>
            </div>
          ) : !gameData ? (
            <div className="max-w-7xl mx-auto animate-fade-in">
              {/* Sky Part */}
              <div className="p-6 md:p-12 pb-2">
                <button onClick={() => setSelectedGrade(null)} className="pixel-font text-[10px] text-[#E52521] hover:underline mb-8 flex items-center gap-2 drop-shadow-sm">
                  ← BACK TO MAP
                </button>
                <div className="flex items-center gap-4 mb-2">
                  <h2 className="text-3xl md:text-6xl pixel-font text-[#E52521] drop-shadow-[4px_4px_0_#8B1A18] tracking-tighter uppercase">{selectedGrade?.toUpperCase()} 🍊</h2>
                </div>
              </div>

              {/* Tan Ground Part */}
              <div className="bg-[#E8D5A3] border-t-8 border-[#C4A96B] p-6 md:p-12 rounded-b-[2rem] shadow-2xl">
                <div className="grid lg:grid-cols-2 gap-10 md:gap-16">
                  {/* TEXTBOOK COLUMN */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 bg-[#FBD000] border-2 border-[#C8980A] rounded-full animate-bounce flex items-center justify-center text-[10px] text-[#C8980A] font-bold">●</div>
                      <label className="pixel-font text-[9px] text-[#8B4513] uppercase tracking-widest">Choose Textbook</label>
                    </div>
                    
                    <div className="space-y-4">
                      {/* GENERAL OPTION */}
                      <div 
                        onClick={() => setSelectedTextbook('')} 
                        className={`group relative cursor-pointer p-6 md:p-8 rounded-xl border-4 transition-all ${
                          selectedTextbook === '' 
                          ? 'bg-[#E52521] border-[#8B1A18] shadow-[0_5px_0_#5C0F0C]' 
                          : 'bg-[#FBD000] border-[#C8980A] shadow-[0_5px_0_#8B6914] hover:bg-[#FFE033] hover:-translate-y-1'
                        }`}
                      >
                        <div className={`pixel-font text-[10px] uppercase ${selectedTextbook === '' ? 'text-white' : 'text-[#5C3010]'}`}>
                          General 🌍
                        </div>
                        <div className={`absolute top-2 right-4 text-3xl font-black ${selectedTextbook === '' ? 'text-white/20' : 'text-black/10'}`}>?</div>
                      </div>

                      {/* TEXTBOOK LIST */}
                      {(parseInt(selectedGrade!.split(' ')[1]) <= 9 ? TEXTBOOKS_BY_GRADE['Secondary'] : TEXTBOOKS_BY_GRADE['High']).map(tb => (
                        <div 
                          key={tb} 
                          onClick={() => setSelectedTextbook(tb)} 
                          className={`group relative cursor-pointer p-6 md:p-8 rounded-xl border-4 transition-all ${
                            selectedTextbook === tb 
                            ? 'bg-[#E52521] border-[#8B1A18] shadow-[0_5px_0_#5C0F0C]' 
                            : 'bg-[#FBD000] border-[#C8980A] shadow-[0_5px_0_#8B6914] hover:bg-[#FFE033] hover:-translate-y-1'
                          }`}
                        >
                          <div className={`pixel-font text-[10px] uppercase ${selectedTextbook === tb ? 'text-white' : 'text-[#5C3010]'}`}>
                            {tb.split('(')[0]}
                          </div>
                          <div className={`absolute top-2 right-4 text-3xl font-black ${selectedTextbook === tb ? 'text-white/20' : 'text-black/10'}`}>?</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* SKILL COLUMN */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="text-xl animate-pulse">★</div>
                      <label className="pixel-font text-[9px] text-[#8B4513] uppercase tracking-widest">Choose Skill</label>
                    </div>

                    <div className="grid grid-cols-2 gap-4 md:gap-6">
                      {Object.values(GameType).map((type) => {
                        const isSpecial = type === GameType.TypeToFly || type === GameType.CoinCollector;
                        const isSelected = selectedGameType === type;
                        
                        return (
                          <div 
                            key={type}
                            onClick={() => { 
                              setSelectedGameType(type); 
                              if (type !== GameType.Grammar) setSelectedSubSkill(null); 
                              else if (!selectedSubSkill) setSelectedSubSkill(GrammarSubSkill.GrammarQuiz); 
                            }}
                            className={`cursor-pointer h-24 md:h-32 rounded-xl border-4 transition-all flex items-center justify-center text-center p-4 active:scale-95 active:shadow-none ${
                                isSpecial ? 'col-span-2' : ''
                            } ${
                                isSelected 
                                ? 'scale-105 z-10 brightness-110 shadow-none -translate-y-1' 
                                : ''
                            } ${
                                isSpecial 
                                ? (type === GameType.CoinCollector ? 'bg-[#FBD000] border-[#C8980A] shadow-[0_6px_0_#8B6914] hover:bg-[#FFE033] hover:-translate-y-1' : 'bg-[#049CD8] border-[#025A80] shadow-[0_6px_0_#013D60] hover:bg-[#05b1f5] hover:-translate-y-1')
                                : 'bg-[#43B047] border-[#256B28] shadow-[0_6px_0_#174D0F] hover:bg-[#55D45A] hover:-translate-y-1'
                            }`}
                          >
                            <span className="pixel-font text-[8px] md:text-[9px] text-white uppercase tracking-tighter drop-shadow-[1px_1px_0_rgba(0,0,0,0.5)]">
                              {type === GameType.TypeToFly ? (
                                <span className="flex items-center gap-3">
                                  <span className="text-xl">🐦</span> 
                                  FLAPPY BIRD
                                </span>
                              ) : type === GameType.CoinCollector ? (
                                <span className="flex items-center gap-3 text-[#5C3010]">
                                  <span className="text-xl">💰</span> 
                                  COIN COLLECTOR
                                </span>
                              ) : type.includes('Grammar') ? 'Grammar' :
                                  type.includes('Listening') ? 'Listening' :
                                  type.includes('Speaking') ? 'Speaking' :
                                  type.includes('Writing') ? 'Writing' : type.split(' (')[0].toUpperCase()}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* GRAMMAR SUB-SKILLS */}
                    {selectedGameType === GameType.Grammar && (
                      <div className="mt-8 pt-8 border-t-4 border-[#8B6914]/10 animate-fade-in-up">
                        <label className="block pixel-font text-[8px] text-[#8B4513] uppercase tracking-[0.2em] mb-4">Select Practice Mode 📝</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {Object.values(GrammarSubSkill).map((sub) => (
                            <button 
                              key={sub} 
                              onClick={() => setSelectedSubSkill(sub)} 
                              className={`px-3 py-4 rounded-xl border-4 transition-all pixel-font text-[10px] uppercase tracking-tighter leading-tight ${
                                selectedSubSkill === sub 
                                ? 'bg-[#E52521] border-[#8B1A18] text-white shadow-[0_4px_0_#5C0F0C]' 
                                : 'bg-white/60 border-[#8B6914]/20 text-[#5C3010] hover:bg-white'
                              }`}
                            >
                               {sub}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-12 pt-12 border-t-8 border-[#C4A96B]/30 flex justify-center">
                  <button 
                    onClick={handleStartGame} 
                    disabled={!selectedGameType || (selectedGameType === GameType.Grammar && !selectedSubSkill)} 
                    className="w-full md:w-auto min-w-[300px] h-24 md:h-32 px-12 rounded-[2.5rem] bg-[#43B047] border-8 border-[#256B28] text-white pixel-font text-xs md:text-xl tracking-[0.3em] shadow-[0_12px_0_#174D0F] hover:bg-[#55D45A] hover:-translate-y-1 active:translate-y-2 active:shadow-none transition-all flex flex-col items-center justify-center gap-4 group disabled:opacity-50 disabled:grayscale disabled:pointer-events-none"
                  >
                    <span className="drop-shadow-[2px_2px_0_rgba(0,0,0,0.5)]">START LEVEL! 🧧</span>
                    <div className="w-16 h-3 bg-black/20 rounded-full group-hover:w-20 transition-all"></div>
                  </button>
                </div>
              </div>
            </div>
          ) : (finalScore !== null) ? (
            <ResultCard score={finalScore} total={calculateTotalPossibleScore()} onRetry={handleRetry} onHome={handleReset} />
          ) : (
            renderGameComponent()
          )}
        </main>
      </div>

      {viewMode === ViewMode.Home && !selectedGrade && !gameData && !finalScore && (
        <footer className="flex flex-col items-center mt-20 pb-20 relative z-10 px-4">
          <div className="text-center text-white/40 mb-8">
            <p className="pixel-font text-[7px] uppercase tracking-[0.4em] mb-2 drop-shadow-[1px_1px_0_rgba(0,0,0,0.2)]">StudyBloom 🍄 Mario Edition</p>
          </div>
          <button onClick={() => setShowFeedbackModal(true)} className="flex items-center px-10 py-5 rounded-2xl glass-panel border-[#8B6914] border-4 bg-[#FBD000] hover:bg-[#FFE033] transition-all duration-300 text-[#5D2E17] pixel-font text-[8px] shadow-[0_6px_0_#8B6914] active:translate-y-1 active:shadow-none group uppercase">
            <Icons.Mail /><span className="ml-2">SEND FEEDBACK! 🧧</span>
          </button>
        </footer>
      )}
    </div>
  );
};

export default App;
