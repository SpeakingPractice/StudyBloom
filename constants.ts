
import { GradeLevel } from './types';

export const TEXTBOOKS_BY_GRADE: Record<string, string[]> = {
  'Secondary': [
    'Global Success (6-9)',
    'Achievers',
    'Friends Plus',
    'i-Learn Smart World',
    'Right On!',
    'English Discovery',
    'THiNK'
  ],
  'High': [
    'Global Success (10-12)',
    'Friends Global',
    'Bright',
    'i-Learn Smart World',
    'English Discovery'
  ]
};

export const GRADE_GROUPS = {
  'Secondary School (THCS)': [GradeLevel.Grade6, GradeLevel.Grade7, GradeLevel.Grade8, GradeLevel.Grade9],
  'High School (THPT)': [GradeLevel.Grade10, GradeLevel.Grade11, GradeLevel.Grade12],
};

export const MOTIVATIONAL_MESSAGES = [
  "Giỏi lắm! (Great job!)",
  "Tiếp tục phát huy nhé! (Keep it up!)",
  "Bạn đang làm rất tốt! (You're doing great!)",
  "Tuyệt vời! (Awesome!)"
];

export interface Badge {
  score: number;
  name: string;
  icon: string;
  color: string;
}

export const BADGE_LEVELS: Badge[] = [
  { score: 0, name: "Little Explorer", icon: "🧭", color: "text-green-500" },
  { score: 50, name: "Happy Helper", icon: "🤝", color: "text-yellow-500" },
  { score: 100, name: "Word Bunny", icon: "🐰", color: "text-pink-400" },
  { score: 150, name: "Magic Sprout", icon: "🌱", color: "text-green-600" },
  { score: 200, name: "Star Cub", icon: "🐻", color: "text-amber-600" },
  { score: 300, name: "Clever Cat", icon: "🐱", color: "text-orange-400" },
  { score: 400, name: "Friendly Fox", icon: "🦊", color: "text-orange-600" },
  { score: 500, name: "Story Bird", icon: "🐦", color: "text-blue-400" },
  { score: 650, name: "Word Wizard", icon: "🧙‍♂️", color: "text-purple-600" },
  { score: 800, name: "Rainbow Knight", icon: "🌈", color: "text-indigo-500" },
  { score: 1000, name: "Moon Panda", icon: "🐼", color: "text-gray-700" },
  { score: 1200, name: "Star Dolphin", icon: "🐬", color: "text-cyan-500" },
  { score: 1400, name: "Magic Owl", icon: "🦉", color: "text-teal-600" },
  { score: 1600, name: "Sunshine Lion", icon: "🦁", color: "text-yellow-600" },
  { score: 1800, name: "Dream Dragon", icon: "🐉", color: "text-red-600" },
  { score: 2100, name: "Cloud Unicorn", icon: "🦄", color: "text-fuchsia-500" },
  { score: 2400, name: "Crystal Fairy", icon: "🧚‍♀️", color: "text-emerald-500" },
  { score: 2700, name: "Star Traveler", icon: "🚀", color: "text-blue-700" },
  { score: 3000, name: "Golden Hero", icon: "🦸", color: "text-yellow-500" },
  { score: 3300, name: "Super Star Legend", icon: "🌟", color: "text-rose-600" },
  { score: 3600, name: "Language Light", icon: "✨", color: "text-amber-400" },
];
