
import React, { useState } from 'react';
import { QuestionData, GradeLevel } from '../types';
import { Button } from './Button';
import { evaluateWriting } from '../services/geminiService';

interface WritingGameProps {
  questions: QuestionData[];
  grade: GradeLevel;
  onComplete: (score: number) => void;
}

export const WritingGame: React.FC<WritingGameProps> = ({ questions, grade, onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [input, setInput] = useState("");
  const [isGrading, setIsGrading] = useState(false);
  const [totalAccumulatedScore, setTotalAccumulatedScore] = useState(0);
  const [result, setResult] = useState<{score: number, feedback: string, corrections: string} | null>(null);

  const current = questions[currentIndex]; 

  if (!current) return null;

  const handleSubmit = async () => {
    if (!input.trim()) return;
    setIsGrading(true);
    try {
      const evalResult = await evaluateWriting(current.questionText, input, grade);
      setResult(evalResult);
      setTotalAccumulatedScore(prev => prev + evalResult.score);
    } catch (e) {
      alert("Error grading. Try again.");
    } finally {
      setIsGrading(false);
    }
  };

  const handleNext = () => {
    setResult(null);
    setInput("");
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Khi hoàn thành tất cả các bài viết, trả về tổng điểm tích lũy
      onComplete(totalAccumulatedScore);
    }
  };

  const renderPrompt = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    return (
      <div className="space-y-3">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          const isListItem = trimmed.startsWith('-') || trimmed.startsWith('*') || /^\d+\./.test(trimmed);
          if (isListItem) {
            return (
              <div key={idx} className="flex items-start pl-4 text-blue-700/80">
                <span className="mr-2 text-blue-300 mt-1.5 flex-shrink-0">•</span>
                <span className="text-[13px] md:text-sm font-semibold leading-relaxed italic">
                  {trimmed.replace(/^[-*]\s*/, '')}
                </span>
              </div>
            );
          }
          return <h3 key={idx} className="text-lg md:text-xl font-black text-gray-800 leading-tight mb-2">{line}</h3>;
        })}
      </div>
    );
  };

  if (result) {
    return (
      <div className="max-w-3xl mx-auto bg-white rounded-3xl p-8 shadow-xl animate-fade-in border-4 border-blue-50">
        <h2 className="text-2xl font-black text-center mb-6 text-blue-800 uppercase tracking-tighter">Kết quả bài viết</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
           <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex flex-col items-center justify-center">
             <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest mb-1">Điểm số</p>
             <p className="text-5xl font-black text-blue-900">{result.score}/10</p>
           </div>
           <div className="bg-green-50 p-6 rounded-2xl border border-green-100">
             <p className="text-[10px] text-green-500 font-black uppercase tracking-widest mb-1">Nhận xét từ AI</p>
             <p className="text-gray-700 text-sm font-bold leading-relaxed">{result.feedback}</p>
           </div>
        </div>
        <div className="bg-yellow-50 p-6 rounded-2xl mb-8 border border-yellow-100 shadow-inner">
           <p className="font-black text-yellow-800 mb-2 flex items-center gap-2 uppercase text-xs">✍️ Gợi ý sửa đổi:</p>
           <p className="italic text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{result.corrections}</p>
        </div>
        <Button onClick={handleNext} fullWidth size="lg" variant="secondary" className="py-6 rounded-2xl">
          {currentIndex < questions.length - 1 ? "Bài tiếp theo →" : "Xem tổng kết cuối cùng"}
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-3xl p-6 md:p-10 shadow-xl animate-fade-in border-4 border-purple-50">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{current.topic}</span>
          <span className="text-gray-400 font-black text-[10px] uppercase tracking-widest">Writing Task</span>
        </div>
        <div className="bg-blue-50/50 p-6 md:p-8 rounded-3xl border-2 border-dashed border-blue-100 mb-8 shadow-inner">
          {renderPrompt(current.questionText)}
        </div>
      </div>
      <div className="relative">
        <textarea 
          className="w-full h-80 p-6 border-2 border-gray-100 rounded-2xl focus:border-blue-500 focus:ring-0 text-lg resize-none mb-6 font-medium text-gray-700 bg-gray-50/30 transition-all shadow-inner placeholder:text-gray-300"
          placeholder="Viết bài của bạn tại đây (ít nhất 10 ký tự)..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <div className="absolute bottom-10 right-4 text-[10px] font-bold text-gray-300 uppercase">AI chấm điểm trên thang 10</div>
      </div>
      <div className="flex flex-col md:flex-row items-center justify-center gap-4">
        <Button 
          onClick={handleSubmit} 
          disabled={isGrading || input.trim().length < 10} 
          size="lg"
          variant="primary"
          className="w-full md:w-auto min-w-[240px] py-6 rounded-2xl shadow-xl"
        >
          {isGrading ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              AI ĐANG CHẤM ĐIỂM...
            </span>
          ) : 'Nộp bài & Chấm điểm 🚀'}
        </Button>
      </div>
    </div>
  );
};
