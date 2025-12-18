
import { useState, useEffect, useRef } from 'react';
import { QuestionData } from '../types';
import { Button } from './Button';
import { generateSpeech, evaluatePronunciation } from '../services/geminiService';

interface SayItRightGameProps {
  // Changed 'questions[]' to 'QuestionData[]' to fix reference error
  questions: QuestionData[];
  onComplete: (score: number) => void;
}

export const SayItRightGame: React.FC<SayItRightGameProps> = ({ questions, onComplete }) => {
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isModelPlaying, setIsModelPlaying] = useState(false);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; message: string; advice: string } | null>(null);
  const [streak, setStreak] = useState(0);
  const [prefetchedAudio, setPrefetchedAudio] = useState<AudioBuffer | null>(null);

  const recognitionRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const current = questions[index];

  // @ts-ignore
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  const getAudioCtx = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current;
  };

  useEffect(() => {
    setPrefetchedAudio(null);
    if (current) {
      const loadAudio = async () => {
        try {
          const audioData = await generateSpeech(current.questionText);
          if (audioData) {
            const ctx = getAudioCtx();
            const binaryString = window.atob(audioData);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
            const dataInt16 = new Int16Array(bytes.buffer);
            const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
            const channelData = buffer.getChannelData(0);
            for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
            setPrefetchedAudio(buffer);
          }
        } catch (err) {
          console.error("Audio prefetch failed:", err);
        }
      };
      loadAudio();
    }
  }, [index, current?.questionText]);

  const playModel = () => {
    if (isModelPlaying || !prefetchedAudio) return;
    
    setIsModelPlaying(true);
    const ctx = getAudioCtx();
    const source = ctx.createBufferSource();
    source.buffer = prefetchedAudio;
    source.connect(ctx.destination);
    source.onended = () => setIsModelPlaying(false);
    source.start(0);
  };

  const startListening = () => {
    if (!Recognition) {
      alert("Trình duyệt này không hỗ trợ nhận diện giọng nói.");
      return;
    }

    // If already listening, stop it manually
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      return;
    }

    // Clear old feedback and prepare for new session
    setFeedback(null);
    setIsListening(true);
    
    // Clean up existing instance if any
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch(e) {}
    }

    const recognition = new Recognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIsListening(false);
      setIsEvaluating(true);
      
      try {
        const result = await evaluatePronunciation(current.questionText, transcript);
        if (result) {
          setFeedback({
            isCorrect: result.isCorrect,
            message: result.feedback,
            advice: result.advice
          });
          if (result.isCorrect) {
            setScore(s => s + 1);
            setStreak(s => s + 1);
          } else {
            setStreak(0);
          }
        }
      } catch (err) {
        console.error("Pronunciation evaluation failed:", err);
      } finally {
        setIsEvaluating(false);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech Recognition Error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.error("Failed to start recognition:", err);
      setIsListening(false);
    }
  };

  const next = () => {
    if (index < questions.length - 1) {
      setIndex(i => i + 1);
      setFeedback(null);
    } else {
      onComplete(score);
    }
  };

  if (!current) return null;

  return (
    <div className="max-w-2xl mx-auto w-full bg-[#fdfaf3]/95 backdrop-blur-md rounded-3xl p-6 md:p-8 shadow-2xl border border-white/50 text-center animate-fade-in relative overflow-hidden">
      {/* Header Info */}
      <div className="flex justify-between items-center mb-6">
        <div className="bg-[#fff1cc] text-[#9a6a12] px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">
          Streak: {streak} 🔥
        </div>
        <div className="text-gray-400 font-bold text-[10px] uppercase tracking-tighter">Round {index + 1}/{questions.length}</div>
      </div>

      {/* Target Word */}
      <h2 className="text-4xl md:text-5xl font-black text-[#2d3436] mb-4 tracking-tight drop-shadow-sm break-words leading-tight px-2">
        {current.questionText}
      </h2>
      
      {/* Phonetic & Meaning */}
      <div className="space-y-1 mb-6 text-[#2d98da] font-bold">
        <p className="text-sm md:text-base">
          Phát âm: <span className="font-mono text-[#45aaf2]">/{current.phonetic || '...'}/</span>
        </p>
        <p className="text-sm md:text-base">
          Ý nghĩa: <span className="text-[#4b7bec]">{current.meaning || '...'}</span>
        </p>
      </div>

      {/* Context Example */}
      {current.exampleSentence && (
        <div className="mb-8 px-4 py-3 bg-blue-50/50 rounded-2xl border border-blue-100/50">
          <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest mb-1">Ví dụ (Context):</p>
          <p className="text-sm md:text-base text-gray-700 italic font-medium leading-relaxed">
            "{current.exampleSentence}"
          </p>
        </div>
      )}

      {/* Main Interaction Area */}
      <div className="flex flex-col items-center gap-6 mb-8">
        <div className="flex justify-center gap-8 md:gap-12">
          {/* Audio Playback (Listen) */}
          <div className="flex flex-col items-center gap-2">
            <Button 
              onClick={playModel} 
              variant="outline" 
              className={`w-20 h-20 rounded-2xl flex items-center justify-center text-3xl shadow-lg border-4 border-white transition-all bg-white hover:bg-blue-50 active:scale-95 ${isModelPlaying ? 'animate-pulse ring-4 ring-blue-100' : ''}`}
              title="Nghe mẫu"
            >
              {isModelPlaying ? '🔊' : '🔈'}
            </Button>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Nghe mẫu</span>
          </div>

          {/* User Recording (Speak) */}
          <div className="flex flex-col items-center gap-2">
            <Button 
              onClick={startListening}
              variant={isListening ? 'danger' : 'primary'}
              disabled={isEvaluating}
              className={`w-20 h-20 rounded-2xl flex items-center justify-center text-3xl shadow-xl border-4 border-white transition-all ${isListening ? 'animate-pulse scale-110 shadow-red-200' : 'hover:scale-105 active:scale-95'}`}
              title="Nói ngay"
            >
              {isEvaluating ? '⏳' : isListening ? '⏹️' : '🎙️'}
            </Button>
            <span className={`text-[10px] font-black uppercase tracking-tighter ${isListening ? 'text-red-500 animate-pulse' : 'text-blue-500'}`}>
              {isListening ? 'Đang nghe...' : 'Bắt đầu nói'}
            </span>
          </div>
        </div>
      </div>

      {/* Feedback Card */}
      {feedback && (
        <div className={`p-4 md:p-6 rounded-2xl border-2 mb-6 animate-fade-in-up shadow-lg transition-all ${feedback.isCorrect ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-2xl">{feedback.isCorrect ? "🌟" : "💡"}</span>
            <h4 className={`text-base font-black uppercase tracking-tight ${feedback.isCorrect ? 'text-green-600' : 'text-amber-600'}`}>
              {feedback.message}
            </h4>
          </div>
          <p className="text-gray-600 text-xs md:text-sm italic font-medium leading-relaxed px-2">"{feedback.advice}"</p>
        </div>
      )}

      {/* Navigation Controls */}
      <div className="flex flex-col items-center gap-6">
        {feedback?.isCorrect ? (
          <Button onClick={next} variant="secondary" size="lg" className="w-full md:w-auto px-12 text-base py-4 shadow-xl">
            Tiếp tục (Next) →
          </Button>
        ) : feedback ? (
          <div className="flex gap-3 w-full justify-center">
            <Button onClick={() => setFeedback(null)} variant="outline" size="md" className="px-6 bg-white border-gray-200">
              Thử lại 🔄
            </Button>
            <Button onClick={next} variant="secondary" size="md" className="px-6">
              Bỏ qua ⏭️
            </Button>
          </div>
        ) : (
          <button 
            onClick={next} 
            className="text-[9px] font-black text-gray-400 hover:text-blue-500 transition-colors uppercase tracking-[0.2em] border-b-2 border-transparent hover:border-blue-200 pb-1"
          >
            SKIP ROUND
          </button>
        )}

        <p className="text-[9px] text-gray-300 font-bold uppercase italic max-w-xs mx-auto leading-relaxed">
          Confidence comes before perfection.
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mt-8 bg-gray-100 rounded-full h-2 overflow-hidden w-full shadow-inner">
        <div 
          className="bg-blue-400 h-full transition-all duration-700 ease-out"
          style={{ width: `${((index + (feedback?.isCorrect ? 1 : 0)) / questions.length) * 100}%` }}
        />
      </div>
    </div>
  );
};
