import { TaskCategory } from "@/types";
import { CATEGORIES } from "@/constants/categories";

export function categorizeTaskLocal(title: string, existingCategories?: string[]): TaskCategory {
  const lower = title.toLowerCase();

  for (const [category, config] of Object.entries(CATEGORIES)) {
    const matched = config.keywords.some((kw) => lower.includes(kw));
    if (matched) return category as TaskCategory;
  }

  if (existingCategories && existingCategories.length > 0) {
    for (const cat of existingCategories) {
      const config = CATEGORIES[cat];
      if (config) {
        const matched = config.keywords.some((kw) => lower.includes(kw));
        if (matched) return cat as TaskCategory;
      }
    }
  }

  return "Work";
}

export function parseDurationFromText(text: string): number {
  const lower = text.toLowerCase();
  const hourMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:hour|hr|h)\b/);
  const minMatch = lower.match(/(\d+)\s*(?:minute|min|m)\b/);

  let total = 0;
  if (hourMatch) total += Math.round(parseFloat(hourMatch[1]) * 60);
  if (minMatch) total += parseInt(minMatch[1]);

  return total > 0 ? total : 60;
}

export function parsePriorityFromText(text: string): 1 | 2 | 3 | 4 {
  const lower = text.toLowerCase();
  if (lower.match(/urgent|critical|asap|immediately|high priority|very important/)) return 4;
  if (lower.match(/important|high|soon|quickly/)) return 3;
  if (lower.match(/medium|moderate|normal/)) return 2;
  return 2;
}

export function parseDeadlineFromText(text: string): string | undefined {
  const now = new Date();
  const lower = text.toLowerCase();

  if (lower.includes("today")) {
    return now.toISOString();
  }
  if (lower.includes("tomorrow")) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return d.toISOString();
  }

  const dayMap: Record<string, number> = {
    monday: 1, tuesday: 2, wednesday: 3, thursday: 4,
    friday: 5, saturday: 6, sunday: 0,
  };
  for (const [day, target] of Object.entries(dayMap)) {
    if (lower.includes(day)) {
      const d = new Date(now);
      const current = d.getDay();
      let diff = target - current;
      if (diff <= 0) diff += 7;
      d.setDate(d.getDate() + diff);
      return d.toISOString();
    }
  }

  if (lower.match(/this week|week/)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 5);
    return d.toISOString();
  }

  return undefined;
}
