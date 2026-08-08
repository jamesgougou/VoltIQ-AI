export const QUICK_PROMPTS = [
  "What does my documents say about RCD testing requirements?",
  "Find AS/NZS clause references about RCBO protection in my documents",
  "Maximum Demand method in my documents — include Source / Page",
  "Cable sizing guidance in my documents with clause or table references if present",
] as const;

export type QuickPrompt = (typeof QUICK_PROMPTS)[number];
