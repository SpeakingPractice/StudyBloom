import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QuestionData, GradeLevel } from '../types';
import { Button } from './Button';

interface WordBattleGameProps {
  questions: QuestionData[];
  onComplete: (score: number) => void;
  grade?: GradeLevel;
  isPractice?: boolean;
  pointsPerQuestion?: number;
}

const TILES = {
  SWORD: {
    id: 'SWORD',
    emoji: '⚔️',
    color: '#E52521',
    border: '#8B1A18',
    effect: 'ATTACK',
    damage: 25,
    vocabCategory: 'Verb',
    label: 'ATTACK',
  },
  HEART: {
    id: 'HEART',
    emoji: '❤️',
    color: '#FF69B4',
    border: '#C0185A',
    effect: 'HEAL',
    healAmount: 20,
    vocabCategory: 'Adjective',
    label: 'HEAL',
  },
  COIN: {
    id: 'COIN',
    emoji: '💠',
    color: '#FBD000',
    border: '#C8980A',
    effect: 'MANA',
    manaAmount: 25,
    vocabCategory: 'Noun',
    label: 'MANA',
  },
  SHIELD: {
    id: 'SHIELD',
    emoji: '🛡️',
    color: '#049CD8',
    border: '#025A80',
    effect: 'DEFEND',
    vocabCategory: 'Noun',
    label: 'DEFEND',
  },
  STAR: {
    id: 'STAR',
    emoji: '⭐',
    color: '#FF8C00',
    border: '#B35E00',
    effect: 'COMBO',
    vocabCategory: 'Adverb',
    label: 'COMBO',
  },
  SCROLL: {
    id: 'SCROLL',
    emoji: '📜',
    color: '#43B047',
    border: '#256B28',
    effect: 'SPECIAL',
    damage: 50,
    vocabCategory: 'Phrase',
    label: 'SPECIAL',
  },
};

const TILE_TYPES = Object.keys(TILES) as Array<keyof typeof TILES>;

const GRID_SIZE = 7;

interface PlayerStats {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  xp: number;
  xpToLevel: number;
  defense: number;
  comboMultiplier: number;
}

interface EnemyStats {
  name: string;
  hp: number;
  maxHp: number;
  attackPower: number;
  attackInterval: number;
  turnsSinceAttack: number;
  emoji: string;
}

const ENEMIES_BY_GRADE: Record<string, any> = {
  ['Grade 6']: { name: 'Village Chief 👴', hp: 120, attack: 15, interval: 4, emoji: '👴' },
  ['Grade 7']: { name: 'Warrior ⚔️', hp: 160, attack: 20, interval: 3, emoji: '⚔️' },
  ['Grade 8']: { name: 'General 🪖', hp: 200, attack: 28, interval: 3, emoji: '🪖' },
  ['Grade 9']: { name: 'Dragon 🐉', hp: 260, attack: 35, interval: 2, emoji: '🐉' },
  ['Grade 10']: { name: 'Demon King 👹', hp: 320, attack: 42, interval: 2, emoji: '👹' },
  ['Grade 11']: { name: 'War God 💀', hp: 400, attack: 50, interval: 2, emoji: '💀' },
  ['Grade 12']: { name: 'Overlord 👑', hp: 500, attack: 60, interval: 1, emoji: '👑' },
};

export const WordBattleGame: React.FC<WordBattleGameProps> = ({ questions, onComplete, grade, isPractice, pointsPerQuestion }) => {
  const [board, setBoard] = useState<string[][]>([]);
  const [selectedTile, setSelectedTile] = useState<{ r: number, c: number } | null>(null);
  const [player, setPlayer] = useState<PlayerStats>({
    hp: 200, maxHp: 200,
    mp: 0, maxMp: 100,
    xp: 0, xpToLevel: 200,
    defense: 0,
    comboMultiplier: 1,
  });

  const enemyData = (grade && ENEMIES_BY_GRADE[grade]) || ENEMIES_BY_GRADE['Grade 6'];

  const [enemy, setEnemy] = useState<EnemyStats>({
    name: enemyData.name,
    hp: enemyData.hp,
    maxHp: enemyData.hp,
    attackPower: enemyData.attack,
    attackInterval: enemyData.interval,
    turnsSinceAttack: 0,
    emoji: enemyData.emoji,
  });
  const [comboCount, setComboCount] = useState(0);
  const [gameState, setGameState] = useState<'playing' | 'vocab' | 'animating' | 'won' | 'lost'>('playing');
  const [answerFeedback, setAnswerFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [pendingMatch, setPendingMatch] = useState<{ type: keyof typeof TILES, size: number } | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionData | null>(null);
  const [timer, setTimer] = useState(10);
  const [showDamage, setShowDamage] = useState<{ amount: number, isPlayer: boolean } | null>(null);
  const [isUltimateReady, setIsUltimateReady] = useState(false);
  const [hint, setHint] = useState<{ r1: number, c1: number } | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hintTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize board
  const findMatches = (grid: string[][]) => {
    const matches: { r: number, c: number }[] = [];
    // Horizontal
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE - 2; c++) {
        if (grid[r][c] && grid[r][c] === grid[r][c + 1] && grid[r][c] === grid[r][c + 2]) {
          matches.push({ r, c }, { r, c: c + 1 }, { r, c: c + 2 });
          let k = c + 3;
          while (k < GRID_SIZE && grid[r][k] === grid[r][c]) {
            matches.push({ r, c: k });
            k++;
          }
          c = k - 1;
        }
      }
    }
    // Vertical
    for (let c = 0; c < GRID_SIZE; c++) {
      for (let r = 0; r < GRID_SIZE - 2; r++) {
        if (grid[r][c] && grid[r][c] === grid[r + 1][c] && grid[r][c] === grid[r + 2][c]) {
          matches.push({ r, c }, { r: r + 1, c }, { r: r + 2, c });
          let k = r + 3;
          while (k < GRID_SIZE && grid[k][c] === grid[r][c]) {
            matches.push({ r: k, c });
            k++;
          }
          r = k - 1;
        }
      }
    }
    return matches;
  };

  const initBoard = useCallback(() => {
    let newBoard: string[][] = [];
    do {
      newBoard = Array(GRID_SIZE).fill(null).map(() =>
        Array(GRID_SIZE).fill(null).map(() =>
          TILE_TYPES[Math.floor(Math.random() * TILE_TYPES.length)]
        )
      );
    } while (findMatches(newBoard).length > 0);
    setBoard(newBoard);
  }, []);

  useEffect(() => {
    initBoard();
    
    // Load progress
    const saved = localStorage.getItem('wb_progress');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        // We could adjust enemy based on some progress if we wanted
      } catch (e) {}
    }
  }, [initBoard]);

  // Hint logic
  const resetHintTimeout = useCallback(() => {
    if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    setHint(null);
    hintTimeoutRef.current = setTimeout(() => {
      // Find first valid swap
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          const neighbors = [[r + 1, c], [r, c + 1]];
          for (const [nr, nc] of neighbors) {
            if (nr < GRID_SIZE && nc < GRID_SIZE) {
              const testBoard = board.map(row => [...row]);
              [testBoard[r][c], testBoard[nr][nc]] = [testBoard[nr][nc], testBoard[r][c]];
              if (findMatches(testBoard).length > 0) {
                setHint({ r1: r, c1: c });
                return;
              }
            }
          }
        }
      }
    }, 10000);
  }, [board]);

  useEffect(() => {
    if (gameState === 'playing') {
      resetHintTimeout();
    }
    return () => {
      if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    };
  }, [gameState, board, resetHintTimeout]);

  const handleTileClick = (r: number, c: number) => {
    if (gameState !== 'playing') return;

    if (!selectedTile) {
      setSelectedTile({ r, c });
      return;
    }

    const { r: pr, c: pc } = selectedTile;
    const isNeighbor = Math.abs(pr - r) + Math.abs(pc - c) === 1;

    if (isNeighbor) {
      // Swap tiles
      const newBoard = board.map(row => [...row]);
      [newBoard[pr][pc], newBoard[r][c]] = [newBoard[r][c], newBoard[pr][pc]];
      
      const matches = findMatches(newBoard);
      if (matches.length > 0) {
        setBoard(newBoard);
        setSelectedTile(null);
        handleMatches(newBoard, matches, true);
      } else {
        // Invalid swap animation then back
        setSelectedTile(null);
      }
    } else {
      setSelectedTile({ r, c });
    }
  };

  const handleMatches = async (currentBoard: string[][], matches: { r: number, c: number }[], isPlayerTurn: boolean) => {
    if (matches.length === 0) return;

    // Just take the first match type for vocab question if player turn
    const firstMatchPos = matches[0];
    const matchType = currentBoard[firstMatchPos.r][firstMatchPos.c] as keyof typeof TILES;
    const matchSize = matches.length;

    if (isPlayerTurn) {
      setPendingMatch({ type: matchType, size: matchSize });
      // Find question for category
      const targetCat = TILES[matchType].vocabCategory;
      let q = questions.find(q => (q.wordType || '').toLowerCase() === targetCat.toLowerCase());
      if (!q) q = questions[Math.floor(Math.random() * questions.length)];
      
      setCurrentQuestion(q);
      setGameState('vocab');
      setTimer(10);
      
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimer(v => {
          if (v <= 1) {
            clearInterval(timerRef.current!);
            handleVocabAnswer(null); // Timeout
            return 0;
          }
          return v - 1;
        });
      }, 1000);
    } else {
      // Cascade match - auto resolve with reduced power
      applyEffect(matchType, matchSize, 0.25);
      await processCascade(currentBoard, matches);
    }
  };

  const processCascade = async (currentBoard: string[][], matches: { r: number, c: number }[]) => {
    setGameState('animating');
    
    // Remove matched tiles
    const newBoard = currentBoard.map(row => [...row]);
    matches.forEach(({ r, c }) => {
      newBoard[r][c] = '';
    });

    // Gravity
    for (let c = 0; c < GRID_SIZE; c++) {
      let emptyRow = GRID_SIZE - 1;
      for (let r = GRID_SIZE - 1; r >= 0; r--) {
        if (newBoard[r][c] !== '') {
          if (emptyRow !== r) {
            newBoard[emptyRow][c] = newBoard[r][c];
            newBoard[r][c] = '';
          }
          emptyRow--;
        }
      }
      // Fill from top
      for (let r = emptyRow; r >= 0; r--) {
        newBoard[r][c] = TILE_TYPES[Math.floor(Math.random() * TILE_TYPES.length)];
      }
    }

    setTimeout(() => {
      setBoard(newBoard);
      const nextMatches = findMatches(newBoard);
      if (nextMatches.length > 0) {
        handleMatches(newBoard, nextMatches, false);
      } else {
        setGameState('playing');
        checkEnemyTurn();
      }
    }, 300);
  };

  const handleVocabAnswer = (answer: string | null) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const isCorrect = answer === currentQuestion?.correctAnswer;
    setAnswerFeedback(isCorrect ? 'correct' : 'wrong');

    setTimeout(() => {
      setAnswerFeedback(null);
      if (isCorrect) {
        const newCombo = comboCount + 1;
        setComboCount(newCombo);
        let multiplier = 1;
        if (newCombo === 2) multiplier = 1.5;
        if (newCombo === 3) multiplier = 2.0;
        if (newCombo >= 4) multiplier = 2.5;
        
        applyEffect(pendingMatch!.type, pendingMatch!.size, multiplier);
        setPlayer(prev => ({
          ...prev,
          xp: prev.xp + (pointsPerQuestion || 10),
        }));
      } else {
        setComboCount(0);
        enemyAttack();
      }

      const matches = findMatches(board);
      processCascade(board, matches);
      setCurrentQuestion(null);
      setPendingMatch(null);
    }, 1000);
  };

  const applyEffect = (type: keyof typeof TILES, size: number, multiplier: number) => {
    const tile = TILES[type];
    const baseValue = size;
    const finalMultiplier = multiplier * player.comboMultiplier;

    switch (tile.effect) {
      case 'ATTACK':
        const dmg = Math.floor(tile.damage! * baseValue * finalMultiplier);
        damageEnemy(dmg);
        break;
      case 'HEAL':
        const heal = Math.floor(tile.healAmount! * baseValue * finalMultiplier);
        setPlayer(prev => ({ ...prev, hp: Math.min(prev.maxHp, prev.hp + heal) }));
        break;
      case 'MANA':
        const mana = Math.floor(tile.manaAmount! * baseValue * finalMultiplier);
        setPlayer(prev => ({ ...prev, mp: Math.min(prev.maxMp, prev.mp + mana) }));
        break;
      case 'DEFEND':
        setPlayer(prev => ({ ...prev, defense: 0.5 }));
        break;
      case 'COMBO':
        setPlayer(prev => ({ ...prev, comboMultiplier: 2 }));
        break;
      case 'SPECIAL':
        const specDmg = Math.floor(tile.damage! * baseValue * finalMultiplier);
        damageEnemy(specDmg);
        break;
    }

    if (tile.effect !== 'COMBO') {
       setPlayer(prev => ({ ...prev, comboMultiplier: 1 }));
    }
  };

  const damageEnemy = (amount: number) => {
    setShowDamage({ amount, isPlayer: false });
    setEnemy(prev => {
      const newHp = Math.max(0, prev.hp - amount);
      if (newHp === 0) setGameState('won');
      return { ...prev, hp: newHp };
    });
    setTimeout(() => setShowDamage(null), 1000);
  };

  const enemyAttack = () => {
    let amount = player.defense > 0 ? 5 : 10;
    setShowDamage({ amount, isPlayer: true });
    setPlayer(prev => {
      const newHp = Math.max(0, prev.hp - amount);
      if (newHp === 0) setGameState('lost');
      return { ...prev, hp: newHp, defense: 0 };
    });
    setEnemy(prev => ({ ...prev, turnsSinceAttack: 0 }));
    setTimeout(() => setShowDamage(null), 1000);
  };

  const checkEnemyTurn = () => {
    setEnemy(prev => {
      const nextTurns = prev.turnsSinceAttack + 1;
      if (nextTurns >= prev.attackInterval) {
        // Schedule attack shortly after cascade settles
        setTimeout(enemyAttack, 500);
        return { ...prev, turnsSinceAttack: 0 };
      }
      return { ...prev, turnsSinceAttack: nextTurns };
    });
  };

  const handleUltimate = () => {
    if (player.mp < 100 || gameState !== 'playing') return;
    
    // Choose a hard question (Scroll category or just any)
    const q = questions[Math.floor(Math.random() * questions.length)];
    setCurrentQuestion(q);
    setPendingMatch({ type: 'SCROLL', size: 3 }); // Mock a match for the ultimate
    setGameState('vocab');
    setPlayer(prev => ({ ...prev, mp: 0 }));
  };

  useEffect(() => {
    if (player.xp >= player.xpToLevel) {
      setPlayer(prev => ({
        ...prev,
        xp: prev.xp - prev.xpToLevel,
        xpToLevel: prev.xpToLevel + 50,
        maxHp: prev.maxHp + 20,
        hp: prev.maxHp + 20,
      }));
    }
  }, [player.xp]);

  useEffect(() => {
    if (gameState === 'won') {
       const bonus = player.hp;
       const finalScore = player.xp + bonus;
       
       // Save stats
       const stats = localStorage.getItem('wb_progress');
       const parsed = stats ? JSON.parse(stats) : { highScore: 0, totalCorrect: 0 };
       parsed.highScore = Math.max(parsed.highScore, finalScore);
       localStorage.setItem('wb_progress', JSON.stringify(parsed));
       
       setTimeout(() => onComplete(finalScore), 2000);
    }
  }, [gameState, onComplete, player.hp, player.xp]);

  return (
    <div className="relative w-full max-w-4xl mx-auto h-[95vh] md:h-[85vh] flex flex-col bg-[#1A1A2E] border-4 border-[#FBD000] rounded-3xl overflow-hidden shadow-2xl mt-4">
      {/* Top Header Section: Split for Desktop */}
      <div className="flex flex-col lg:grid lg:grid-cols-2 bg-[#101026] border-b-4 border-[#FBD000]">
        
        {/* Player Info (Top-Left on Desktop) */}
        <div className="hidden lg:flex items-center gap-4 p-4 border-r-2 border-white/10 bg-gradient-to-tr from-[#11111e] to-[#1A1A2E]">
          <div className="flex-shrink-0 w-20 h-20 flex items-center justify-center text-6xl relative">
            <span role="img" aria-label="wizard">🧙</span>
            <AnimatePresence>
              {showDamage && showDamage.isPlayer && (
                <motion.div
                  initial={{ opacity: 0, y: 0 }}
                  animate={{ opacity: 1, y: -40 }}
                  exit={{ opacity: 0 }}
                  className="absolute top-0 left-1/2 -translate-x-1/2 text-red-500 font-black text-2xl drop-shadow-md z-50 px-2 bg-black/40 rounded"
                >
                  -{showDamage.amount}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="flex-1 space-y-2">
             <div className="flex justify-between items-center px-1">
               <span className="pixel-font text-green-400 text-[10px] uppercase">Player HP</span>
               <span className="pixel-font text-white/60 text-[8px]">{player.hp}/{player.maxHp}</span>
             </div>
             <div className="h-4 w-full bg-black/40 border-2 border-white/20 rounded-full overflow-hidden">
               <motion.div 
                 className="h-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"
                 initial={{ width: '100%' }}
                 animate={{ width: `${(player.hp / player.maxHp) * 100}%` }}
               />
             </div>
             <div className="h-3 w-full bg-black/40 border-2 border-white/20 rounded-full overflow-hidden">
               <motion.div 
                 className="h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                 initial={{ width: '0%' }}
                 animate={{ width: `${(player.mp / player.maxMp) * 100}%` }}
               />
             </div>
             <div className="flex justify-between text-[6px] pixel-font text-white/40">
                <span>XP: {player.xp}/{player.xpToLevel}</span>
                <button 
                  onClick={handleUltimate}
                  disabled={player.mp < 100 || gameState !== 'playing'}
                  className={`px-3 py-1 rounded-lg pixel-font text-[6px] uppercase transition-all ${
                    player.mp >= 100 ? 'bg-yellow-400 text-black animate-pulse' : 'bg-gray-800 text-white/20'
                  }`}
                >Ultimate</button>
             </div>
          </div>
        </div>

        {/* Enemy Info (Top-Right on Desktop, Centered on Mobile) */}
        <div className="flex flex-col items-center justify-center p-2 sm:p-4 bg-gradient-to-b from-[#3d0d0d] to-[#1A1A2E]">
          <motion.div 
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="text-4xl sm:text-6xl mb-1 sm:mb-2 relative"
          >
            {enemy.emoji}
            <AnimatePresence>
              {showDamage && !showDamage.isPlayer && (
                <motion.div
                  initial={{ opacity: 0, y: 0 }}
                  animate={{ opacity: 1, y: -40 }}
                  exit={{ opacity: 0 }}
                  className="absolute top-0 left-1/2 -translate-x-1/2 text-red-500 font-black text-2xl drop-shadow-md z-50 whitespace-nowrap bg-black/40 px-2 rounded"
                >
                  -{showDamage.amount}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          <div className="w-full max-w-[200px] space-y-1">
            <div className="flex justify-between items-end">
              <span className="pixel-font text-white text-[8px] md:text-[10px] uppercase tracking-widest">{enemy.name}</span>
              <span className="pixel-font text-white/60 text-[6px]">{enemy.hp}/{enemy.maxHp}</span>
            </div>
            <div className="h-4 w-full bg-black/40 border-2 border-[#FBD000] rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.5)]"
                initial={{ width: '100%' }}
                animate={{ width: `${(enemy.hp / enemy.maxHp) * 100}%` }}
              />
            </div>
            <div className="flex gap-1">
              {Array.from({ length: enemy.attackInterval }).map((_, i) => (
                <div key={i} className={`flex-1 h-1 rounded-full ${i < enemy.turnsSinceAttack ? 'bg-[#FBD000]' : 'bg-white/10'}`} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Grid Section */}
      <div className="flex-1 flex flex-col md:flex-row items-center lg:justify-center p-1 sm:p-4 lg:p-8 gap-2 md:gap-8 lg:gap-12 overflow-y-auto pt-0 sm:pt-4">
        <div className="grid grid-cols-7 gap-0.5 sm:gap-1.5 lg:gap-2 bg-black/20 p-1 sm:p-3 rounded-xl border-4 border-[#049CD8]/30 max-w-full">
          {board.map((row, r) => 
            row.map((cell, c) => {
              const tile = cell ? TILES[cell as keyof typeof TILES] : null;
              const isSelected = selectedTile?.r === r && selectedTile?.c === c;
              const isHint = hint?.r1 === r && hint?.c1 === c;
              
              return (
                <motion.div
                  key={`${r}-${c}`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleTileClick(r, c)}
                  layout
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className={`
                    w-6 h-6 sm:w-10 sm:h-10 md:w-11 md:h-11 lg:w-14 lg:h-14 rounded flex items-center justify-center text-sm sm:text-xl lg:text-2xl cursor-pointer shadow-sm sm:shadow-md
                    ${isSelected ? 'ring-2 sm:ring-4 ring-white ring-offset-1 sm:ring-offset-2 ring-offset-[#1A1A2E] z-10 scale-110' : ''}
                    ${isHint ? 'animate-[hintGlow_1s_infinite_alternate]' : ''}
                  `}
                  style={{
                    backgroundColor: tile?.color || 'transparent',
                    borderColor: tile?.border || 'transparent',
                    borderWidth: '2px',
                    boxShadow: cell ? `0 2px 0 ${tile?.border}80` : 'none'
                  }}
                >
                  {tile?.emoji}
                </motion.div>
              );
            })
          )}
        </div>

        {/* Info Area (Mobile/Tablet: Below Grid, Desktop Sidebar) */}
        <div className="flex flex-col gap-2 sm:gap-4 w-full md:w-auto min-w-[100px] sm:min-w-[140px] px-2 pb-2">
          {/* Player Info (Mobile/Tablet) */}
          <div className="lg:hidden flex flex-col gap-1.5 sm:gap-3 p-2 sm:p-3 bg-black/40 rounded-xl border-2 border-white/10 shadow-lg">
             <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-10 h-10 sm:w-14 sm:h-14 flex-shrink-0 flex items-center justify-center text-2xl sm:text-4xl relative bg-black/40 rounded-full border-2 border-[#FBD000]/30">
                  <span role="img" aria-label="wizard">🧙</span>
                  <AnimatePresence>
                    {showDamage && showDamage.isPlayer && (
                      <motion.div
                        initial={{ opacity: 0, y: 0 }}
                        animate={{ opacity: 1, y: -20 }}
                        exit={{ opacity: 0 }}
                        className="absolute top-0 left-1/2 -translate-x-1/2 text-red-500 font-black text-lg drop-shadow-md z-50 bg-black/60 px-2 rounded-lg"
                      >
                        -{showDamage.amount}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div className="flex-1 space-y-1 sm:space-y-1.5">
                   <div className="flex justify-between items-center px-1">
                     <span className="pixel-font text-green-400 text-[5px] sm:text-[6px] uppercase tracking-widest">PLAYER HP</span>
                     <span className="pixel-font text-white/60 text-[4px] sm:text-[5px]">{player.hp}/{player.maxHp}</span>
                   </div>
                   <div className="h-2 sm:h-3 w-full bg-black/60 border-2 border-white/10 rounded-full overflow-hidden">
                     <motion.div 
                       className="h-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.3)]"
                       initial={{ width: '100%' }}
                       animate={{ width: `${(player.hp / player.maxHp) * 100}%` }}
                     />
                   </div>
                   <div className="h-1.5 sm:h-2 w-full bg-black/60 border-2 border-white/10 rounded-full overflow-hidden">
                     <motion.div 
                       className="h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.3)]"
                       initial={{ width: '0%' }}
                       animate={{ width: `${(player.mp / player.maxMp) * 100}%` }}
                     />
                   </div>
                </div>
             </div>
             <div className="flex justify-between items-center bg-black/20 p-1 sm:p-2 rounded-lg">
                <span className="pixel-font text-white/30 text-[4px] sm:text-[5px]">XP: {player.xp}/{player.xpToLevel}</span>
                <button 
                  onClick={handleUltimate}
                  disabled={player.mp < 100 || gameState !== 'playing'}
                  className={`px-2 py-0.5 sm:px-3 sm:py-1 rounded sm:rounded-lg pixel-font text-[5px] sm:text-[6px] uppercase transition-all ${
                    player.mp >= 100 
                    ? 'bg-[#FBD000] text-[#5C3010] shadow-[0_2px_0_#8B6914] animate-pulse border-2 border-white' 
                    : 'bg-gray-800 text-white/20 border-2 border-white/5'
                  } disabled:opacity-50`}
                >
                  Ultimate
                </button>
             </div>
          </div>

          {/* Glossary */}
          <div className="flex flex-row md:flex-col flex-wrap gap-1 md:gap-2 lg:gap-3 p-2 sm:p-4 bg-black/40 rounded-xl border-2 border-white/10 justify-center">
            <p className="pixel-font text-[7px] sm:text-[8px] sm:text-[10px] text-[#FBD000] uppercase text-center mb-0.5 sm:mb-1 lg:mb-2 w-full">Glossary</p>
            {Object.values(TILES).map(tile => (
              <div key={tile.id} className="flex items-center gap-1 sm:gap-2 lg:gap-3">
                <span className="text-sm sm:text-lg sm:text-xl">{tile.emoji}</span>
                <span className="pixel-font text-[5px] sm:text-[6px] sm:text-[8px] text-white/80 uppercase tracking-tighter">{tile.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>


      {/* Vocab Modal */}
      <AnimatePresence>
        {gameState === 'vocab' && currentQuestion && (
          <div className="absolute inset-0 bg-black/90 flex items-center justify-center p-4 z-[100] animate-fade-in">
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-[#1A1A2E] border-4 border-[#FBD000] rounded-2xl p-6 w-full space-y-6"
            >
              <div className="flex justify-between items-center">
                 <h4 className="pixel-font text-[#FBD000] text-[8px] uppercase tracking-widest">
                   {pendingMatch?.type} Match!
                 </h4>
                 <span className="text-white text-xl">⏱ {timer}s</span>
              </div>
              
              <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-red-600"
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 10, ease: 'linear' }}
                />
              </div>

              <div className="text-center p-4">
                <p className="font-sans font-black text-white text-lg leading-tight uppercase tracking-tight">
                  What does "{currentQuestion.questionText}" mean?
                </p>
                {currentQuestion.phonetic && <p className="text-[#049CD8] text-[8px] pixel-font mt-2">{currentQuestion.phonetic}</p>}
              </div>

              <div className="grid gap-3 relative">
                {currentQuestion.options?.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleVocabAnswer(opt)}
                    disabled={answerFeedback !== null}
                    className={`w-full py-4 px-4 border-4 rounded-xl pixel-font text-[9px] uppercase tracking-tighter shadow-md active:translate-y-1 active:shadow-none transition-all text-left flex items-center gap-3
                      ${answerFeedback === 'correct' && opt === currentQuestion.correctAnswer ? 'bg-green-500 border-green-700 text-white' : 
                        answerFeedback === 'wrong' && opt !== currentQuestion.correctAnswer ? 'bg-red-500 border-red-700 text-white opacity-50' :
                        'bg-[#FBD000] border-[#8B6914] text-[#5C3010] hover:brightness-110'
                      }
                    `}
                  >
                    <span className="opacity-40 text-[7px]">{String.fromCharCode(65 + i)}</span>
                    <span className="font-sans font-bold text-sm tracking-tight">{opt}</span>
                  </button>
                ))}

                <AnimatePresence>
                  {answerFeedback && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1.5, opacity: 1 }}
                      exit={{ scale: 2, opacity: 0 }}
                      className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
                    >
                      {answerFeedback === 'correct' ? (
                        <div className="bg-green-500 p-4 rounded-full border-4 border-white shadow-2xl">
                          <span className="text-6xl text-white">✅</span>
                        </div>
                      ) : (
                        <div className="bg-red-500 p-4 rounded-full border-4 border-white shadow-2xl">
                          <span className="text-6xl text-white">❌</span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Win/Lose Modals */}
      <AnimatePresence>
        {gameState === 'won' && (
          <div className="absolute inset-0 bg-[#43B047]/90 flex flex-col items-center justify-center p-8 z-[200] text-center">
             <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-8xl mb-8">🏆</motion.div>
             <h2 className="pixel-font text-white text-4xl mb-4 drop-shadow-lg">VICTORY!</h2>
             <p className="pixel-font text-white text-xs uppercase tracking-widest mb-8">The realm is safe... for now.</p>
             <div className="bg-white/20 p-6 rounded-2xl border-4 border-white/40 mb-8">
               <p className="pixel-font text-white text-[10px] uppercase">EXP GAINED: +{player.xp}</p>
               <p className="pixel-font text-white text-[10px] uppercase mt-2">HP BONUS: +{player.hp}</p>
             </div>
             <Button variant="outline" className="bg-white text-[#43B047] border-white" onClick={() => onComplete(player.xp + player.hp)}>Claim Rewards</Button>
          </div>
        )}

        {gameState === 'lost' && (
          <div className="absolute inset-0 bg-[#E52521]/90 flex flex-col items-center justify-center p-8 z-[200] text-center">
             <motion.div initial={{ rotate: 0 }} animate={{ rotate: [0, 45, -45, 0] }} className="text-8xl mb-8">💀</motion.div>
             <h2 className="pixel-font text-white text-4xl mb-4 drop-shadow-lg">DEFEATED!</h2>
             <p className="pixel-font text-white text-xs uppercase tracking-widest mb-8">Keep practicing your vocabulary!</p>
             <Button variant="outline" className="bg-white text-[#E52521] border-white" onClick={() => onComplete(0)}>Retry Level</Button>
          </div>
        )}
      </AnimatePresence>
      
      <style>{`
        @keyframes hintGlow {
          from { box-shadow: 0 0 0px 0px #FBD000; }
          to { box-shadow: 0 0 12px 4px #FBD000; }
        }
      `}</style>
    </div>
  );
};
