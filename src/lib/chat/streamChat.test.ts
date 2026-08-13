import { afterEach, describe, expect, it, vi } from "vitest";
import { encodeSourcesTrailer } from "@/lib/rag/streamMetadata";
import { ChatStreamError, streamChatResponse } from "./streamChat";

const baseOptions = {
  hasTextDocuments: false,
  documentIds: [] as string[],
  onChunk: () => {},
};

function hangingFetch(): typeof fetch {
  return vi.fn((_url: string, init?: RequestInit) => {
    return new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal;
      if (!signal) {
        return;
      }
      if (signal.aborted) {
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }
      signal.addEventListener("abort", () => {
        reject(new DOMException("Aborted", "AbortError"));
      });
    });
  }) as unknown as typeof fetch;
}

function upstreamFailureFetch(): typeof fetch {
  return vi.fn(async () => ({
    ok: false,
    status: 502,
    json: async () => ({ error: "OpenAI upstream failed." }),
  })) as unknown as typeof fetch;
}

function successfulStreamFetch(body: string): typeof fetch {
  const encoder = new TextEncoder();
  return vi.fn(async () => ({
    ok: true,
    body: new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(body));
        controller.close();
      },
    }),
  })) as unknown as typeof fetch;
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("streamChatResponse abort classification", () => {
  it("classifies user cancellation (not timeout)", async () => {
    vi.stubGlobal("fetch", hangingFetch());
    const parent = new AbortController();

    const promise = streamChatResponse([], {
      ...baseOptions,
      signal: parent.signal,
    });

    parent.abort();

    await expect(promise).rejects.toMatchObject({
      name: "ChatStreamError",
      reason: "cancelled",
    });

    const error = await promise.catch((err: unknown) => err);
    expect(error).toBeInstanceOf(ChatStreamError);
    expect((error as ChatStreamError).reason).not.toBe("timeout");
  });

  it("classifies stream timeout (not cancellation)", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", hangingFetch());

    const promise = streamChatResponse([], baseOptions);

    const expectation = expect(promise).rejects.toMatchObject({
      name: "ChatStreamError",
      reason: "timeout",
    });

    await vi.advanceTimersByTimeAsync(65_000);
    await expectation;

    const error = await promise.catch((err: unknown) => err);
    expect(error).toBeInstanceOf(ChatStreamError);
    expect((error as ChatStreamError).reason).not.toBe("cancelled");
  });

  it("classifies upstream failure (not cancellation or timeout)", async () => {
    vi.stubGlobal("fetch", upstreamFailureFetch());

    const promise = streamChatResponse([], baseOptions);

    await expect(promise).rejects.toMatchObject({
      name: "ChatStreamError",
      reason: "upstream",
    });

    const error = await promise.catch((err: unknown) => err);
    expect(error).toBeInstanceOf(ChatStreamError);
    expect((error as ChatStreamError).reason).not.toBe("cancelled");
    expect((error as ChatStreamError).reason).not.toBe("timeout");
  });

  it("completes a normal stream without error classification", async () => {
    const trailer = encodeSourcesTrailer([]);
    vi.stubGlobal("fetch", successfulStreamFetch(`Hello${trailer}`));

    const chunks: string[] = [];
    await expect(
      streamChatResponse([], {
        ...baseOptions,
        onChunk: (chunk) => {
          chunks.push(chunk);
        },
      }),
    ).resolves.toBeUndefined();

    expect(chunks.join("")).toBe("Hello");
  });
});
