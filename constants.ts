import { GradeLevel } from './types';

// Map grades to likely textbooks based on MOET curriculum trends
export const TEXTBOOKS_BY_GRADE: Record<string, string[]> = {
  'Secondary': [
    'Global Success (6-9)',
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
  { score: 100, name: "Tiny Star", icon: "⭐", color: "text-yellow-400" },
  { score: 200, name: "Clever Fox", icon: "🦊", color: "text-orange-500" },
  { score: 500, name: "Smart Owl", icon: "🦉", color: "text-blue-500" },
  { score: 700, name: "Bright Leader", icon: "🦁", color: "text-red-500" },
  { score: 1000, name: "Power Brain I", icon: "🧠", color: "text-pink-500" },
  { score: 1500, name: "Power Brain II", icon: "🧠⚡", color: "text-purple-500" },
  { score: 2000, name: "Power Brain III", icon: "🧠🔥", color: "text-rose-600" },
  { score: 2500, name: "Magic Mind I", icon: "🔮", color: "text-indigo-500" },
  { score: 3000, name: "Magic Mind II", icon: "🔮✨", color: "text-violet-500" },
  { score: 3500, name: "Magic Mind III", icon: "🔮👑", color: "text-fuchsia-600" },
];