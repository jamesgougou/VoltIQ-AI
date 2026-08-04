export class IndexCancelledError extends Error {
  constructor(message = "Document indexing cancelled.") {
    super(message);
    this.name = "IndexCancelledError";
  }
}

const activeControllers = new Map<string, AbortController>();

export function registerIndexCancellation(documentId: string): AbortSignal {
  const existing = activeControllers.get(documentId);

  if (existing) {
    existing.abort();
  }

  const controller = new AbortController();
  activeControllers.set(documentId, controller);
  return controller.signal;
}

export function cancelIndexOperation(documentId: string): boolean {
  const controller = activeControllers.get(documentId);

  if (!controller) {
    return false;
  }

  controller.abort();
  activeControllers.delete(documentId);
  return true;
}

export function clearIndexCancellation(documentId: string): void {
  activeControllers.delete(documentId);
}

export function assertNotCancelled(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new IndexCancelledError();
  }
}

export function isCancellationError(error: unknown): boolean {
  if (error instanceof IndexCancelledError) {
    return true;
  }

  if (error instanceof Error && error.name === "AbortError") {
    return true;
  }

  return false;
}
