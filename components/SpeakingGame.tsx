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

  const current = questions[index];
  
  // @ts-ignore
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        shouldListenRef.current = false;
        recognitionRef.current.stop();
      }
    };
  }, [index]);

  if (!current) return null;

  const toggleRecord = () => {
    if (isListening) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const startRecording = () => {
    if (!Recognition) {
      alert("Trình duyệt của bạn không hỗ trợ nhận diện giọng nói (hãy thử dùng Google Chrome).");
      return;
    }

    setFeedback(null);
    setTranscript("");
    shouldListenRef.current = true;

    const recognition = new Recognition();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognitionRef.current = recognition;

    setIsListening(true);
    setStatusText("Đang lắng nghe... (Listening...)");

    try {
      recognition.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
      setStatusText("Lỗi khởi động micro.");
    }

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      
      const currentText = finalTranscript || interimTranscript;
      setTranscript(currentText);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech Recognition Error:", event.error);
      if (event.error === 'not-allowed') {
        setStatusText("Vui lòng cấp quyền micro!");
        shouldListenRef.current = false;
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      if (shouldListenRef.current) {
        try { recognition.start(); } catch (e) {}
      } else {
        setIsListening(false);
      }
    };
  };

  const stopRecording = async () => {
    shouldListenRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    setStatusText("");

    if (!transcript.trim()) {
      setStatusText("Bạn chưa nói gì cả. Hãy thử lại!");
      return;
    }

    // Trigger AI Evaluation
    setIsEvaluating(true);
    const result = await evaluateSpeaking(current.speakingTarget || "", transcript, grade);
    setIsEvaluating(false);

    if (result) {
      setFeedback({
        score: result.score,
        message: result.feedback,
        level: result.correctnessLevel
      });
      // Add to session score (scaled to 2 points max per question)
      const earnedPoints = (result.score / 100) * 2;
      setTotalScore(prev => prev + earnedPoints);
    } else {
      setStatusText("Lỗi chấm điểm. Hãy thử lại!");
    }
  };

  const nextQuestion = () => {
    setFeedback(null);
    setTranscript("");
    setStatusText("");
    if (index < questions.length - 1) {
      setIndex(i => i + 1);
    } else {
      onComplete(Math.round(totalScore));
    }
  };

  if (!Recognition) return <div className="text-center p-8 bg-white rounded-3xl">Trình duyệt không hỗ trợ Speaking. Hãy dùng Chrome.</div>;

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-3xl p-8 shadow-xl text-center animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <span className="text-xs font-black bg-blue-50 text-blue-500 px-3 py-1 rounded-full uppercase tracking-widest">Question {index + 1}/{questions.length}</span>
        <span className="text-xs font-bold text-gray-400">{current.topic}</span>
      </div>

      <h3 className="text-lg font-bold text-gray-500 mb-2">{current.questionText}</h3>
      
      <div className="bg-blue-50/50 p-6 rounded-3xl mb-8 border-2 border-dashed border-blue-200 relative overflow-hidden">
        <div className="absolute top-2 left-2 opacity-10">
           <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21L14.017 18C14.017 16.8954 13.1216 16 12.017 16L9.017 16C7.91243 16 7.017 16.8954 7.017 18L7.017 21L4.017 21L4.017 18C4.017 15.2386 6.25557 13 9.017 13L12.017 13C14.7784 13 17.017 15.2386 17.017 18L17.017 21L14.017 21ZM12 11C9.23858 11 7 8.76142 7 6C7 3.23858 9.23858 1 12 1C14.7614 1 17 3.23858 17 6C17 8.76142 14.7614 11 12 11Z"/></svg>
        </div>
        <p className="text-3xl font-black text-blue-700 leading-tight select-none">{current.speakingTarget}</p>
      </div>

      <div className="mb-6 min-h-[4rem] bg-gray-50 rounded-2xl p-5 border border-gray-100 flex items-center justify-center transition-all">
        {isEvaluating ? (
          <div className="flex items-center gap-3 text-blue-600 font-bold">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            Đang chấm điểm...
          </div>
        ) : transcript ? (
          <p className="text-gray-700 text-lg font-medium italic">"{transcript}"</p>
        ) : (
          <p className="text-gray-400 italic text-sm">Nội dung bạn nói sẽ hiện ở đây...</p>
        )}
      </div>
      
      {statusText && <p className="text-sm font-bold text-orange-500 mb-4 animate-pulse">{statusText}</p>}

      {feedback ? (
        <div className="mb-8 p-6 rounded-3xl bg-white border-2 border-gray-100 shadow-sm animate-fade-in-up text-left">
           <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                 <span className="text-2xl">{feedback.score >= 80 ? '🌟' : feedback.score >= 50 ? '👍' : '💪'}</span>
                 <h4 className="font-black text-gray-800 uppercase tracking-tight">Kết quả luyện nói</h4>
              </div>
              <div className={`px-4 py-1 rounded-full font-black text-white ${feedback.score >= 80 ? 'bg-green-500' : feedback.score >= 50 ? 'bg-orange-500' : 'bg-red-500'}`}>
                {feedback.score}%
              </div>
           </div>
           
           <div className="space-y-3">
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                 <p className="text-xs font-bold text-gray-400 uppercase mb-1">Nhận xét từ AI</p>
                 <p className="text-gray-700 text-sm leading-relaxed">{feedback.message}</p>
              </div>
           </div>

           <div className="mt-6 flex gap-3">
             <Button onClick={startRecording} variant="outline" fullWidth>Nói lại (Retry)</Button>
             <Button onClick={nextQuestion} variant="secondary" fullWidth>Tiếp theo (Next)</Button>
           </div>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <Button 
            onClick={toggleRecord} 
            variant={isListening ? 'danger' : 'primary'}
            disabled={isEvaluating}
            className={`rounded-full w-28 h-28 flex flex-col items-center justify-center transition-all shadow-xl ${isListening ? 'ring-8 ring-red-100 scale-110 animate-pulse' : 'hover:scale-105 active:scale-95'}`}
          >
            {isListening ? (
               <>
                  <div className="w-10 h-10 bg-white rounded-lg mb-2"></div>
                  <span className="text-[10px] font-black uppercase tracking-widest">Dừng lại</span>
               </>
            ) : (
              <>
                <svg className="w-12 h-12 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                <span className="text-[10px] font-black uppercase tracking-widest">Bắt đầu nói</span>
              </>
            )}
          </Button>
          <p className="text-xs text-gray-400 mt-6 font-bold uppercase tracking-widest">
              {isListening ? "Hệ thống đang ghi âm..." : "Nhấn Micro để bắt đầu"}
          </p>
        </div>
      )}
      
      {!feedback && (
        <div className="mt-8 flex justify-center">
          <Button onClick={nextQuestion} variant="outline" size="sm" className="text-gray-400 border-gray-100">Bỏ qua (Skip)</Button>
        </div>
      )}
    </div>
  );
};