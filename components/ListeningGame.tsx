
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
    <div className="max-w-2xl mx-auto glass-panel p-8 animate-fade-in bg-[#E8D5A3]">
      <div className="text-center mb-8">
        <h3 className="pixel-font text-[8px] text-[#5C3010] mb-6 uppercase tracking-widest">WORLD {index + 1}-{questions.length}</h3>
        
        <div className="flex flex-col items-center">
          {readingCountdown > 0 ? (
            <div className="animate-fade-in p-8 bg-[#049CD8]/10 rounded-2xl border-4 border-[#049CD8]/30 flex flex-col items-center">
              <div className="pixel-font text-4xl text-[#049CD8] mb-2 leading-none">{readingCountdown}</div>
              <p className="pixel-font text-[8px] text-[#049CD8]/70 uppercase tracking-widest text-center mt-4">READ THE OPTIONS!</p>
              <button onClick={() => setReadingCountdown(0)} className="pixel-font text-[7px] text-[#049CD8] mt-6 hover:underline">START NOW! →</button>
            </div>
          ) : (
            <div className="relative">
              <button 
                onClick={playAudio} 
                disabled={isPlaying || isLoadingAudio}
                className={`rounded-full p-10 transition-all shadow-[0_8px_0_rgba(0,0,0,0.2)] relative z-10 border-4 border-white ${
                  isLoadingAudio ? 'bg-[#FBD000]' : 
                  isPlaying ? 'bg-[#E52521]' : 
                  'bg-[#43B047] hover:scale-110 active:translate-y-1 active:shadow-none'
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
                <div className="absolute inset-0 animate-ping rounded-full bg-[#E52521] opacity-20"></div>
              )}

              {audioError && <p className="pixel-font text-[7px] text-[#E52521] mt-6 uppercase tracking-widest">AUDIO ERROR! ❄️</p>}
              <p className="mt-8 pixel-font text-[7px] text-[#5C3010]/50 uppercase tracking-widest animate-fade-in">
                {isLoadingAudio ? "AI IS PREPARING..." : isPlaying ? "PLAYING SOUND..." : "TAP TO HEAR SOUND!"}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white/40 rounded-2xl p-8 mb-8 border-4 border-[#8B6914]/10 shadow-inner">
        <p className="mario-font text-lg md:text-2xl text-[#5C3010] text-center leading-tight">{current.questionText}</p>
      </div>

      <div className="grid gap-4">
        {current.options?.map((opt, i) => (
          <button 
            key={i} 
            onClick={() => handleAnswer(opt)} 
            disabled={!!feedback || readingCountdown > 0} 
            className={`font-bold text-base md:text-lg py-6 px-6 rounded-xl border-4 transition-all shadow-[0_4px_0_rgba(0,0,0,0.1)] active:translate-y-1 active:shadow-none ${
              feedback ? 'opacity-50 pointer-events-none' : 'bg-white border-[#8B6914]/20 hover:border-[#049CD8] text-[#5D2E17]'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>

      {feedback && (
        <div className={`mt-8 p-6 rounded-2xl text-center pixel-font text-[10px] animate-fade-in-up border-4 ${feedback.includes('Chính xác') ? 'bg-[#43B047]/20 border-[#43B047] text-[#43B047]' : 'bg-[#E52521]/20 border-[#E52521] text-[#E52521]'}`}>
          {feedback}
        </div>
      )}
    </div>
  );
};
