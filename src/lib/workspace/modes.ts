export const WORKSPACE_MODES = [
  "chat",
  "calculator",
  "study",
  "library",
  "inspection",
] as const;

export type WorkspaceMode = (typeof WORKSPACE_MODES)[number];

export type WorkspaceModeDefinition = {
  id: WorkspaceMode;
  label: string;
  /** Reserved future slot — not selectable. */
  disabled?: boolean;
  description?: string;
};

export const WORKSPACE_MODE_DEFINITIONS: WorkspaceModeDefinition[] = [
  { id: "chat", label: "Chat", description: "Ask document and standards questions" },
  {
    id: "calculator",
    label: "Calculator",
    description: "Deterministic electrical calculators",
  },
  { id: "study", label: "Study", description: "Quizzes, exams and flashcards" },
  {
    id: "library",
    label: "Library",
    description: "Manage knowledge library documents",
  },
  {
    id: "inspection",
    label: "Inspection",
    disabled: true,
    description: "Coming soon",
  },
];

export const DEFAULT_WORKSPACE_MODE: WorkspaceMode = "chat";

export function isWorkspaceMode(value: string): value is WorkspaceMode {
  return (WORKSPACE_MODES as readonly string[]).includes(value);
}

export function canSelectWorkspaceMode(mode: WorkspaceMode): boolean {
  const definition = WORKSPACE_MODE_DEFINITIONS.find((item) => item.id === mode);
  return Boolean(definition && !definition.disabled);
}

/** Resolve the next mode after a user click (ignores disabled slots). */
export function resolveWorkspaceModeSelection(
  current: WorkspaceMode,
  next: WorkspaceMode,
): WorkspaceMode {
  if (!canSelectWorkspaceMode(next)) {
    return current;
  }
  return next;
}
