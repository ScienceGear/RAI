import { TaskCategory } from "@/types";

export interface CategoryConfig {
  color: string;
  darkColor: string;
  icon: string;
  keywords: string[];
}

export const CATEGORIES: Record<string, CategoryConfig> = {
  Work: {
    color: "#6366F1",
    darkColor: "#818CF8",
    icon: "briefcase",
    keywords: ["report", "meeting", "client", "proposal", "invoice", "deadline", "project", "presentation", "email", "work", "office", "task", "manager", "boss", "team", "business", "sales"],
  },
  Learning: {
    color: "#8B5CF6",
    darkColor: "#A78BFA",
    icon: "book",
    keywords: ["read", "study", "revise", "practice", "course", "lecture", "learn", "chapter", "notes", "exam", "quiz", "research", "review", "homework", "assignment", "class"],
  },
  Health: {
    color: "#10B981",
    darkColor: "#34D399",
    icon: "activity",
    keywords: ["gym", "workout", "run", "yoga", "meditation", "walk", "exercise", "swim", "diet", "sleep", "health", "fitness", "cardio", "weights", "stretch", "jog", "bike", "pilates"],
  },
  Creative: {
    color: "#EC4899",
    darkColor: "#F472B6",
    icon: "pen-tool",
    keywords: ["write", "design", "draw", "compose", "edit", "create", "art", "music", "video", "content", "blog", "photo", "film", "podcast", "paint", "sketch", "graphic"],
  },
  Personal: {
    color: "#F59E0B",
    darkColor: "#FCD34D",
    icon: "user",
    keywords: ["groceries", "dentist", "laundry", "bills", "family", "home", "errand", "shopping", "clean", "organize", "cook", "call mom", "call dad", "doctor", "appointment", "chores"],
  },
  Finance: {
    color: "#06B6D4",
    darkColor: "#22D3EE",
    icon: "dollar-sign",
    keywords: ["budget", "invoice", "investment", "bill", "tax", "financial", "money", "savings", "expense", "income", "salary", "bank", "stock", "crypto", "fund"],
  },
  Social: {
    color: "#F97316",
    darkColor: "#FB923C",
    icon: "users",
    keywords: ["event", "party", "networking", "message", "meet", "social", "friend", "birthday", "gathering", "dinner", "lunch", "coffee", "date", "hang out", "volunteer"],
  },
  "Side Project": {
    color: "#14B8A6",
    darkColor: "#2DD4BF",
    icon: "code",
    keywords: ["startup", "side project", "app", "website", "launch", "build", "product", "mvp", "feature", "saas", "indie", "freelance", "contract", "client project"],
  },
};

export const DYNAMIC_CATEGORY_PALETTE = [
  "#EF4444",
  "#84CC16",
  "#A855F7",
  "#0EA5E9",
  "#F43F5E",
  "#22C55E",
];

export function getCategoryColor(category: string, isDark = true): string {
  const cat = CATEGORIES[category];
  if (cat) return isDark ? cat.darkColor : cat.color;
  const idx = Math.abs(hashStr(category)) % DYNAMIC_CATEGORY_PALETTE.length;
  return DYNAMIC_CATEGORY_PALETTE[idx];
}

export function getCategoryIcon(category: string): string {
  return CATEGORIES[category]?.icon ?? "tag";
}

function hashStr(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash;
}

export const PRIORITY_LABELS: Record<number, string> = {
  1: "Low",
  2: "Medium",
  3: "High",
  4: "Urgent",
};

export const PRIORITY_COLORS: Record<number, string> = {
  1: "#6B7280",
  2: "#F59E0B",
  3: "#F97316",
  4: "#EF4444",
};

export const LEVEL_TITLES: Array<{ minLevel: number; title: string }> = [
  { minLevel: 1, title: "Beginner" },
  { minLevel: 5, title: "Consistent" },
  { minLevel: 10, title: "Focused" },
  { minLevel: 20, title: "Dedicated" },
  { minLevel: 30, title: "Elite" },
  { minLevel: 50, title: "Grandmaster" },
];

export const RAI_SCORE_TIERS = [
  { min: 0, max: 99, tier: "Novice", title: "Just Getting Started" },
  { min: 100, max: 299, tier: "Learner", title: "Finding the Groove" },
  { min: 300, max: 599, tier: "Scholar", title: "Building Momentum" },
  { min: 600, max: 899, tier: "Master", title: "Discipline Master" },
  { min: 900, max: 1000, tier: "Grandmaster", title: "RAI Grandmaster" },
];

export function getRaiScoreTier(score: number) {
  return RAI_SCORE_TIERS.find((t) => score >= t.min && score <= t.max) ?? RAI_SCORE_TIERS[0];
}
