
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
  const [audioError, setAudioError] = useState(false);
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const current = questions[index];

  const initAudioCtx = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
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
  };

  const playAudio = async () => {
    if (!current?.listeningScript || isPlaying) return;
    
    const ctx = initAudioCtx();
    if (ctx.state === 'suspended') await ctx.resume();

    setIsPlaying(true);
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
        source.onended = () => setIsPlaying(false);
        currentSourceRef.current = source;
        source.start(0);
      } else {
        throw new Error("No audio data");
      }
    } catch (e) {
      console.error("Audio Playback Error:", e);
      setAudioError(true);
      setIsPlaying(false);
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
    <div className="max-w-2xl mx-auto bg-white rounded-3xl p-8 shadow-xl animate-fade-in">
      <div className="text-center mb-8">
        <h3 className="text-xl font-bold text-gray-400 mb-6 uppercase tracking-widest">Listening Challenge {index + 1}/{questions.length}</h3>
        
        <div className="flex flex-col items-center">
          {readingCountdown > 0 ? (
            <div className="animate-fade-in">
              <div className="text-5xl font-black text-blue-500 mb-2">{readingCountdown}s</div>
              <p className="text-xs font-bold text-gray-400 uppercase">Đọc kỹ câu hỏi trước khi nghe</p>
              <button onClick={() => setReadingCountdown(0)} className="text-blue-500 underline text-xs mt-2">Nghe luôn</button>
            </div>
          ) : (
            <>
              <button onClick={playAudio} disabled={isPlaying}
                className={`rounded-full p-8 transition-all shadow-xl ${isPlaying ? 'bg-indigo-100 text-indigo-400 animate-pulse' : 'bg-blue-600 text-white hover:scale-110 active:scale-95'}`}>
                <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 5.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              </button>
              {audioError && <p className="text-red-500 text-[10px] mt-2 font-bold">Lỗi âm thanh, hãy nhấn lại.</p>}
              <p className="mt-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
                {isPlaying ? "Đang phát..." : "Bấm để nghe giọng nói ấm áp"}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="bg-blue-50/50 rounded-2xl p-6 mb-8 border border-blue-100">
        <p className="text-xl font-black text-gray-800 text-center">{current.questionText}</p>
      </div>

      <div className="grid gap-4">
        {current.options?.map((opt, i) => (
          <Button key={i} onClick={() => handleAnswer(opt)} variant="outline" fullWidth disabled={!!feedback || readingCountdown > 0} className="text-lg py-5">
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
