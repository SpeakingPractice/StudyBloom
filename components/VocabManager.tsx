import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CustomFolder, CustomWord, ViewMode } from '../types';
import { VocabularyService } from '../services/vocabularyService';

interface VocabManagerProps {
  onBack: () => void;
  onPractice: (folder: CustomFolder) => void;
}

const EMOJIS = ['🌍', '📚', '🎯', '🔥', '⭐', '🍄', '🎮', '🏆', '💡', '🧠', '🗺️', '🎵', '🐢', '🌸', '🚀', '🎪', '🦁', '🍕', '⚽', '🎨', '🌈', '🔑', '💎', '🐉', '🎭', '🏰', '🌙', '⚡', '🎲', '🦋'];
const COLORS = [
  { name: 'Red', hex: '#E52521' },
  { name: 'Blue', hex: '#049CD8' },
  { name: 'Green', hex: '#43B047' },
  { name: 'Yellow', hex: '#FBD000' },
  { name: 'Purple', hex: '#9C27B0' }
];

const PixelChest = () => (
  <div className="w-24 h-20 flex flex-col items-center pointer-events-none">
    <div className="w-20 h-8 bg-[#8B4513] border-4 border-[#3a1d0a] relative">
      <div className="absolute inset-x-4 bottom-0 h-3 bg-[#FBD000] border-x-4 border-t-4 border-[#C8980A]"></div>
    </div>
    <div className="w-24 h-12 bg-[#5C3010] border-x-4 border-b-4 border-[#1a0d05] relative flex justify-center">
      <div className="absolute inset-x-6 top-0 h-4 bg-[#FBD000] border-x-4 border-b-4 border-[#C8980A]"></div>
    </div>
  </div>
);

export const VocabManager: React.FC<VocabManagerProps> = ({ onBack, onPractice }) => {
  const [folders, setFolders] = useState<CustomFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<CustomFolder | null>(null);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showWordModal, setShowWordModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState<CustomFolder | null>(null);
  const [editingWord, setEditingWord] = useState<CustomWord | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'folder' | 'word', id: string } | null>(null);

  useEffect(() => {
    setFolders(VocabularyService.getFolders());
  }, []);

  const refreshFolders = () => {
    const updated = VocabularyService.getFolders();
    setFolders(updated);
    if (selectedFolder) {
      const f = updated.find(folder => folder.id === selectedFolder.id);
      setSelectedFolder(f || null);
    }
  };

  const handleSaveFolder = (name: string, icon: string, color: string) => {
    if (!name.trim()) return;
    if (editingFolder) {
      VocabularyService.updateFolder({ ...editingFolder, name, icon, color });
    } else {
      VocabularyService.addFolder({
        id: crypto.randomUUID(),
        name,
        icon,
        color,
        createdAt: Date.now(),
        words: []
      });
    }
    refreshFolders();
    setShowFolderModal(false);
    setEditingFolder(null);
  };

  const handleDeleteFolder = (id: string) => {
    VocabularyService.deleteFolder(id);
    refreshFolders();
    setConfirmDelete(null);
  };

  const handleSaveWord = (wordData: Partial<CustomWord>) => {
    if (!selectedFolder || !wordData.word || !wordData.definition) return;
    
    let updatedWords = [...selectedFolder.words];
    if (editingWord) {
      const idx = updatedWords.findIndex(w => w.id === editingWord.id);
      updatedWords[idx] = { ...editingWord, ...wordData } as CustomWord;
    } else {
      updatedWords.push({
        id: crypto.randomUUID(),
        word: wordData.word.toUpperCase(),
        partOfSpeech: wordData.partOfSpeech || 'Noun',
        definition: wordData.definition,
        example: wordData.example,
        pronunciation: wordData.pronunciation,
        addedAt: Date.now()
      } as CustomWord);
    }

    const updatedFolder = { ...selectedFolder, words: updatedWords };
    VocabularyService.updateFolder(updatedFolder);
    refreshFolders();
    setShowWordModal(false);
    setEditingWord(null);
  };

  const handleDeleteWord = (wordId: string) => {
    if (!selectedFolder) return;
    const updatedFolder = {
      ...selectedFolder,
      words: selectedFolder.words.filter(w => w.id !== wordId)
    };
    VocabularyService.updateFolder(updatedFolder);
    refreshFolders();
    setConfirmDelete(null);
  };

  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#5C94FC] overflow-hidden">
      {/* Header */}
      <div className="p-4 md:p-6 bg-[#E52521] border-b-8 border-[#8B1A18] flex items-center justify-between shadow-xl relative z-20">
        <button onClick={selectedFolder ? () => setSelectedFolder(null) : onBack} className="pixel-font text-white hover:underline text-[10px] md:text-sm flex items-center gap-2">
          {selectedFolder ? '← BACK TO LIST' : '← BACK TO HOME'}
        </button>
        <h1 className="pixel-font text-white text-[10px] md:text-xl drop-shadow-[2px_2px_0_#8B1A18] uppercase tracking-wider truncate mx-4">
          {selectedFolder ? `${selectedFolder.icon} ${selectedFolder.name}` : 'MY VOCABULARY'}
        </h1>
        <div className="w-10"></div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6 relative">
        <div className="max-w-[1400px] ml-4 lg:ml-10 mr-auto pb-32">
          {!selectedFolder ? (
            /* Folders Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
              {folders.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center p-12 text-center space-y-10 mt-12">
                  <motion.div animate={{ y: [0, -20, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
                    <PixelChest />
                  </motion.div>
                  <p className="pixel-font text-white text-[10px] md:text-xs uppercase tracking-[0.2em] leading-loose drop-shadow-md">
                    NO FOLDERS YET!<br/>CREATE YOUR FIRST ONE ➕
                  </p>
                </div>
              ) : (
                folders.map(folder => (
                  <motion.div
                    key={folder.id}
                    whileHover={{ scale: 1.05, rotate: 1 }}
                    className="relative group q-block bg-white p-6 cursor-pointer border-b-8 shadow-lg"
                    style={{ borderColor: folder.color }}
                    onClick={() => setSelectedFolder(folder)}
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="text-5xl drop-shadow-md">{folder.icon}</div>
                      <div className="flex-1">
                        <h3 className="pixel-font text-[#5C3010] text-[10px] uppercase truncate font-bold">{folder.name}</h3>
                        <div className="mt-2 inline-block px-2 py-1 bg-black/5 rounded pixel-font text-[#C8980A] text-[7px]">{folder.words.length} WORDS</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-dashed border-[#C4A96B]/30">
                      <span className="pixel-font text-[7px] text-[#A67C52] uppercase opacity-60">
                        {new Date(folder.createdAt).toLocaleDateString()}
                      </span>
                      <div className="flex gap-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setEditingFolder(folder); setShowFolderModal(true); }}
                          className="w-10 h-10 bg-[#FBD000] border-b-4 border-[#8B6914] rounded-lg flex items-center justify-center hover:brightness-110 active:translate-y-1"
                        >
                          ✏️
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setConfirmDelete({ type: 'folder', id: folder.id }); }}
                          className="w-10 h-10 bg-[#E52521] border-b-4 border-[#8B1A18] rounded-lg flex items-center justify-center hover:brightness-110 active:translate-y-1"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          ) : (
            /* Word List View */
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-8">
                <div className="pixel-font text-white text-[8px] uppercase tracking-widest">{selectedFolder.words.length} WORDS TOTAL</div>
                {selectedFolder.words.length >= 4 ? (
                  <button 
                    onClick={() => onPractice(selectedFolder)}
                    className="bg-[#049CD8] border-b-4 border-[#025A80] p-4 pixel-font text-white text-[10px] rounded-lg hover:scale-105 active:translate-y-1 shadow-lg"
                  >
                    🎮 PRACTICE NOW
                  </button>
                ) : (
                  <div className="bg-[#8B6914]/40 p-4 pixel-font text-white text-[8px] rounded-lg">
                    ADD {4 - selectedFolder.words.length} MORE WORDS TO PRACTICE! 🍄
                  </div>
                )}
              </div>

              <div className="grid gap-4">
                {selectedFolder.words.length === 0 ? (
                  <div className="text-center py-12 text-white/60 pixel-font text-[8px] uppercase">This folder is empty...</div>
                ) : (
                  selectedFolder.words.map(word => (
                    <motion.div
                      key={word.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-white q-block border-b-8 border-[#E8D5A3] p-6 relative group"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="pixel-font text-[#E52521] text-xs md:text-sm uppercase">{word.word}</h3>
                            <span className="px-2 py-0.5 bg-[#43B047] text-white text-[7px] pixel-font rounded uppercase">
                              {word.partOfSpeech}
                            </span>
                            {word.pronunciation && (
                              <span className="text-[#5C3010] text-[10px] font-mono italic">{word.pronunciation}</span>
                            )}
                            <button onClick={() => speak(word.word)} className="text-lg hover:scale-110 transition-transform">🔊</button>
                          </div>
                          <p className="text-[#5C3010] text-sm font-medium">{word.definition}</p>
                          {word.example && (
                            <p className="text-[#8B6914] text-xs italic bg-[#FBD000]/10 p-2 rounded border-l-4 border-[#FBD000]">
                              "{word.example}"
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => { setEditingWord(word); setShowWordModal(true); }}
                            className="w-10 h-10 bg-[#FBD000] border-2 border-[#8B6914] rounded flex items-center justify-center text-sm"
                          >
                            ✏️
                        </button>
                          <button 
                            onClick={() => setConfirmDelete({ type: 'word', id: word.id })}
                            className="w-10 h-10 bg-[#E52521] border-2 border-[#8B1A18] rounded flex items-center justify-center text-sm"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Buttons */}
      {!selectedFolder ? (
        <div className="fixed bottom-8 left-0 right-0 p-6 flex justify-center pointer-events-none">
          <button 
            onClick={() => setShowFolderModal(true)}
            className="pointer-events-auto bg-[#43B047] border-b-8 border-[#256B28] px-8 py-6 rounded-full pixel-font text-white text-sm md:text-lg shadow-2xl hover:scale-105 active:translate-y-2 transition-all flex items-center gap-4"
          >
            <div className="w-12 h-16 relative">
              <div className="absolute inset-x-0 bottom-0 top-1/2 bg-[#256B28] rounded-t-lg"></div>
              <div className="absolute inset-x-[-4px] bottom-[50%] h-4 bg-[#256B28] rounded-full"></div>
            </div>
            + NEW FOLDER
          </button>
        </div>
      ) : (
        <div className="fixed bottom-8 right-8 pointer-events-none">
          <button 
             onClick={() => setShowWordModal(true)}
             className="pointer-events-auto w-16 h-16 bg-[#43B047] border-b-4 border-[#256B28] rounded-lg flex items-center justify-center text-3xl text-white shadow-2xl hover:scale-110 active:translate-y-1"
          >
            ➕
          </button>
        </div>
      )}

      {/* Modals Container */}
      <AnimatePresence>
        {showFolderModal && (
          <FolderModal 
            onClose={() => { setShowFolderModal(false); setEditingFolder(null); }}
            onSave={handleSaveFolder}
            editingFolder={editingFolder}
          />
        )}
        {showWordModal && (
          <WordModal 
            onClose={() => { setShowWordModal(false); setEditingWord(null); }}
            onSave={handleSaveWord}
            editingWord={editingWord}
            speak={speak}
          />
        )}
        {confirmDelete && (
          <ConfirmDeleteModal 
            type={confirmDelete.type}
            onCancel={() => setConfirmDelete(null)}
            onConfirm={() => confirmDelete.type === 'folder' ? handleDeleteFolder(confirmDelete.id) : handleDeleteWord(confirmDelete.id)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

/* --- SUB COMPONENTS --- */

const FolderModal = ({ onClose, onSave, editingFolder }: { onClose: () => void, onSave: (name: string, icon: string, color: string) => void, editingFolder: CustomFolder | null }) => {
  const [name, setName] = useState(editingFolder?.name || '');
  const [icon, setIcon] = useState(editingFolder?.icon || '🌍');
  const [color, setColor] = useState(editingFolder?.color || '#E52521');
  const [error, setError] = useState(false);

  const handleSave = () => {
    if (!name.trim()) {
      setError(true);
      return;
    }
    onSave(name, icon, color);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center px-4 overflow-hidden">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm scanlines"
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="relative w-full max-w-lg bg-[#E8D5A3] border-t-8 border-[#C4A96B] rounded-t-3xl p-8 shadow-2xl space-y-8 pb-12"
      >
        <div className="space-y-4">
          <h2 className="pixel-font text-xs text-[#E52521] uppercase text-center mb-6">{editingFolder ? 'RENAME FOLDER' : 'CREATE NEW FOLDER'}</h2>
          <label className="pixel-font text-[10px] text-[#8B4513] uppercase block">Folder Name</label>
          <input 
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(false); }}
            placeholder="e.g. UNIT 5 VOCAB"
            className={`w-full bg-white border-4 p-4 pixel-font text-xs text-[#5C3010] rounded-xl outline-none transition-colors ${error ? 'border-[#E52521]' : 'border-[#C4A96B]'}`}
          />
          {error && <p className="pixel-font text-[#E52521] text-[8px] animate-pulse">NAME IS EMPTY!</p>}
        </div>

        <div className="space-y-4">
          <label className="pixel-font text-[10px] text-[#8B4513] uppercase block">Choose Icon</label>
          <div className="grid grid-cols-6 gap-2 max-h-32 overflow-y-auto p-2 bg-white/40 rounded-xl border-4 border-[#C4A96B]">
            {EMOJIS.map(e => (
              <button 
                key={e}
                onClick={() => setIcon(e)}
                className={`text-2xl p-2 rounded-lg transition-all ${icon === e ? 'bg-[#FBD000] scale-125 border-2 border-[#8B6914] z-10' : 'hover:bg-white/50'}`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <label className="pixel-font text-[10px] text-[#8B4513] uppercase block">Theme Color</label>
          <div className="flex gap-4 p-2 bg-white/40 rounded-xl border-4 border-[#C4A96B] justify-center">
            {COLORS.map(c => (
              <button 
                key={c.hex}
                onClick={() => setColor(c.hex)}
                className={`w-10 h-10 rounded-full border-4 transition-all ${color === c.hex ? 'scale-125 border-white border-double' : 'border-transparent opacity-60'}`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <button onClick={onClose} className="flex-1 bg-white border-b-4 border-gray-300 p-4 pixel-font text-[10px] text-[#5C3010] rounded-xl">CANCEL</button>
          <button onClick={handleSave} className="flex-1 bg-[#E52521] border-b-4 border-[#8B1A18] p-4 pixel-font text-[10px] text-white rounded-xl">{editingFolder ? 'UPDATE' : 'SAVE FOLDER'}</button>
        </div>
      </motion.div>
    </div>
  );
};

const WordModal = ({ onClose, onSave, editingWord, speak }: { onClose: () => void, onSave: (data: Partial<CustomWord>) => void, editingWord: CustomWord | null, speak: (t: string) => void }) => {
  const [word, setWord] = useState(editingWord?.word || '');
  const [pos, setPos] = useState(editingWord?.partOfSpeech || 'Noun');
  const [definition, setDefinition] = useState(editingWord?.definition || '');
  const [example, setExample] = useState(editingWord?.example || '');
  const [pronunciation, setPronunciation] = useState(editingWord?.pronunciation || '');
  const [error, setError] = useState(false);

  const handleSave = () => {
    if (!word.trim() || !definition.trim()) {
      setError(true);
      return;
    }
    onSave({ word, partOfSpeech: pos as any, definition, example, pronunciation });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center px-4 overflow-hidden">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm scanlines"
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="relative w-full max-w-lg bg-[#E8D5A3] border-t-8 border-[#C4A96B] rounded-t-3xl p-6 shadow-2xl space-y-6 pb-12 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center gap-4">
          <div className="flex-1 space-y-2">
            <label className="pixel-font text-[8px] text-[#8B4513] uppercase block">New Word</label>
            <input 
              type="text"
              value={word}
              onChange={(e) => setWord(e.target.value.toUpperCase())}
              placeholder="E.G. DETERIORATE"
              className="w-full bg-white border-4 border-[#C4A96B] p-4 pixel-font text-[10px] text-[#5C3010] rounded-xl outline-none"
            />
          </div>
          <button 
            type="button"
            onClick={() => speak(word)}
            className="mt-6 w-14 h-14 bg-[#FBD000] border-b-4 border-[#C8980A] rounded-xl flex items-center justify-center text-2xl hover:scale-105 active:scale-95"
          >
            🔊
          </button>
        </div>

        <div className="space-y-2">
          <label className="pixel-font text-[8px] text-[#8B4513] uppercase block">Part of Speech</label>
          <select 
            value={pos}
            onChange={(e) => setPos(e.target.value as any)}
            className="w-full bg-white border-4 border-[#C4A96B] p-4 font-bold text-[#5C3010] rounded-xl outline-none appearance-none"
          >
            {['Noun', 'Verb', 'Adjective', 'Adverb', 'Phrase'].map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="pixel-font text-[8px] text-[#8B4513] uppercase block">Pronunciation</label>
          <input 
            type="text"
            value={pronunciation}
            onChange={(e) => setPronunciation(e.target.value)}
            placeholder="/dɪˌtɪəriˈɔːreɪt/"
            className="w-full bg-white border-4 border-[#C4A96B] p-4 text-[#5C3010] font-mono rounded-xl outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="pixel-font text-[8px] text-[#8B4513] uppercase block">Definition</label>
          <textarea 
            value={definition}
            onChange={(e) => setDefinition(e.target.value)}
            rows={2}
            className="w-full bg-white border-4 border-[#C4A96B] p-4 text-[#5C3010] rounded-xl outline-none resize-none font-medium"
          />
        </div>

        <div className="space-y-2">
          <label className="pixel-font text-[8px] text-[#8B4513] uppercase block">Example Sentence</label>
          <textarea 
            value={example}
            onChange={(e) => setExample(e.target.value)}
            placeholder="e.g. The situation began to deteriorate rapidly."
            rows={2}
            className="w-full bg-white border-4 border-[#C4A96B] p-4 text-[#5C3010] rounded-xl outline-none resize-none italic text-sm"
          />
        </div>

        {error && <p className="pixel-font text-[#E52521] text-[8px] text-center">REQUIRED FIELDS MISSING!</p>}

        <div className="flex gap-4 pt-4">
          <button onClick={onClose} className="flex-1 bg-white border-b-4 border-gray-300 p-4 pixel-font text-[10px] text-[#5C3010] rounded-xl">CANCEL</button>
          <button onClick={handleSave} className="flex-1 bg-[#43B047] border-b-4 border-[#256B28] p-4 pixel-font text-[10px] text-white rounded-xl">SAVE WORD</button>
        </div>
      </motion.div>
    </div>
  );
};

const ConfirmDeleteModal = ({ type, onCancel, onConfirm }: { type: string, onCancel: () => void, onConfirm: () => void }) => {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
        className="absolute inset-0 bg-black/80 scanlines"
      />
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        className="relative bg-white border-b-8 border-gray-200 p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center space-y-6"
      >
        <div className="text-6xl mb-4 animate-bounce">💣</div>
        <h3 className="pixel-font text-[#5C3010] text-sm uppercase">DELETE THIS {type.toUpperCase()}?</h3>
        <p className="text-[#8B4513] text-xs">This action cannot be undone!</p>
        <div className="flex gap-4">
          <button onClick={onCancel} className="flex-1 bg-gray-200 p-4 pixel-font text-[8px] rounded-lg">GO BACK</button>
          <button 
            onClick={() => {
              // Trigger brick animation or similar if desired
              onConfirm();
            }} 
            className="flex-1 bg-[#E52521] border-b-4 border-[#8B1A18] p-4 pixel-font text-[8px] text-white rounded-lg"
          >
            CONFIRM DELETE
          </button>
        </div>
      </motion.div>
    </div>
  );
};
