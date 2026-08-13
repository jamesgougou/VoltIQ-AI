export function chatEmptyStateMessage(options: {
  hasDocuments: boolean;
  indexingInProgress: boolean;
}): string {
  if (options.indexingInProgress) {
    return "Documents are still indexing. Open Library to watch progress, then ask a question.";
  }
  if (!options.hasDocuments) {
    return "Ask a question or open Library to upload a document.";
  }
  return "Ask a question about your documents or standards.";
}

export function studyEmptyStateMessage(options: {
  hasDocuments: boolean;
  indexingInProgress: boolean;
}): string {
  if (!options.hasDocuments) {
    return "Upload documents in Library to enable Study Mode.";
  }
  if (options.indexingInProgress) {
    return "Documents are still indexing. Open Library to watch progress before starting Study.";
  }
  return "";
}

export function indexingHelperText(indexingInProgress: boolean): string {
  if (!indexingInProgress) {
    return "For numerical calculations use Calculator mode · Enter to send";
  }
  return "Indexing in progress — open Library to watch progress.";
}
