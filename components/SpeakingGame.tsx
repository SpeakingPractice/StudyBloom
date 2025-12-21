
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
  const [feedback, setFeedback] = useState<{ score: number; message: string; level: string; reconstructedTranscript?: string } | null>(null);
  const [statusText, setStatusText] = useState("");
  const [userAudioUrl, setUserAudioUrl] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const shouldListenRef = useRef<boolean>(false);
  const finalTranscriptRef = useRef<string>("");

  const current = questions[index];
  
  // @ts-ignore
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  useEffect(() => {
    return () => stopRecordingSession();
  }, [index]);

  if (!current) return null;

  const startRecordingSession = async () => {
    if (!Recognition) {
      alert("Trình duyệt không hỗ trợ nhận diện giọng nói.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setUserAudioUrl(URL.createObjectURL(audioBlob));
      };
      mediaRecorder.start();
    } catch (err) { console.error("Mic Error:", err); }

    setFeedback(null);
    setTranscript("");
    setUserAudioUrl(null);
    finalTranscriptRef.current = "";
    shouldListenRef.current = true;
    setIsListening(true);
    setStatusText("Hệ thống đang thấu hiểu ngữ cảnh...");

    const recognition = new Recognition();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalTranscriptRef.current += event.results[i][0].transcript + ' ';
        else interim += event.results[i][0].transcript;
      }
      setTranscript(finalTranscriptRef.current + interim);
    };
    recognition.onend = () => { if (shouldListenRef.current) try { recognition.start(); } catch (e) {} };
    recognitionRef.current = recognition;
    try { recognition.start(); } catch (e) { setIsListening(false); }
  };

  const stopRecordingSession = async () => {
    shouldListenRef.current = false;
    if (recognitionRef.current) recognitionRef.current.stop();
    if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
    setIsListening(false);
    setStatusText("");

    const fullTranscript = transcript.trim();
    if (!fullTranscript) return;

    setIsEvaluating(true);
    const result = await evaluateSpeaking(current.speakingTarget || current.questionText, fullTranscript, grade);
    setIsEvaluating(false);

    if (result) {
      setFeedback({
        score: result.score,
        message: result.feedback,
        level: result.correctnessLevel,
        reconstructedTranscript: result.reconstructedTranscript
      });
      setTotalScore(prev => prev + (result.score / 100) * 2);
    }
  };

  const nextQuestion = () => {
    setFeedback(null);
    setTranscript("");
    setUserAudioUrl(null);
    if (index < questions.length - 1) setIndex(i => i + 1);
    else onComplete(Math.round(totalScore));
  };

  const renderHintList = (hint: string | undefined) => {
    if (!hint) return null;
    // Split by common delimiters like |, \n, or bullet marks
    const points = hint.split(/[|\n]+/).map(p => p.trim().replace(/^[•\-\*\s]+/, '')).filter(p => p.length > 0);
    return (
      <div className="space-y-3">
        {points.map((p, i) => (
          <div key={i} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-blue-100 shadow-sm">
             <span className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0"></span>
             <span className="text-sm text-blue-800 font-bold">{p}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-[2.5rem] p-6 md:p-10 shadow-2xl border-4 border-blue-50 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <span className="text-[10px] font-black bg-blue-100 text-blue-600 px-4 py-1.5 rounded-full uppercase tracking-widest">BÀI TẬP {index + 1}/{questions.length}</span>
        <div className="flex items-center gap-2">
           <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
           <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">AI Context Understanding</span>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-2xl font-black text-gray-800 mb-6 leading-tight">{current.questionText}</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-blue-50/50 p-6 rounded-3xl border-2 border-dashed border-blue-100">
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4">Ý chính gợi ý</p>
            {renderHintList(current.hint)}
          </div>
          <div className="space-y-6">
            <div className="bg-amber-50/50 p-6 rounded-3xl border-2 border-dashed border-amber-100">
              <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-4">Từ vựng nên dùng</p>
              <div className="flex flex-wrap gap-2">
                {current.meaning?.split(',').map((w, i) => (
                  <span key={i} className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black border border-amber-200">{w.trim()}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8 min-h-[7rem] bg-gray-50 rounded-3xl p-6 border-2 border-gray-100 flex items-center justify-center relative overflow-hidden">
        {isEvaluating ? (
          <div className="flex flex-col items-center gap-2">
             <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
             <p className="text-[10px] font-black text-blue-600 uppercase">AI đang chấm bài...</p>
          </div>
        ) : feedback?.reconstructedTranscript ? (
          <div className="w-full">
            <p className="text-[9px] font-black text-emerald-500 uppercase mb-2 text-center">AI Hiểu rằng bạn đã nói:</p>
            <p className="text-emerald-900 text-lg font-bold italic text-center">"{feedback.reconstructedTranscript}"</p>
          </div>
        ) : transcript ? (
          <p className="text-gray-800 text-lg font-bold italic text-center">"{transcript}"</p>
        ) : (
          <p className="text-gray-400 font-bold italic text-sm text-center">...</p>
        )}
      </div>

      {feedback ? (
        <div className="mb-8 p-8 rounded-[2rem] bg-white border-4 border-gray-50 shadow-xl animate-fade-in text-left">
           <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                 <div className="text-3xl">🌟</div>
                 <h4 className="font-black text-gray-800 uppercase text-xl">Đánh Giá</h4>
              </div>
              <div className="w-20 h-20 rounded-full flex flex-col items-center justify-center font-black bg-green-50 border-4 border-green-200 text-green-600">
                <span className="text-2xl">{feedback.score}</span>
              </div>
           </div>
           <p className="text-gray-700 font-bold leading-relaxed mb-8">{feedback.message}</p>
           <div className="grid grid-cols-2 gap-4">
             <Button onClick={startRecordingSession} variant="outline" className="py-4">Thử lại</Button>
             <Button onClick={nextQuestion} variant="secondary" className="py-4">Tiếp theo →</Button>
           </div>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <Button onClick={isListening ? stopRecordingSession : startRecordingSession} variant={isListening ? 'danger' : 'primary'}
            className={`rounded-full w-32 h-32 flex items-center justify-center transition-all ${isListening ? 'ring-8 ring-red-100 scale-110 shadow-lg' : 'hover:scale-105'}`}>
            <span className="font-black text-white">{isListening ? 'XÁC NHẬN' : 'BẮT ĐẦU'}</span>
          </Button>
          <p className="mt-4 text-[10px] text-gray-400 font-black uppercase tracking-widest">{isListening ? "Hệ thống đang lắng nghe..." : "Nhấn để nói"}</p>
        </div>
      )}
    </div>
  );
};
