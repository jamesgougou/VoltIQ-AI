import { describe, expect, it } from "vitest";
import {
  MAX_CHAT_MESSAGES,
  MAX_CHAT_MESSAGE_CHARS,
  MAX_INDEX_TEXT_CHARS,
  validateChatPayload,
  validateIndexPayload,
} from "./requestLimits";

describe("validateChatPayload", () => {
  it("allows normal conversations", () => {
    expect(
      validateChatPayload({
        messages: [
          { role: "user", content: "What does clause 2.5 say?" },
          { role: "assistant", content: "Based on the document..." },
        ],
        documentIds: ["a1b2c3d4-e5f6-7890-abcd-ef1234567890"],
      }),
    ).toBeNull();
  });

  it("rejects too many messages", () => {
    const messages = Array.from({ length: MAX_CHAT_MESSAGES + 1 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `Message ${i}`,
    }));

    expect(validateChatPayload({ messages })).toMatch(/Too many messages/i);
  });

  it("rejects oversized messages", () => {
    expect(
      validateChatPayload({
        messages: [
          {
            role: "user",
            content: "x".repeat(MAX_CHAT_MESSAGE_CHARS + 1),
          },
        ],
      }),
    ).toMatch(/maximum length/i);
  });
});

describe("validateIndexPayload", () => {
  it("allows typical PDF extracts", () => {
    expect(
      validateIndexPayload({
        text: "Extracted page text",
        pages: [{ pageNumber: 1, text: "Hello" }],
      }),
    ).toBeNull();
  });

  it("rejects oversized document text", () => {
    expect(
      validateIndexPayload({
        text: "x".repeat(MAX_INDEX_TEXT_CHARS + 1),
      }),
    ).toMatch(/too large to index/i);
  });
});
