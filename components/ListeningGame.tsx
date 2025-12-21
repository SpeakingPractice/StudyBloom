
import React, { useState, useEffect, useRef } from 'react';
import { QuestionData } from '../types';
import { Button } from './Button';
import { generateSpeech } from '../services/geminiService';

interface ListeningGameProps {
  questions: QuestionData[];
  onComplete: (score: number) => void;
}

export const ListeningGame: React.FC<ListeningGameProps> = ({ questions, onComplete }) => {
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [readingCountdown, setReadingCountdown] = useState(15);
  const [audioError, setAudioError] = useState(false);
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const current = questions[index];

  const initAudioCtx = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    return audioCtxRef.current;
  };

  useEffect(() => {
    return () => stopAudio();
  }, []);

  useEffect(() => {
    stopAudio();
    setReadingCountdown(15);
    setAudioError(false);
  }, [index]);

  useEffect(() => {
    if (readingCountdown > 0) {
      const timer = setTimeout(() => setReadingCountdown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [readingCountdown]);

  const stopAudio = () => {
    if (currentSourceRef.current) {
      try { currentSourceRef.current.stop(); } catch (e) {}
      currentSourceRef.current = null;
    }
    setIsPlaying(false);
    setIsLoadingAudio(false);
  };

  const playAudio = async () => {
    if (!current?.listeningScript || isPlaying || isLoadingAudio) return;
    
    const ctx = initAudioCtx();
    if (ctx.state === 'suspended') await ctx.resume();

    setIsLoadingAudio(true);
    setAudioError(false);

    try {
      const audioData = await generateSpeech(current.listeningScript);
      if (audioData) {
        const binaryString = window.atob(audioData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
        
        const dataInt16 = new Int16Array(bytes.buffer, 0, bytes.length / 2);
        const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
        const channelData = buffer.getChannelData(0);
        for (let i = 0; i < dataInt16.length; i++) {
          channelData[i] = dataInt16[i] / 32768.0;
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.onended = () => {
          setIsPlaying(false);
          setIsLoadingAudio(false);
        };
        currentSourceRef.current = source;
        setIsPlaying(true);
        setIsLoadingAudio(false);
        source.start(0);
      } else {
        throw new Error("No audio data");
      }
    } catch (e) {
      console.error("Audio Playback Error:", e);
      setAudioError(true);
      setIsPlaying(false);
      setIsLoadingAudio(false);
    }
  };

  const handleAnswer = (option: string) => {
    if (feedback) return;
    const isCorrect = option === current.correctAnswer;
    if (isCorrect) setScore(s => s + 2);
    setFeedback(isCorrect ? "Chính xác! 🎉" : `Chưa đúng. Đáp án: ${current.correctAnswer}`);
    
    setTimeout(() => {
      setFeedback(null);
      if (index < questions.length - 1) setIndex(i => i + 1);
      else onComplete(score + (isCorrect ? 2 : 0));
    }, 2000);
  };

  if (!current) return null;

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-[2.5rem] p-8 shadow-2xl animate-fade-in border-4 border-blue-50">
      <div className="text-center mb-8">
        <h3 className="text-[10px] font-black text-gray-400 mb-6 uppercase tracking-[0.2em]">Listening Challenge {index + 1}/{questions.length}</h3>
        
        <div className="flex flex-col items-center">
          {readingCountdown > 0 ? (
            <div className="animate-fade-in p-8 bg-blue-50/50 rounded-full border-2 border-dashed border-blue-100 flex flex-col items-center">
              <div className="text-6xl font-black text-blue-500 mb-2 leading-none">{readingCountdown}s</div>
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest text-center max-w-[120px]">Hãy xem lướt qua các lựa chọn</p>
              <button onClick={() => setReadingCountdown(0)} className="text-blue-600 font-black text-xs mt-4 hover:underline">Vào nghe luôn 🚀</button>
            </div>
          ) : (
            <div className="relative">
              <button 
                onClick={playAudio} 
                disabled={isPlaying || isLoadingAudio}
                className={`rounded-full p-10 transition-all shadow-2xl relative z-10 ${
                  isLoadingAudio ? 'bg-amber-400 scale-110' : 
                  isPlaying ? 'bg-indigo-500 scale-105' : 
                  'bg-blue-600 hover:scale-110 active:scale-95'
                }`}
              >
                {isLoadingAudio ? (
                  <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className={`w-12 h-12 text-white ${isPlaying ? 'animate-pulse' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 5.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                )}
              </button>
              
              {isPlaying && (
                <div className="absolute inset-0 animate-ping rounded-full bg-indigo-400 opacity-20"></div>
              )}

              {audioError && <p className="text-red-500 text-[10px] mt-4 font-black uppercase tracking-widest">Lỗi kết nối âm thanh ❄️</p>}
              <p className="mt-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] animate-fade-in">
                {isLoadingAudio ? "AI đang chuẩn bị..." : isPlaying ? "Đang phát bài..." : "Nhấn để nghe giọng nói ấm áp"}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-blue-50/50 rounded-3xl p-8 mb-8 border-2 border-dashed border-blue-100 shadow-inner">
        <p className="text-xl md:text-2xl font-black text-gray-800 text-center leading-tight">{current.questionText}</p>
      </div>

      <div className="grid gap-4">
        {current.options?.map((opt, i) => (
          <Button 
            key={i} 
            onClick={() => handleAnswer(opt)} 
            variant="outline" 
            fullWidth 
            disabled={!!feedback || readingCountdown > 0} 
            className={`text-lg py-5 rounded-2xl border-2 transition-all font-bold ${feedback ? 'opacity-50' : 'hover:border-blue-400 hover:bg-blue-50/50'}`}
          >
            {opt}
          </Button>
        ))}
      </div>

      {feedback && (
        <div className={`mt-8 p-6 rounded-3xl text-center font-black text-lg animate-fade-in-up border-4 ${feedback.includes('Chính xác') ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {feedback}
        </div>
      )}
    </div>
  );
};
