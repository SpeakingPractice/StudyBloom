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
  folderName?: string;
}

const ATTACKS_PER_WORD = 2; // Fixed requirement: player must see each word 2 times
const BASE_MATCH_DAMAGE = 20;

const TILES = {
  SWORD: {
    id: 'SWORD',
    emoji: '⚔️',
    color: '#E52521',
    border: '#8B1A18',
    effect: 'atk',
    damage: 20, // Updated to match base damage for scaling
    vocabCategory: 'Verb',
    label: 'ATTACK',
  },
  HEART: {
    id: 'HEART',
    emoji: '❤️',
    color: '#FF69B4',
    border: '#C0185A',
    effect: 'heal',
    healAmount: 20,
    vocabCategory: 'Adjective',
    label: 'HEAL',
  },
  MANA: {
    id: 'MANA',
    emoji: '💠',
    color: '#FBD000',
    border: '#C8980A',
    effect: 'mana',
    manaAmount: 25,
    vocabCategory: 'Noun',
    label: 'MANA',
  },
  SHIELD: {
    id: 'SHIELD',
    emoji: '🛡️',
    vocabCategory: 'Noun',
    label: 'DEFEND',
    color: '#049CD8',
    border: '#025A80',
    effect: 'defend',
  },
  STAR: {
    id: 'STAR',
    emoji: '⭐',
    color: '#FF8C00',
    border: '#B35E00',
    effect: 'combo',
    vocabCategory: 'Adverb',
    label: 'COMBO',
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

export const WordBattleGame: React.FC<WordBattleGameProps> = ({ questions, onComplete, grade, isPractice, folderName }) => {
  const [board, setBoard] = useState<string[][]>([]);
  const [selectedTile, setSelectedTile] = useState<{ r: number, c: number } | null>(null);
  const [score, setScore] = useState(0);
  const [wordQueue, setWordQueue] = useState<QuestionData[]>([]);
  const [usedWords, setUsedWords] = useState<QuestionData[]>([]);
  
  const [player, setPlayer] = useState<PlayerStats>({
    hp: 200, maxHp: 200,
    mp: 0, maxMp: 100,
    xp: 0, xpToLevel: 200,
    defense: 0,
    comboMultiplier: 1,
  });

  const enemyInitial = (grade && ENEMIES_BY_GRADE[grade]) || ENEMIES_BY_GRADE['Grade 6'];
  const initialHP = questions.length > 0 ? questions.length * ATTACKS_PER_WORD * BASE_MATCH_DAMAGE : enemyInitial.hp;

  const [enemy, setEnemy] = useState<EnemyStats>({
    name: folderName ? `QUEST: ${questions.length} WORDS` : enemyInitial.name,
    hp: Math.max(initialHP, 100),
    maxHp: Math.max(initialHP, 100),
    attackPower: enemyInitial.attack,
    attackInterval: enemyInitial.interval,
    turnsSinceAttack: 0,
    emoji: enemyInitial.emoji,
  });
  const [comboCount, setComboCount] = useState(0);
  const [gameState, setGameState] = useState<'playing' | 'vocab' | 'animating' | 'won' | 'lost'>('playing');
  const [answerFeedback, setAnswerFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [pendingMatch, setPendingMatch] = useState<{ type: keyof typeof TILES, size: number, positions: {r: number, c: number}[] } | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionData | null>(null);
  const [timer, setTimer] = useState(10);
  const [showDamage, setShowDamage] = useState<{ amount: number, isPlayer: boolean } | null>(null);
  const [hint, setHint] = useState<{ r1: number, c1: number } | null>(null);
  
  const appRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hintTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sound Engine
  const playSwordHitSound = useCallback(() => {
    try {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const now = ctx.currentTime;

      // Metallic clang
      const bufSize = Math.floor(ctx.sampleRate * 0.08);
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i/bufSize, 2);
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buf;
      const clangFilter = ctx.createBiquadFilter();
      clangFilter.type = 'bandpass';
      clangFilter.frequency.value = 3500;
      clangFilter.Q.value = 2;
      const clangGain = ctx.createGain();
      clangGain.gain.setValueAtTime(0.6, now);
      clangGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      noise.connect(clangFilter);
      clangFilter.connect(clangGain);
      clangGain.connect(ctx.destination);
      noise.start(now); noise.stop(now + 0.08);

      // Deep thud
      const thud = ctx.createOscillator();
      const thudGain = ctx.createGain();
      thud.connect(thudGain); thudGain.connect(ctx.destination);
      thud.type = 'sine';
      thud.frequency.setValueAtTime(180, now);
      thud.frequency.exponentialRampToValueAtTime(40, now + 0.12);
      thudGain.gain.setValueAtTime(0.5, now);
      thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      thud.start(now); thud.stop(now + 0.15);

      // Sharp scrape
      const bufSize2 = Math.floor(ctx.sampleRate * 0.05);
      const buf2 = ctx.createBuffer(1, bufSize2, ctx.sampleRate);
      const data2 = buf2.getChannelData(0);
      for (let i = 0; i < bufSize2; i++) {
        data2[i] = (Math.random() * 2 - 1) * (1 - i/bufSize2);
      }
      const scrape = ctx.createBufferSource();
      scrape.buffer = buf2;
      const scrapeFilter = ctx.createBiquadFilter();
      scrapeFilter.type = 'highpass'; 
      scrapeFilter.frequency.value = 5000;
      const scrapeGain = ctx.createGain();
      scrapeGain.gain.setValueAtTime(0.3, now + 0.02);
      scrapeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      scrape.connect(scrapeFilter);
      scrapeFilter.connect(scrapeGain);
      scrapeGain.connect(ctx.destination);
      scrape.start(now + 0.02); scrape.stop(now + 0.07);
    } catch (e) {
      console.warn('Audio not available');
    }
  }, []);

  const shakeScreen = useCallback((intensity = 5, duration = 300) => {
    if (!appRef.current) return;
    const app = appRef.current;
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      if (elapsed >= duration) {
        app.style.transform = 'translate(0, 0)';
        clearInterval(interval);
        return;
      }
      const remaining = 1 - elapsed / duration;
      const x = (Math.random() * 2 - 1) * intensity * remaining;
      const y = (Math.random() * 2 - 1) * intensity * remaining;
      app.style.transform = `translate(${x}px, ${y}px)`;
    }, 16);
  }, []);

  const animateSwordAttack = async (matchPositions: {r: number, c: number}[]) => {
    return new Promise<void>(resolve => {
      const origins = matchPositions.slice(0, 3);
      const bossEl = document.getElementById('boss-emoji');
      if (!bossEl) return resolve();
      
      const bossRect = bossEl.getBoundingClientRect();
      const projectiles: HTMLDivElement[] = [];

      origins.forEach(({r, c}, i) => {
        const tileEl = document.getElementById(`tile-${r}-${c}`);
        if (!tileEl) return;
        const tileRect = tileEl.getBoundingClientRect();

        const sword = document.createElement('div');
        sword.textContent = '🗡️';
        sword.style.cssText = `
          position: fixed;
          font-size: 24px;
          pointer-events: none;
          z-index: 200;
          left: ${tileRect.left + tileRect.width/2}px;
          top: ${tileRect.top + tileRect.height/2}px;
          transform: rotate(-45deg);
          transition: left 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94),
                      top 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94),
                      opacity 0.1s ease 0.3s;
        `;
        document.body.appendChild(sword);
        projectiles.push(sword);

        setTimeout(() => {
          sword.style.left = `${bossRect.left + bossRect.width/2}px`;
          sword.style.top = `${bossRect.top + bossRect.height/2}px`;
        }, i * 60);
      });

      setTimeout(() => {
        projectiles.forEach(s => { s.style.opacity = '0'; });
        playSwordHitSound();
        shakeScreen();
        setTimeout(() => {
          projectiles.forEach(s => s.remove());
          resolve();
        }, 150);
      }, 420);
    });
  };

  const shuffleArray = <T,>(array: T[]): T[] => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const buildQueue = useCallback(() => {
    const shuffled = shuffleArray(questions);
    setWordQueue(shuffled);
    setUsedWords([]);
  }, [questions]);

  useEffect(() => {
    buildQueue();
  }, [buildQueue]);

  const getNextWord = () => {
    let currentQueue = [...wordQueue];
    let currentUsed = [...usedWords];

    if (currentQueue.length === 0) {
      const lastWord = currentUsed[currentUsed.length - 1];
      const nextBatch = shuffleArray(questions).filter(w => w.id !== lastWord?.id);
      currentQueue = nextBatch;
      currentUsed = [];
    }

    const word = currentQueue.shift()!;
    currentUsed.push(word);
    
    setWordQueue(currentQueue);
    setUsedWords(currentUsed);
    return word;
  };

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
      const matchPositions = matches.filter(({r, c}) => currentBoard[r][c] === matchType);
      setPendingMatch({ type: matchType, size: matchSize, positions: matchPositions });
      
      const q = getNextWord();
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
      applyEffect(matchType, matchSize, 0.25, []);
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

  const handleVocabAnswer = async (answer: string | null) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const isCorrect = answer === currentQuestion?.correctAnswer;
    setAnswerFeedback(isCorrect ? 'correct' : 'wrong');

    setTimeout(async () => {
      const effect = pendingMatch!;
      setAnswerFeedback(null);
      
      if (isCorrect) {
        setScore(prev => prev + 10);
        const newCombo = comboCount + 1;
        setComboCount(newCombo);
        let multiplier = 1;
        if (newCombo === 2) multiplier = 1.5;
        if (newCombo === 3) multiplier = 2.0;
        if (newCombo >= 4) multiplier = 2.5;
        
        await applyEffect(effect.type, effect.size, multiplier, effect.positions);
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

  const applyEffect = async (type: keyof typeof TILES, size: number, multiplier: number, positions: {r: number, c: number}[]) => {
    const tile = TILES[type];
    const baseValue = size;
    const finalMultiplier = multiplier * player.comboMultiplier;

    if (tile.effect === 'atk' || tile.effect === 'special') {
      await animateSwordAttack(positions);
    }

    switch (tile.effect) {
      case 'atk':
        const dmg = Math.floor(tile.damage! * baseValue * finalMultiplier);
        damageEnemy(dmg);
        break;
      case 'heal':
        const heal = Math.floor(tile.healAmount! * baseValue * finalMultiplier);
        setPlayer(prev => ({ ...prev, hp: Math.min(prev.maxHp, prev.hp + heal) }));
        break;
      case 'mana':
        const mana = Math.floor(tile.manaAmount! * baseValue * finalMultiplier);
        setPlayer(prev => ({ ...prev, mp: Math.min(prev.maxMp, prev.mp + mana) }));
        break;
      case 'defend':
        setPlayer(prev => ({ ...prev, defense: 0.5 }));
        break;
      case 'combo':
        setPlayer(prev => ({ ...prev, comboMultiplier: 2 }));
        break;
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
    playSwordHitSound();
    shakeScreen(3, 200);
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

  const handleUltimate = async () => {
    if (player.mp < 100 || gameState !== 'playing') return;
    
    // Ultimate hit effect
    playSwordHitSound();
    setTimeout(playSwordHitSound, 80);
    shakeScreen(8, 400);

    const q = getNextWord();
    setCurrentQuestion(q);
    setPendingMatch({ type: 'SWORD', size: 5, positions: [] }); 
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
       const finalScore = score + bonus;
       
       // Save stats
       const stats = localStorage.getItem('wb_progress');
       const parsed = stats ? JSON.parse(stats) : { highScore: 0, totalCorrect: 0 };
       parsed.highScore = Math.max(parsed.highScore, finalScore);
       localStorage.setItem('wb_progress', JSON.stringify(parsed));
       
       setTimeout(() => onComplete(finalScore), 2000);
    }
  }, [gameState, onComplete, player.hp, score]);

  return (
    <div ref={appRef} className="app relative w-full max-w-[420px] md:max-w-4xl mx-auto h-[780px] min-h-[600px] flex flex-col bg-[#1A1A2E] border-8 border-[#FBD000] border-double rounded-3xl overflow-hidden shadow-2xl mt-4 mb-20 z-50">
      {/* Top Header Section: Split for Desktop */}
      <div className="flex flex-col md:grid md:grid-cols-2 bg-[#101026] border-b-4 border-[#FBD000]">
        
        {/* Player Info (Top-Left on Desktop Only) */}
        <div className="hidden md:flex flex-1 items-center gap-4 p-4 border-r-2 border-white/10 bg-gradient-to-tr from-[#11111e] to-[#1A1A2E]">
          <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center text-4xl relative">
            <span role="img" aria-label="wizard">🧙</span>
            <AnimatePresence>
              {showDamage && showDamage.isPlayer && (
                <motion.div
                  initial={{ opacity: 0, y: 0 }}
                  animate={{ opacity: 1, y: -40 }}
                  exit={{ opacity: 0 }}
                  className="absolute top-0 left-1/2 -translate-x-1/2 text-red-500 font-black text-xl drop-shadow-md z-50 px-2 bg-black/40 rounded"
                >
                  -{showDamage.amount}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="flex-1 space-y-1">
             <div className="flex justify-between items-center px-1">
               <span className="pixel-font text-[#FBD000] text-[8px] uppercase">SCORE: {score}</span>
               <span className="pixel-font text-white/60 text-[6px]">{player.hp}/{player.maxHp}</span>
             </div>
             <div className="h-3 w-full bg-black/40 border-2 border-white/20 rounded-full overflow-hidden">
               <motion.div 
                 className="h-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"
                 initial={{ width: '100%' }}
                 animate={{ width: `${(player.hp / player.maxHp) * 100}%` }}
               />
             </div>
             <div className="h-2 w-full bg-black/40 border-2 border-white/20 rounded-full overflow-hidden">
               <motion.div 
                 className="h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                 initial={{ width: '0%' }}
                 animate={{ width: `${(player.mp / player.maxMp) * 100}%` }}
               />
             </div>
             <div className="flex justify-between items-center mt-1">
                <span className="pixel-font text-white/40 text-[5px] uppercase">MANA: {Math.floor(player.mp)}%</span>
                <button 
                  onClick={handleUltimate}
                  disabled={player.mp < 100 || gameState !== 'playing'}
                  className={`px-2 py-0.5 rounded pixel-font text-[5px] uppercase transition-all ${
                    player.mp >= 100 ? 'bg-yellow-400 text-black animate-pulse' : 'bg-gray-800 text-white/20'
                  }`}
                >Ultimate</button>
             </div>
          </div>
        </div>

        {/* Enemy Info (Always Top) */}
        <div className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4 bg-gradient-to-b from-[#3d0d0d] to-[#1A1A2E]">
          <motion.div 
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="text-4xl sm:text-6xl mb-1 sm:mb-2 relative"
            id="boss-emoji"
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
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col md:flex-row items-center justify-center p-2 sm:p-4 gap-4 md:gap-12 relative z-1">
        <div className="grid grid-cols-7 gap-1 sm:gap-2 bg-black/40 p-2 sm:p-4 rounded-xl border-4 border-[#FBD000]/20 shadow-inner relative z-1">
          {board.map((row, r) => 
            row.map((cell, c) => {
              const tile = cell ? TILES[cell as keyof typeof TILES] : null;
              const isSelected = selectedTile?.r === r && selectedTile?.c === c;
              const isHint = hint?.r1 === r && hint?.c1 === c;
              
              return (
                <motion.div
                  key={`${r}-${c}`}
                  id={`tile-${r}-${c}`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleTileClick(r, c)}
                  layout
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className={`
                    w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 flex items-center justify-center text-xl sm:text-2xl md:text-3xl cursor-pointer shadow-md rounded-[10px] relative z-2
                    ${isSelected ? 'ring-4 ring-white ring-offset-2 ring-offset-[#1A1A2E] z-20 scale-110' : ''}
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

        {/* Info Area (Player Section & Glossary) */}
        <div className="flex flex-col gap-4 w-full md:w-auto px-2 pb-6">
          {/* Player Info (Visible on Mobile Only below grid) */}
          <div className="md:hidden flex flex-col gap-3 p-4 bg-black/40 rounded-xl border-2 border-white/10 shadow-lg">
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
                     <span className="pixel-font text-[#FBD000] text-[5px] sm:text-[6px] uppercase tracking-widest">SCORE: {score}</span>
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
                <span className="pixel-font text-white/30 text-[4px] sm:text-[5px]">📚 {questions.length - wordQueue.length}/{questions.length} WORDS</span>
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
          <div className="absolute inset-0 bg-black/95 flex items-center justify-center p-4 z-[100] scale-100 origin-center">
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

              <div className="grid gap-3 relative max-h-[50vh] overflow-y-auto custom-scrollbar p-1">
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
                <p className="pixel-font text-white text-[10px] uppercase">SCORE: {score} pts</p>
                <p className="pixel-font text-white text-[10px] uppercase mt-2">HP REMAINING: {player.hp}</p>
                <p className="pixel-font text-white text-[10px] uppercase mt-2">WORDS PRACTICED: {usedWords.length}</p>
              </div>
              <Button variant="outline" className="bg-white text-[#43B047] border-white" onClick={() => onComplete(score + player.hp)}>Claim Rewards</Button>
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
