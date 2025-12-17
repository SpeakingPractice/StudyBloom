import React, { useState, useEffect, useRef } from 'react';
import { QuestionData } from '../types';
import { Button } from './Button';

interface ListeningGameProps {
  questions: QuestionData[];
  onComplete: (score: number) => void;
}

interface ScriptSegment {
  text: string;
  speaker: string;
  isExclamation: boolean;
  isQuestion: boolean;
}

export const ListeningGame: React.FC<ListeningGameProps> = ({ questions, onComplete }) => {
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  
  // Timer for reading questions
  const [readingCountdown, setReadingCountdown] = useState(30);
  
  // Important: Keep reference to active utterance to prevent Garbage Collection (Chrome bug)
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const cancelRef = useRef<boolean>(false);

  const current = questions[index];

  useEffect(() => {
    const updateVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      // Prioritize Google voices or high-quality voices if possible
      const enVoices = voices.filter(v => v.lang.startsWith('en'));
      setAvailableVoices(enVoices);
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
    
    return () => {
      cancelRef.current = true;
      window.speechSynthesis.cancel();
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Stop audio and reset timer when question changes
  useEffect(() => {
    cancelRef.current = true;
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setReadingCountdown(30);
  }, [index]);

  // Countdown timer effect
  useEffect(() => {
    if (readingCountdown > 0) {
      const timer = setTimeout(() => {
        setReadingCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [readingCountdown]);

  if (!current) return null;

  const parseScript = (text: string): ScriptSegment[] => {
    const segments: ScriptSegment[] = [];
    if (!text) return segments;

    const lines = text.split(/\n+/);

    lines.forEach(line => {
      line = line.trim();
      if (!line) return;

      let speaker = 'Narrator';
      let content = line;

      // Try to parse "Speaker: Content"
      const colonIdx = line.indexOf(':');
      if (colonIdx > -1 && colonIdx < 20) {
        speaker = line.substring(0, colonIdx).trim();
        content = line.substring(colonIdx + 1).trim();
      }

      // Regex to split sentences but keep punctuation
      const sentenceRegex = /([^{.!?]+[.!?]+)|([^{.!?]+$)/g;
      const matches = content.match(sentenceRegex);

      if (matches) {
        matches.forEach(m => {
          const s = m.trim();
          if (s) {
            segments.push({
              text: s,
              speaker,
              isExclamation: s.includes('!'),
              isQuestion: s.includes('?')
            });
          }
        });
      }
    });

    return segments;
  };

  const playAudio = () => {
    if (!current.listeningScript) return;
    
    cancelRef.current = false;
    window.speechSynthesis.cancel();
    setIsPlaying(true);

    const segments = parseScript(current.listeningScript);
    
    if (segments.length === 0) {
        setIsPlaying(false);
        return;
    }

    const uniqueSpeakers = Array.from(new Set(segments.map(s => s.speaker)));
    const speakerConfig: Record<string, { voice: SpeechSynthesisVoice | null, pitch: number }> = {};
    
    uniqueSpeakers.forEach((spk, idx) => {
       const voice = availableVoices.length > 0 ? availableVoices[idx % availableVoices.length] : null;
       // Vary pitch slightly for different speakers
       const pitch = 1.0 + ((idx % 3) - 1) * 0.1; 
       speakerConfig[spk] = { voice, pitch };
    });

    let currentSegmentIdx = 0;

    const speakNext = () => {
      if (cancelRef.current || currentSegmentIdx >= segments.length) {
        setIsPlaying(false);
        activeUtteranceRef.current = null;
        return;
      }

      const seg = segments[currentSegmentIdx];
      const config = speakerConfig[seg.speaker] || { voice: null, pitch: 1.0 };
      
      const u = new SpeechSynthesisUtterance(seg.text);
      activeUtteranceRef.current = u; // Prevent GC

      u.lang = 'en-US';
      
      // Make voice more emotional/enthusiastic
      let rate = 1.0; // Slightly faster than default for energy
      let pitch = config.pitch;
      
      if (seg.isExclamation) {
        // High energy for exclamations
        pitch += 0.25;
        rate += 0.1;
        u.volume = 1.0;
      } else if (seg.isQuestion) {
        // Raising pitch for questions
        pitch += 0.15; 
      }

      if (config.voice) u.voice = config.voice;
      u.pitch = Math.max(0.5, Math.min(2, pitch));
      u.rate = rate;

      u.onend = () => {
        currentSegmentIdx++;
        let pause = 300; // Shorter pause for better flow
        if (seg.isExclamation) pause = 500;
        
        if (currentSegmentIdx < segments.length) {
            if (segments[currentSegmentIdx].speaker !== seg.speaker) {
                pause = 600; // Pause between speakers
            }
        }
        
        if (!cancelRef.current) {
             setTimeout(speakNext, pause);
        }
      };

      u.onerror = (e) => {
        console.warn("TTS Event Error:", e);
        if (e.error !== 'interrupted' && e.error !== 'canceled') {
           setIsPlaying(false);
        }
      };

      window.speechSynthesis.speak(u);
    };

    speakNext();
  };

  const handleAnswer = (option: string) => {
    if (feedback) return;
    const isCorrect = option === current.correctAnswer;
    if (isCorrect) setScore(s => s + 2); // 2 Points
    setFeedback(isCorrect ? "Correct! 🎉" : `Incorrect. Answer: ${current.correctAnswer}`);
    
    setTimeout(() => {
      setFeedback(null);
      if (index < questions.length - 1) {
        setIndex(i => i + 1);
      } else {
        onComplete(score + (isCorrect ? 2 : 0));
      }
    }, 2500);
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-3xl p-8 shadow-xl">
      <div className="text-center mb-8">
        <h3 className="text-xl font-bold text-gray-600 mb-4">Luyện Nghe (Question {index + 1}/{questions.length})</h3>
        
        <div className="flex flex-col items-center relative">
            {readingCountdown > 0 ? (
               <div className="flex flex-col items-center animate-fade-in">
                  <div className="text-4xl font-black text-blue-600 mb-2">{readingCountdown}s</div>
                  <p className="text-sm font-bold text-gray-500 mb-4">Đọc kỹ câu hỏi trước khi nghe (Read carefully)</p>
                  <Button 
                    onClick={() => setReadingCountdown(0)}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    Bỏ qua (Skip Wait)
                  </Button>
               </div>
            ) : (
                <>
                    <button 
                    onClick={playAudio}
                    disabled={isPlaying}
                    className={`rounded-full p-6 transition-all transform active:scale-95 ${isPlaying ? 'bg-indigo-100 text-indigo-400 animate-pulse ring-4 ring-indigo-50' : 'bg-blue-100 hover:bg-blue-200 text-blue-600 shadow-lg hover:shadow-blue-200 animate-bounce'}`}
                    >
                    <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                    </button>
                    <p className="mt-3 text-sm font-bold text-gray-500 uppercase tracking-wide">
                        {isPlaying ? "Đang đọc... (Listening...)" : "Bấm để nghe (Play Audio)"}
                    </p>
                </>
            )}
        </div>
      </div>

      <div className={`bg-gray-50 rounded-2xl p-6 mb-6 border border-gray-100 transition-all duration-500 ${readingCountdown > 0 ? 'ring-2 ring-blue-300 scale-105' : ''}`}>
        <p className="text-xl font-medium text-gray-800 text-center leading-relaxed">{current.questionText}</p>
      </div>

      <div className="grid gap-4">
        {current.options?.map((opt, i) => (
          <Button 
            key={i} 
            onClick={() => handleAnswer(opt)} 
            variant="outline" 
            fullWidth 
            disabled={!!feedback || readingCountdown > 0}
            className={`text-lg py-4 hover:border-blue-400 hover:bg-blue-50 ${readingCountdown > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {opt}
          </Button>
        ))}
      </div>

      {feedback && (
        <div className={`mt-6 p-4 rounded-xl text-center font-bold text-lg animate-fade-in-up ${feedback.includes('Correct') ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
          {feedback}
        </div>
      )}
    </div>
  );
};