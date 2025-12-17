import React, { useState } from 'react';
import { Button } from './Button';

interface ApiKeyModalProps {
  onSave: (key: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onSave }) => {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim().startsWith('AIza')) {
      setError('Key không hợp lệ. Key phải bắt đầu bằng "AIza" (Invalid Key).');
      return;
    }
    onSave(key.trim());
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl border-4 border-blue-100 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 rounded-bl-full -z-0 opacity-50"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-yellow-100 rounded-tr-full -z-0 opacity-50"></div>

        <div className="relative z-10">
          <div className="flex items-center justify-center mb-6">
             <span className="text-5xl">🔑</span>
          </div>
          
          <h2 className="text-2xl font-black text-center text-gray-800 mb-2">
            Cần có API Key để bắt đầu
          </h2>
          <p className="text-center text-gray-500 mb-6 text-sm">
            Ứng dụng cần Google Gemini API Key của riêng bạn để hoạt động. Key của bạn sẽ chỉ được lưu trên trình duyệt này.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">
                Gemini API Key
              </label>
              <input
                type="password"
                value={key}
                onChange={(e) => {
                  setKey(e.target.value);
                  setError('');
                }}
                placeholder="AIzaSy..."
                className="w-full p-4 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-0 text-lg font-mono transition-all bg-gray-50"
              />
              {error && <p className="text-red-500 text-xs mt-2 font-bold">{error}</p>}
            </div>

            <Button type="submit" fullWidth size="lg" disabled={!key}>
              Lưu & Bắt đầu (Start)
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500 mb-3">Chưa có Key hoặc Key bị hết hạn?</p>
            <a 
              href="https://aistudio.google.com/app/apikey" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
            >
              👉 Lấy Key miễn phí tại Google AI Studio
            </a>
            <div className="mt-4 text-[10px] text-gray-400">
               Click "Create API Key" &rarr; Chọn Project &rarr; Copy Key và dán vào đây.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};