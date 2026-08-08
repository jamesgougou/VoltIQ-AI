export const QUICK_PROMPTS = [
  "RCD testing requirements in my documents",
  "Explain RCBO protection from my documents",
  "Maximum Demand method in my documents",
  "Cable sizing guidance in my documents",
] as const;

export type QuickPrompt = (typeof QUICK_PROMPTS)[number];
