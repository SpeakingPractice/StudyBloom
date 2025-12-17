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
  const [input, setInput] = useState("");
  const [isGrading, setIsGrading] = useState(false);
  const [result, setResult] = useState<{score: number, feedback: string, corrections: string} | null>(null);

  const current = questions[0]; // Writing usually has 1 big task

  if (!current) return null;

  const handleSubmit = async () => {
    if (!input.trim()) return;
    setIsGrading(true);
    try {
      const evalResult = await evaluateWriting(current.questionText, input, grade);
      setResult(evalResult);
    } catch (e) {
      alert("Error grading. Try again.");
    } finally {
      setIsGrading(false);
    }
  };

  // Helper to render text with bullet points cleanly
  const renderPrompt = (text: string) => {
    // Split by newlines
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    
    return (
      <div className="space-y-3">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          // Check if it's a list item (starts with -, *, or "1.")
          if (trimmed.startsWith('-') || trimmed.startsWith('*') || /^\d+\./.test(trimmed)) {
            return (
              <div key={idx} className="flex items-start pl-4 text-blue-800 font-medium">
                <span className="mr-3 text-blue-500 mt-1.5 flex-shrink-0">
                  <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" /></svg>
                </span>
                <span>{trimmed.replace(/^[-*]\s*/, '')}</span>
              </div>
            );
          }
          // Main header/topic
          return <h3 key={idx} className="text-2xl font-bold text-gray-800">{line}</h3>;
        })}
      </div>
    );
  };

  if (result) {
    return (
      <div className="max-w-3xl mx-auto bg-white rounded-3xl p-8 shadow-xl">
        <h2 className="text-3xl font-bold text-center mb-6 text-blue-800">Kết quả bài viết</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
           <div className="bg-blue-50 p-4 rounded-xl">
             <p className="text-sm text-blue-600 font-bold uppercase">Điểm số</p>
             <p className="text-5xl font-black text-blue-900">{result.score}/20</p>
           </div>
           <div className="bg-green-50 p-4 rounded-xl">
             <p className="text-sm text-green-600 font-bold uppercase">Feedback</p>
             <p className="text-gray-700">{result.feedback}</p>
           </div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-xl mb-8">
           <p className="font-bold text-yellow-800 mb-2">Gợi ý sửa đổi:</p>
           <p className="italic text-gray-700">{result.corrections}</p>
        </div>
        <Button onClick={() => onComplete(result.score)} fullWidth size="lg">Hoàn thành</Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-3xl p-8 shadow-xl">
      <div className="mb-6">
        <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 inline-block">{current.topic}</span>
        
        {/* Render formatted prompt */}
        <div className="bg-blue-50/50 p-6 rounded-2xl border-2 border-blue-100 mb-6">
          {renderPrompt(current.questionText)}
        </div>
        
        {current.writingPrompt && <p className="text-gray-500 italic text-sm">{current.writingPrompt}</p>}
      </div>

      <textarea 
        className="w-full h-64 p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-0 text-lg resize-none mb-6 font-medium text-gray-700"
        placeholder="Type your answer here..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />

      <div className="flex justify-end">
        <Button 
          onClick={handleSubmit} 
          disabled={isGrading || input.length < 10} 
          size="lg"
          variant="primary"
        >
          {isGrading ? 'Đang chấm điểm...' : 'Nộp bài (Submit)'}
        </Button>
      </div>
    </div>
  );
};