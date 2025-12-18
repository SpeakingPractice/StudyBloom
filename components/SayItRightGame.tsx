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
  const [attempts, setAttempts] = useState(0);
  const [streak, setStreak] = useState(0);

  const recognitionRef = useRef<any>(null);
  const current = questions[index];

  // @ts-ignore
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  const playModel = async () => {
    if (isModelPlaying) return;
    setIsModelPlaying(true);
    const audioData = await generateSpeech(current.questionText);
    if (audioData) {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const binaryString = window.atob(audioData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
      const dataInt16 = new Int16Array(bytes.buffer);
      const buffer = audioCtx.createBuffer(1, dataInt16.length, 24000);
      const channelData = buffer.getChannelData(0);
      for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtx.destination);
      source.onended = () => setIsModelPlaying(false);
      source.start(0);
    } else {
      setIsModelPlaying(false);
    }
  };

  const startListening = () => {
    if (!Recognition) {
      alert("Microphone not supported in this browser.");
      return;
    }
    setFeedback(null);
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
      setAttempts(0);
    } else {
      onComplete(score);
    }
  };

  if (!current) return null;

  return (
    <div className="max-w-2xl mx-auto w-full bg-white/90 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/50 text-center animate-fade-in relative overflow-hidden">
      {/* Decorative background stars */}
      <div className="absolute top-4 left-4 text-2xl opacity-20 animate-spin-slow">✨</div>
      <div className="absolute bottom-4 right-4 text-2xl opacity-20 animate-bounce">🌟</div>

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
           <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest">Streak: {streak} 🔥</span>
        </div>
        <div className="text-gray-400 font-bold text-xs uppercase tracking-tighter">Round {index + 1}/{questions.length}</div>
      </div>

      <h2 className="text-4xl md:text-5xl font-black text-gray-800 mb-2 tracking-tight">
        {current.questionText}
      </h2>
      <p className="text-blue-500 font-mono text-lg mb-8">{current.explanation}</p>

      <div className="grid grid-cols-1 gap-6 mb-10">
        <div className="flex justify-center gap-4">
          <Button 
            onClick={playModel} 
            variant="outline" 
            disabled={isModelPlaying}
            className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl shadow-lg border-2 border-blue-100 transition-all ${isModelPlaying ? 'animate-pulse scale-110 bg-blue-50' : 'hover:bg-blue-50 active:scale-95'}`}
          >
            🔊
          </Button>

          <Button 
            onClick={startListening}
            variant={isListening ? 'danger' : 'primary'}
            disabled={isEvaluating || isListening}
            className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl shadow-xl transition-all ${isListening ? 'animate-ping ring-4 ring-red-100' : 'hover:scale-110 active:scale-95'}`}
          >
            {isEvaluating ? '⏳' : isListening ? '⏹️' : '🎙️'}
          </Button>
        </div>
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
           {isListening ? "Listening..." : isEvaluating ? "Evaluating..." : "Listen then speak!"}
        </p>
      </div>

      {feedback && (
        <div className={`p-6 rounded-2xl border-2 mb-8 animate-fade-in-up shadow-lg ${feedback.isCorrect ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-3xl">{feedback.isCorrect ? "⭐" : "💡"}</span>
            <h4 className={`text-xl font-black uppercase tracking-tight ${feedback.isCorrect ? 'text-green-600' : 'text-orange-600'}`}>
              {feedback.message}
            </h4>
          </div>
          <p className="text-gray-600 text-sm italic">"{feedback.advice}"</p>
        </div>
      )}

      <div className="flex justify-center gap-3">
         {feedback?.isCorrect ? (
           <Button onClick={next} variant="secondary" size="lg" className="w-full md:w-auto px-12">
             Tiếp tục (Next) →
           </Button>
         ) : feedback ? (
           <Button onClick={() => setFeedback(null)} variant="outline" size="lg" className="w-full md:w-auto px-12">
             Thử lại (Try Again) 🔄
           </Button>
         ) : null}
      </div>

      {!feedback && (
         <div className="mt-6 flex justify-center">
            <button onClick={next} className="text-[10px] font-black text-gray-400 hover:text-blue-500 transition-colors uppercase tracking-widest underline underline-offset-4">Skip Round</button>
         </div>
      )}

      <div className="mt-8 bg-gray-100/50 rounded-full h-2 overflow-hidden w-full">
        <div 
          className="bg-blue-400 h-full transition-all duration-1000"
          style={{ width: `${((index) / questions.length) * 100}%` }}
        />
      </div>
    </div>
  );
};