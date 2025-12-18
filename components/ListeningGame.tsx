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
  const [feedback, setFeedback] = useState<string | null>(null);
  const [readingCountdown, setReadingCountdown] = useState(15);
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const prefetchedBufferRef = useRef<AudioBuffer | null>(null);
  const nextPrefetchedBufferRef = useRef<AudioBuffer | null>(null);

  const current = questions[index];

  // Initialize AudioContext
  const getAudioCtx = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current;
  };

  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  // Handle prefetching when index changes
  useEffect(() => {
    stopAudio();
    setReadingCountdown(15);
    
    // If we already have the buffer from a previous next-prefetch, use it
    if (nextPrefetchedBufferRef.current) {
      prefetchedBufferRef.current = nextPrefetchedBufferRef.current;
      nextPrefetchedBufferRef.current = null;
    } else {
      prefetchedBufferRef.current = null;
      if (current?.listeningScript) {
        prefetchAudio(current.listeningScript, true);
      }
    }

    // Prefetch the next question in the background for zero-latency transition
    const nextQ = questions[index + 1];
    if (nextQ?.listeningScript) {
      prefetchAudio(nextQ.listeningScript, false);
    }
  }, [index]);

  useEffect(() => {
    if (readingCountdown > 0) {
      const timer = setTimeout(() => setReadingCountdown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [readingCountdown]);

  const decodeBase64 = (base64: string) => {
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const decodeAudioDataToBuffer = async (data: Uint8Array, ctx: AudioContext): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < dataInt16.length; i++) {
      channelData[i] = dataInt16[i] / 32768.0;
    }
    return buffer;
  };

  const prefetchAudio = async (script: string, isCurrent: boolean) => {
    try {
      const audioData = await generateSpeech(script);
      if (audioData) {
        const ctx = getAudioCtx();
        const bytes = decodeBase64(audioData);
        const buffer = await decodeAudioDataToBuffer(bytes, ctx);
        if (isCurrent) prefetchedBufferRef.current = buffer;
        else nextPrefetchedBufferRef.current = buffer;
      }
    } catch (e) {
      console.error("Prefetch Error:", e);
    }
  };

  const stopAudio = () => {
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop();
      } catch (e) {}
      currentSourceRef.current = null;
    }
    setIsPlaying(false);
  };

  const playAudio = async () => {
    if (!current?.listeningScript || isPlaying) return;
    
    // Attempt immediate playback from prefetched buffer
    if (prefetchedBufferRef.current) {
      startPlayback(prefetchedBufferRef.current);
    } else {
      // Fallback only if prefetch failed or didn't finish
      setIsPlaying(true);
      const audioData = await generateSpeech(current.listeningScript);
      if (audioData) {
        const ctx = getAudioCtx();
        const bytes = decodeBase64(audioData);
        const buffer = await decodeAudioDataToBuffer(bytes, ctx);
        startPlayback(buffer);
      } else {
        alert("Lỗi âm thanh. Hãy thử lại.");
        setIsPlaying(false);
      }
    }
  };

  const startPlayback = (buffer: AudioBuffer) => {
    const ctx = getAudioCtx();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.onended = () => setIsPlaying(false);
    currentSourceRef.current = source;
    setIsPlaying(true);
    source.start(0);
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
    <div className="max-w-2xl mx-auto bg-white rounded-3xl p-8 shadow-xl">
      <div className="text-center mb-8">
        <h3 className="text-xl font-bold text-gray-400 mb-6 uppercase tracking-widest">Listening Challenge {index + 1}/{questions.length}</h3>
        
        <div className="flex flex-col items-center">
          {readingCountdown > 0 ? (
            <div className="animate-fade-in">
              <div className="text-5xl font-black text-blue-500 mb-2">{readingCountdown}s</div>
              <p className="text-xs font-bold text-gray-400 uppercase">Hãy đọc kỹ câu hỏi trước khi nghe</p>
              <button onClick={() => setReadingCountdown(0)} className="text-blue-500 underline text-xs mt-2">Nghe luôn</button>
            </div>
          ) : (
            <>
              <button 
                onClick={playAudio}
                disabled={isPlaying}
                className={`rounded-full p-8 transition-all shadow-xl ${isPlaying ? 'bg-indigo-100 text-indigo-400 animate-pulse' : 'bg-blue-600 text-white hover:scale-110 active:scale-95'}`}
              >
                <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 5.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              </button>
              <p className="mt-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
                {isPlaying ? "Đang phát âm thanh tự nhiên..." : "Bấm để nghe giọng nói ấm áp"}
              </p>
            </>
          )}
        </div>
      </div>

      <div className={`bg-blue-50/50 rounded-2xl p-6 mb-8 border border-blue-100 transition-all ${readingCountdown > 0 ? 'scale-105 ring-2 ring-blue-300' : ''}`}>
        <p className="text-xl font-black text-gray-800 text-center">{current.questionText}</p>
      </div>

      <div className="grid gap-4">
        {current.options?.map((opt, i) => (
          <Button 
            key={i} 
            onClick={() => handleAnswer(opt)} 
            variant="outline" 
            fullWidth 
            disabled={!!feedback || readingCountdown > 0}
            className="text-lg py-5"
          >
            {opt}
          </Button>
        ))}
      </div>

      {feedback && (
        <div className={`mt-6 p-4 rounded-xl text-center font-black text-lg animate-fade-in-up ${feedback.includes('Chính xác') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {feedback}
        </div>
      )}
    </div>
  );
};