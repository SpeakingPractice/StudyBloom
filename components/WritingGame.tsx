
import React, { useState, useEffect } from 'react';
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
  const [wordCount, setWordCount] = useState(0);

  const current = questions[currentIndex]; 

  useEffect(() => {
    const words = input.trim() ? input.trim().split(/\s+/).length : 0;
    setWordCount(words);
  }, [input]);

  if (!current) return null;

  const handleSubmit = async () => {
    if (!input.trim()) return;
    setIsGrading(true);
    setResult(null); // Clear old results
    try {
      const evalResult = await evaluateWriting(current.questionText, input, grade);
      setResult(evalResult);
      setTotalAccumulatedScore(prev => prev + evalResult.score);
    } catch (e) {
      alert("Lỗi chấm điểm. Hãy thử lại!");
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
      onComplete(totalAccumulatedScore);
    }
  };

  if (result) {
    return (
      <div className="max-w-3xl mx-auto bg-white rounded-3xl p-8 shadow-xl animate-fade-in border-4 border-blue-50">
        <h2 className="text-2xl font-black text-center mb-6 text-blue-800 uppercase tracking-tighter">KẾT QUẢ BÀI VIẾT</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
           <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex flex-col items-center justify-center">
             <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest mb-1">Điểm số</p>
             <p className="text-5xl font-black text-blue-900">{result.score}/10</p>
           </div>
           <div className="bg-green-50 p-6 rounded-2xl border border-green-100">
             <p className="text-[10px] text-green-500 font-black uppercase tracking-widest mb-1">Nhận xét từ AI</p>
             <p className="text-gray-700 text-sm font-bold leading-relaxed">{result.feedback || "AI không có nhận xét gì thêm."}</p>
           </div>
        </div>
        <div className="bg-yellow-50 p-6 rounded-2xl mb-8 border border-yellow-100 shadow-inner">
           <p className="font-black text-yellow-800 mb-2 flex items-center gap-2 uppercase text-xs">✍️ Gợi ý sửa đổi:</p>
           <p className="italic text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{result.corrections || "Không có lỗi sai đáng kể!"}</p>
        </div>
        <Button onClick={handleNext} fullWidth size="lg" variant="secondary" className="py-6 rounded-2xl">
          {currentIndex < questions.length - 1 ? "Bài tiếp theo →" : "Xem tổng kết"}
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-3xl p-6 md:p-10 shadow-xl animate-fade-in border-4 border-purple-50">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{current.topic}</span>
          <span className="text-gray-400 font-black text-[10px] uppercase tracking-widest">Writing Essay</span>
        </div>
        <div className="bg-blue-50/50 p-6 md:p-8 rounded-3xl border-2 border-dashed border-blue-100 mb-8 shadow-inner">
          <h3 className="text-lg md:text-xl font-black text-gray-800 leading-tight mb-2">{current.questionText}</h3>
        </div>
      </div>
      <div className="relative">
        <textarea 
          className="w-full h-80 p-6 border-2 border-gray-100 rounded-2xl focus:border-blue-500 focus:ring-0 text-lg resize-none mb-6 font-medium text-gray-700 bg-gray-50/30 transition-all shadow-inner"
          placeholder="Viết bài của bạn tại đây..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <div className="absolute bottom-10 right-4 flex flex-col items-end">
          <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-[10px] font-black shadow-lg">
            Word count: {wordCount}
          </div>
        </div>
      </div>
      <div className="flex justify-center">
        <Button 
          onClick={handleSubmit} 
          disabled={isGrading || input.trim().length < 5} 
          size="lg" variant="primary" className="w-full md:w-auto min-w-[240px] py-6 shadow-xl"
        >
          {isGrading ? "ĐANG CHẤM ĐIỂM..." : "Nộp bài & Chấm điểm 🚀"}
        </Button>
      </div>
    </div>
  );
};
