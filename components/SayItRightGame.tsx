import React, { useState, useEffect, useRef } from 'react';
import { QuestionData } from '../types';
import { Button } from './Button';
import { generateSpeech, evaluatePronunciation } from '../services/geminiService';

interface SayItRightGameProps {
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

  // Prefetch audio whenever the word changes to ensure "instantly with no delay" playback
  useEffect(() => {
    setPrefetchedAudio(null);
    if (current) {
      const loadAudio = async () => {
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
      alert("Microphone not supported in this browser.");
      return;
    }
    // We don't reset feedback immediately so they can alternate listen/speak smoothly
    setIsListening(true);
    const recognition = new Recognition();
    recognition.lang = 'en-US';
    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIsListening(false);
      setIsEvaluating(true);
      
      const result = await evaluatePronunciation(current.questionText, transcript);
      setIsEvaluating(false);
      
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
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
    recognitionRef.current = recognition;
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
    <div className="max-w-2xl mx-auto w-full bg-[#fdfaf3]/95 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/50 text-center animate-fade-in relative overflow-hidden">
      {/* Header Info */}
      <div className="flex justify-between items-center mb-12">
        <div className="bg-[#fff1cc] text-[#9a6a12] px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest shadow-sm">
          Streak: {streak} 🔥
        </div>
        <div className="text-gray-400 font-bold text-xs uppercase tracking-tighter">Round {index + 1}/{questions.length}</div>
      </div>

      {/* Target Word */}
      <h2 className="text-6xl md:text-7xl font-black text-[#2d3436] mb-8 tracking-tight drop-shadow-sm">
        {current.questionText}
      </h2>
      
      {/* Simplified Layout for Phonics and Meaning */}
      <div className="space-y-1 mb-12 text-[#2d98da] font-bold">
        <p className="text-lg md:text-xl">
          Phát âm: <span className="font-mono text-[#45aaf2]">/{current.phonetic || '...'}/</span>
        </p>
        <p className="text-lg md:text-xl">
          Ý nghĩa: <span className="text-[#4b7bec]">{current.meaning || '...'}</span>
        </p>
      </div>

      {/* Interaction Buttons - Speaking First Design */}
      <div className="flex flex-col items-center gap-6 mb-12">
        <div className="flex justify-center gap-8">
          {/* Listening Button (On demand) */}
          <Button 
            onClick={playModel} 
            variant="outline" 
            className={`w-24 h-24 rounded-3xl flex items-center justify-center text-4xl shadow-lg border-4 border-white transition-all bg-white hover:bg-blue-50 active:scale-95 ${isModelPlaying ? 'animate-pulse ring-4 ring-blue-100' : ''}`}
            title="Listen to pronunciation"
          >
            {isModelPlaying ? '🔊' : '🔈'}
          </Button>

          {/* Speaking Button (Active/Primary) */}
          <Button 
            onClick={startListening}
            variant={isListening ? 'danger' : 'primary'}
            disabled={isEvaluating}
            className={`w-24 h-24 rounded-3xl flex items-center justify-center text-4xl shadow-xl border-4 border-white transition-all ${isListening ? 'animate-ping' : 'hover:scale-110 active:scale-95'}`}
            title="Speak now!"
          >
            {isEvaluating ? '⏳' : isListening ? '⏹️' : '🎙️'}
          </Button>
        </div>
        
        <p className="text-[11px] text-gray-400 font-black uppercase tracking-[0.2em] animate-pulse">
           {isListening ? "Listening..." : isEvaluating ? "Evaluating..." : "LISTEN THEN SPEAK!"}
        </p>
      </div>

      {/* Feedback Card */}
      {feedback && (
        <div className={`p-6 rounded-2xl border-2 mb-8 animate-fade-in-up shadow-lg transition-all ${feedback.isCorrect ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="text-3xl">{feedback.isCorrect ? "🌟" : "💡"}</span>
            <h4 className={`text-xl font-black uppercase tracking-tight ${feedback.isCorrect ? 'text-green-600' : 'text-amber-600'}`}>
              {feedback.message}
            </h4>
          </div>
          <p className="text-gray-600 text-sm italic font-medium leading-relaxed px-4">"{feedback.advice}"</p>
        </div>
      )}

      {/* Navigation and Effort Note */}
      <div className="flex flex-col items-center gap-8">
        {feedback?.isCorrect ? (
          <Button onClick={next} variant="secondary" size="lg" className="w-full md:w-auto px-16 text-lg py-5 shadow-xl">
            Tiếp tục (Next) →
          </Button>
        ) : feedback ? (
          <div className="flex gap-4 w-full justify-center">
            <Button onClick={() => setFeedback(null)} variant="outline" size="lg" className="px-8 bg-white border-gray-200">
              Thử lại 🔄
            </Button>
            <Button onClick={next} variant="secondary" size="lg" className="px-8">
              Bỏ qua ⏭️
            </Button>
          </div>
        ) : (
          <button 
            onClick={next} 
            className="text-[11px] font-black text-gray-400 hover:text-blue-500 transition-colors uppercase tracking-[0.2em] border-b-2 border-transparent hover:border-blue-200 pb-1"
          >
            SKIP ROUND
          </button>
        )}

        {/* Anxiety Reduction Note */}
        <p className="text-[10px] text-gray-300 font-bold uppercase italic max-w-xs mx-auto leading-relaxed">
          Reward effort and improvement more than accuracy. <br/> Confidence comes before perfection.
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mt-12 bg-gray-100 rounded-full h-2.5 overflow-hidden w-full shadow-inner">
        <div 
          className="bg-blue-400 h-full transition-all duration-700 ease-out"
          style={{ width: `${((index + (feedback?.isCorrect ? 1 : 0)) / questions.length) * 100}%` }}
        />
      </div>
    </div>
  );
};
