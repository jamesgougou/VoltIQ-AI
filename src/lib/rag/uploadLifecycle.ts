export const CLEAR_ALL_CONFIRM_MESSAGE =
  "Clear all documents from VoltIQ? This removes library files and the search index. This cannot be undone.";

export const BULK_DELETE_CONFIRM_MESSAGE =
  "Delete the selected documents from the Knowledge Library? This cannot be undone.";

export type PersistDecision = {
  showInLibrary: boolean;
  allowIndexing: boolean;
  errorMessage: string | null;
};

/** Decide UI/indexing after a library PUT attempt. */
export function decideAfterPersistAttempt(
  success: boolean,
  failureMessage = "Unable to save the document. It was not added to your library.",
): PersistDecision {
  if (success) {
    return {
      showInLibrary: true,
      allowIndexing: true,
      errorMessage: null,
    };
  }

  return {
    showInLibrary: false,
    allowIndexing: false,
    errorMessage: failureMessage,
  };
}

export function shouldProceedWithDestructiveAction(confirmed: boolean): boolean {
  return confirmed;
}

/** IDs safe to remove from UI after a bulk delete API call. */
export function bulkDeleteUiRemovals(
  requestedIds: string[],
  serverSucceeded: boolean,
): string[] {
  return serverSucceeded ? [...requestedIds] : [];
}

/** Always delete server-side on remove — not only when indexedHashesRef knows the id. */
export function shouldDeletePersistedDocumentOnRemove(): boolean {
  return true;
}
