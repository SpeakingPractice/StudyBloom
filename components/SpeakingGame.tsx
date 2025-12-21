
import React, { useState, useEffect, useRef } from 'react';
import { QuestionData } from '../types';
import { Button } from './Button';
import { evaluateSpeaking } from '../services/geminiService';

interface SpeakingGameProps {
  questions: QuestionData[];
  onComplete: (score: number) => void;
  grade?: string;
}

export const SpeakingGame: React.FC<SpeakingGameProps> = ({ questions, onComplete, grade = "Secondary School" }) => {
  const [index, setIndex] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [feedback, setFeedback] = useState<{ score: number; message: string; level: string } | null>(null);
  const [statusText, setStatusText] = useState("");

  const recognitionRef = useRef<any>(null);
  const shouldListenRef = useRef<boolean>(false);
  const finalTranscriptRef = useRef<string>("");

  const current = questions[index];
  
  // @ts-ignore
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  useEffect(() => {
    return () => {
      stopRecordingSession();
    };
  }, [index]);

  if (!current) return null;

  const toggleRecord = () => {
    if (isListening) {
      stopRecordingSession();
    } else {
      startRecordingSession();
    }
  };

  const startRecordingSession = () => {
    if (!Recognition) {
      alert("Trình duyệt của bạn không hỗ trợ nhận diện giọng nói (hãy thử dùng Google Chrome).");
      return;
    }

    setFeedback(null);
    setTranscript("");
    finalTranscriptRef.current = "";
    shouldListenRef.current = true;
    setIsListening(true);
    setStatusText("Hệ thống đang thấu hiểu ngữ cảnh...");

    const recognition = new Recognition();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscriptRef.current += result[0].transcript + ' ';
        } else {
          interimTranscript += result[0].transcript;
        }
      }
      setTranscript(finalTranscriptRef.current + interimTranscript);
    };

    recognition.onend = () => {
      if (shouldListenRef.current) {
        try { recognition.start(); } catch (e) {}
      } else {
        setIsListening(false);
      }
    };

    try {
      recognition.start();
    } catch (e) {
      setIsListening(false);
    }
  };

  const stopRecordingSession = async () => {
    shouldListenRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    setStatusText("");

    const fullTranscript = transcript.trim();
    if (!fullTranscript) {
      setStatusText("Hệ thống chưa nhận được âm thanh. Hãy thử lại!");
      return;
    }

    setIsEvaluating(true);
    const result = await evaluateSpeaking(current.speakingTarget || current.questionText, fullTranscript, grade);
    setIsEvaluating(false);

    if (result) {
      setFeedback({
        score: result.score,
        message: result.feedback,
        level: result.correctnessLevel
      });
      const earnedPoints = (result.score / 100) * 2;
      setTotalScore(prev => prev + earnedPoints);
    } else {
      setStatusText("Đang xử lý dữ liệu...");
    }
  };

  const nextQuestion = () => {
    setFeedback(null);
    setTranscript("");
    setStatusText("");
    finalTranscriptRef.current = "";
    if (index < questions.length - 1) {
      setIndex(i => i + 1);
    } else {
      onComplete(Math.round(totalScore));
    }
  };

  const renderHintList = (hint: string | undefined) => {
    if (!hint) return null;
    // Regex covers bullet points: •, -, *, and numbers like 1.
    const points = hint.split('\n').filter(p => p.trim().length > 0);
    return (
      <ul className="text-left space-y-2">
        {points.map((p, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-blue-800 font-bold">
            <span className="text-blue-400 mt-1 flex-shrink-0">•</span>
            <span>{p.replace(/^[•\-\*\s]+/, '')}</span>
          </li>
        ))}
      </ul>
    );
  };

  const renderVocab = (vocab: string | undefined) => {
    if (!vocab) return null;
    const words = vocab.split(',').map(w => w.trim());
    return (
      <div className="flex flex-wrap gap-2">
        {words.map((w, i) => (
          <span key={i} className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tight border border-amber-200 shadow-sm">
            {w}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-[2.5rem] p-6 md:p-10 shadow-2xl border-4 border-blue-50 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <span className="text-[10px] font-black bg-blue-100 text-blue-600 px-4 py-1.5 rounded-full uppercase tracking-widest shadow-sm">BÀI TẬP {index + 1}/{questions.length}</span>
        <div className="flex items-center gap-2">
           <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
           <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">AI Context Aware Activated</span>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-2xl font-black text-gray-800 mb-6 leading-tight">{current.questionText}</h3>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-blue-50/50 p-6 rounded-3xl border-2 border-dashed border-blue-100">
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-400 rounded-full"></span> Ý chính cần đạt
            </p>
            {renderHintList(current.hint)}
          </div>

          <div className="space-y-6">
            <div className="bg-amber-50/50 p-6 rounded-3xl border-2 border-dashed border-amber-100">
              <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-400 rounded-full"></span> Từ vựng quan trọng
              </p>
              {renderVocab(current.meaning)}
            </div>

            {current.exampleSentence && (
              <div className="bg-emerald-50/50 p-6 rounded-3xl border-2 border-dashed border-emerald-100">
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full"></span> Mẫu câu tự nhiên
                </p>
                <p className="text-sm font-bold text-emerald-800 italic leading-relaxed">"{current.exampleSentence}"</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mb-8 min-h-[7rem] bg-gray-50 rounded-3xl p-6 border-2 border-gray-100 flex items-center justify-center transition-all shadow-inner relative overflow-hidden group">
        {isEvaluating ? (
          <div className="flex flex-col items-center gap-3">
             <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
             <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest animate-pulse">AI đang thấu hiểu ý định của bạn...</p>
          </div>
        ) : transcript ? (
          <div className="w-full">
            <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.2em] mb-3 text-center">Ghi nhận thời gian thực:</p>
            <p className="text-gray-800 text-lg md:text-xl font-bold italic text-center leading-relaxed">"{transcript}"</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
             <p className="text-gray-400 font-bold italic text-sm text-center">...</p>
          </div>
        )}
        {isListening && (
          <div className="absolute bottom-0 left-0 h-1.5 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 animate-gradient-x w-full"></div>
        )}
      </div>
      
      {statusText && <p className="text-[10px] font-black text-amber-600 mb-6 animate-pulse text-center uppercase tracking-widest">{statusText}</p>}

      {feedback ? (
        <div className="mb-8 p-8 rounded-[2rem] bg-white border-4 border-gray-50 shadow-xl animate-fade-in-up text-left">
           <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                 <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-3xl shadow-sm">
                    {feedback.score >= 80 ? '🌟' : feedback.score >= 50 ? '👏' : '🎯'}
                 </div>
                 <div>
                    <h4 className="font-black text-gray-800 uppercase tracking-tight text-xl">Đánh giá thấu hiểu</h4>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Context-Aware AI Feedback</p>
                 </div>
              </div>
              <div className={`w-20 h-20 rounded-full flex flex-col items-center justify-center font-black border-4 shadow-lg ${feedback.score >= 80 ? 'bg-green-50 border-green-200 text-green-600' : feedback.score >= 50 ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-red-50 border-red-200 text-red-600'}`}>
                <span className="text-2xl">{feedback.score}</span>
                <span className="text-[8px] uppercase tracking-tighter opacity-60">SCORE</span>
              </div>
           </div>
           
           <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 mb-8 shadow-inner">
              <p className="text-gray-700 font-bold leading-relaxed">{feedback.message}</p>
              <div className="mt-4 flex items-center gap-2">
                 <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                 <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Success Level: {feedback.level}</p>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-4">
             <Button onClick={startRecordingSession} variant="outline" className="py-5 rounded-2xl font-black text-xs uppercase">Thử lại 🔄</Button>
             <Button onClick={nextQuestion} variant="secondary" className="py-5 rounded-2xl shadow-lg font-black text-xs uppercase">Tiếp theo →</Button>
           </div>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <Button 
            onClick={toggleRecord} 
            variant={isListening ? 'danger' : 'primary'}
            disabled={isEvaluating}
            className={`rounded-full w-36 h-36 flex flex-col items-center justify-center transition-all shadow-[0_20px_50px_rgba(0,0,0,0.2)] relative ${isListening ? 'ring-8 ring-red-100 scale-110 shadow-red-500/30' : 'hover:scale-105 active:scale-95 shadow-blue-600/30'}`}
          >
            {isListening ? (
               <div className="flex flex-col items-center">
                  <div className="w-12 h-12 bg-white rounded-2xl mb-3 animate-pulse shadow-inner"></div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white">XÁC NHẬN</span>
               </div>
            ) : (
              <div className="flex flex-col items-center">
                <svg className="w-16 h-16 mb-2 drop-shadow-md text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                <span className="text-[10px] font-black uppercase tracking-widest text-white">BẮT ĐẦU NÓI</span>
              </div>
            )}
          </Button>
          <div className="mt-8 flex flex-col items-center gap-1">
             <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.3em] animate-pulse">
                {isListening ? "HỆ THỐNG ĐANG LẮNG NGHE..." : "TAP TO RECORD"}
             </p>
          </div>
        </div>
      )}
      
      {!feedback && (
        <div className="mt-10 flex justify-center border-t border-gray-50 pt-6">
          <button onClick={nextQuestion} className="text-[9px] font-black text-gray-300 hover:text-blue-600 transition-colors uppercase tracking-[0.2em]">Skip this task</button>
        </div>
      )}
    </div>
  );
};
