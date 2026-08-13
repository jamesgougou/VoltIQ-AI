/** Hard limits for chat / indexing APIs — sized for normal VoltIQ usage. */

export const MAX_CHAT_MESSAGES = 40;
export const MAX_CHAT_MESSAGE_CHARS = 32_000;
export const MAX_CHAT_TOTAL_CHARS = 120_000;
export const MAX_CHAT_DOCUMENT_IDS = 100;

export const MAX_INDEX_TEXT_CHARS = 2_000_000;
export const MAX_INDEX_PAGES = 2_000;
export const MAX_INDEX_PAGE_TEXT_CHARS = 100_000;

export function validateChatPayload(input: {
  messages: { role: string; content: string }[];
  documentIds?: string[];
}): string | null {
  if (input.messages.length > MAX_CHAT_MESSAGES) {
    return `Too many messages in this request (max ${MAX_CHAT_MESSAGES}). Start a new conversation or shorten history.`;
  }

  let totalChars = 0;

  for (const message of input.messages) {
    const length = message.content.length;
    if (length > MAX_CHAT_MESSAGE_CHARS) {
      return `A message exceeds the maximum length of ${MAX_CHAT_MESSAGE_CHARS.toLocaleString()} characters.`;
    }
    totalChars += length;
  }

  if (totalChars > MAX_CHAT_TOTAL_CHARS) {
    return `This conversation is too large (max ${MAX_CHAT_TOTAL_CHARS.toLocaleString()} characters). Start a new conversation or shorten history.`;
  }

  if (input.documentIds && input.documentIds.length > MAX_CHAT_DOCUMENT_IDS) {
    return `Too many documents selected for retrieval (max ${MAX_CHAT_DOCUMENT_IDS}).`;
  }

  return null;
}

export function validateIndexPayload(input: {
  text: string;
  pages?: { pageNumber?: number; text?: string }[];
}): string | null {
  if (input.text.length > MAX_INDEX_TEXT_CHARS) {
    return `Document text is too large to index (max ${MAX_INDEX_TEXT_CHARS.toLocaleString()} characters). Split the document or reduce extracted text.`;
  }

  const pages = input.pages ?? [];

  if (pages.length > MAX_INDEX_PAGES) {
    return `Document has too many pages to index (max ${MAX_INDEX_PAGES}).`;
  }

  for (const page of pages) {
    if (
      typeof page.text === "string" &&
      page.text.length > MAX_INDEX_PAGE_TEXT_CHARS
    ) {
      return `A page exceeds the maximum extract size of ${MAX_INDEX_PAGE_TEXT_CHARS.toLocaleString()} characters.`;
    }
  }

  return null;
}
