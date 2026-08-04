export const QUICK_PROMPTS = [
  "What is an RCD?",
  "Explain RCBO",
  "Maximum Demand",
  "Cable sizing",
] as const;

export type QuickPrompt = (typeof QUICK_PROMPTS)[number];
