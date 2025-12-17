import React, { useState, useEffect, useRef } from 'react';
import { QuestionData } from '../types';
import { Button } from './Button';

interface SpeakingGameProps {
  questions: QuestionData[];
  onComplete: (score: number) => void;
}

export const SpeakingGame: React.FC<SpeakingGameProps> = ({ questions, onComplete }) => {
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const shouldListenRef = useRef<boolean>(false); // Helper to track intent

  const current = questions[index];
  
  // @ts-ignore - simple handling for webkitSpeechRecognition
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  useEffect(() => {
    // Cleanup on unmount or question change
    if (recognitionRef.current) {
      shouldListenRef.current = false; // Stop the auto-restart loop
      recognitionRef.current.stop();
      setIsListening(false);
    }
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

    // Indicate that we INTEND to listen, so if it stops randomly, we restart
    shouldListenRef.current = true;

    const recognition = new Recognition();
    recognition.lang = 'en-US';
    // Continuous allows it to not stop after a short pause
    recognition.continuous = true;
    // Interim results allows us to see what is being said in real-time
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognitionRef.current = recognition;

    setIsListening(true);
    if (!transcript) setTranscript(""); 
    setFeedback("Đang lắng nghe... (Listening...)");

    try {
      recognition.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
      setFeedback("Lỗi khởi động micro. Vui lòng tải lại trang.");
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
      
      // Update display with current best guess
      const currentText = finalTranscript || interimTranscript;
      setTranscript(currentText);

      // Check automatically if the user has said the target sentence correctly
      // Only auto-stop if match is very strong to avoid premature stopping
      if (checkMatch(currentText)) {
          // Keep listening flag true so UI doesn't jump, but handle success logic
          stopRecording(true); // Success stop
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech Recognition Error:", event.error);
      if (event.error === 'no-speech') {
        // Ignore no-speech errors in continuous mode usually
        return; 
      }
      
      // Only show error feedback if we are actually trying to listen
      if (shouldListenRef.current) {
          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            setFeedback("Vui lòng cấp quyền truy cập Micro trên trình duyệt!");
            shouldListenRef.current = false;
            setIsListening(false);
          } else if (event.error === 'audio-capture') {
            setFeedback("Không tìm thấy Micro. Vui lòng kiểm tra thiết bị.");
            shouldListenRef.current = false;
            setIsListening(false);
          } else if (event.error === 'network') {
             setFeedback("Lỗi kết nối mạng.");
             shouldListenRef.current = false;
             setIsListening(false);
          }
      }
    };

    recognition.onend = () => {
        // Critical: If we didn't mean to stop (intent is true), restart immediately.
        // This fixes the issue where browser stops listening when user pauses too long.
        if (shouldListenRef.current) {
            try {
                recognition.start();
            } catch (e) {
                // Ignore start errors (like if it's already started)
            }
        } else {
            setIsListening(false);
        }
    };
  };

  const stopRecording = (isSuccess = false) => {
    // Set intent to false so onend doesn't restart
    shouldListenRef.current = false;

    if (recognitionRef.current) {
        recognitionRef.current.stop();
        // recognitionRef.current = null; // Don't nullify immediately to allow graceful shutdown
    }
    setIsListening(false);
    
    if (isSuccess) {
       setFeedback("Tuyệt vời! Chính xác 100% 🎉");
       setScore(s => s + 2); // 2 Points
       setTimeout(nextQuestion, 2000);
    } else {
       // Manual stop
       if (!transcript || transcript.trim().length === 0) {
           setFeedback("Bạn chưa nói gì cả (No input detected).");
           return;
       }
       checkPronunciation(transcript);
    }
  };

  const normalizeText = (s: string) => s.toLowerCase().replace(/[.,!?]/g, '').trim();

  const checkMatch = (spoken: string): boolean => {
    const target = current.speakingTarget || "";
    const nSpoken = normalizeText(spoken);
    const nTarget = normalizeText(target);
    
    // Safety check: Don't match empty strings
    if (!nSpoken || nSpoken.length < 2) return false;

    // 1. Exact match
    if (nSpoken === nTarget) return true;
    
    // 2. User said the target phrase (plus maybe some background noise or extra words)
    if (nSpoken.includes(nTarget)) return true;
    
    // 3. Reverse inclusion (Target contains spoken)
    // ONLY allow this if spoken is at least 80% of the target length.
    // This prevents "I" matching "I go to school".
    if (nTarget.includes(nSpoken)) {
        return nSpoken.length >= nTarget.length * 0.8;
    }
    
    return false;
  };

  const checkPronunciation = (spoken: string) => {
    // Relaxed check for manual stop
    if (checkMatch(spoken)) {
      setFeedback("Tuyệt vời! Chính xác 100% 🎉");
      setScore(s => s + 2); // 2 Points
      setTimeout(nextQuestion, 2000);
    } else {
      setFeedback(`Gần đúng! Bạn nói: "${spoken || '...'}" - Hãy thử lại!`);
    }
  };

  const nextQuestion = () => {
    setFeedback(null);
    setTranscript("");
    if (index < questions.length - 1) setIndex(i => i + 1);
    else onComplete(score);
  };

  if (!Recognition) return <div className="text-center p-8">Trình duyệt không hỗ trợ Speaking.</div>;

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-3xl p-8 shadow-xl text-center">
      <span className="text-sm font-bold text-gray-400">Câu {index + 1}/{questions.length}</span>
      <h3 className="text-2xl font-bold text-gray-800 mt-2 mb-6">{current.questionText}</h3>
      
      <div className="bg-blue-50 p-6 rounded-2xl mb-8 border-2 border-blue-100">
        <p className="text-3xl font-extrabold text-blue-600 leading-tight">{current.speakingTarget}</p>
      </div>

      <div className="mb-8 min-h-[5rem] bg-gray-50 rounded-xl p-4 border border-gray-100 flex items-center justify-center">
        {transcript ? (
            <p className="text-gray-700 text-lg font-medium">"{transcript}"</p>
        ) : (
            <p className="text-gray-400 italic text-sm">Nội dung bạn nói sẽ hiện ở đây...</p>
        )}
      </div>
      
      {feedback && <p className={`font-bold mb-4 animate-pulse ${feedback.includes('Tuyệt') ? 'text-green-600' : 'text-orange-500'}`}>{feedback}</p>}

      <div className="flex gap-4 justify-center items-center">
        <Button 
          onClick={toggleRecord} 
          variant={isListening ? 'danger' : 'primary'}
          size="lg"
          className={`rounded-full w-24 h-24 flex items-center justify-center transition-all ${isListening ? 'ring-4 ring-red-200 scale-110' : 'hover:scale-105'}`}
        >
          {isListening ? (
             <div className="flex flex-col items-center">
                <div className="w-8 h-8 bg-white rounded-sm animate-pulse"></div>
                <span className="text-[10px] mt-2 font-bold uppercase">Stop</span>
             </div>
          ) : (
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )}
        </Button>
      </div>
      <p className="text-xs text-gray-400 mt-4">
          {isListening ? "Bấm nút vuông để DỪNG và kiểm tra" : "Bấm Micro để bắt đầu nói"}
      </p>
      
      <div className="mt-8 flex justify-center">
        <Button onClick={nextQuestion} variant="outline" size="sm">Bỏ qua (Skip)</Button>
      </div>
    </div>
  );
};