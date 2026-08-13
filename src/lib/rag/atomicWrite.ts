import { randomBytes } from "node:crypto";
import { createWriteStream } from "node:fs";
import { rename, unlink, writeFile } from "node:fs/promises";
import { once } from "node:events";
import path from "node:path";

export class StorageWriteError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "StorageWriteError";
  }
}

function isRetryableFsError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = "code" in error ? String((error as { code?: string }).code) : "";
  return (
    code === "EPERM" ||
    code === "EACCES" ||
    code === "EBUSY" ||
    code === "ENOENT" ||
    code === "EEXIST"
  );
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Rename with exponential backoff. Windows commonly returns EPERM when the
 * destination (or source) is still briefly locked by AV or a closing handle.
 */
export async function renameWithRetry(
  fromPath: string,
  toPath: string,
  options?: { attempts?: number; label?: string },
): Promise<void> {
  const attempts = options?.attempts ?? 8;
  const label = options?.label ?? path.basename(toPath);
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      console.info(`[RAG] Renaming... (${label}, attempt ${attempt}/${attempts})`);
      await rename(fromPath, toPath);
      console.info(`[RAG] Rename complete. (${label})`);
      return;
    } catch (error) {
      lastError = error;

      if (!isRetryableFsError(error) || attempt === attempts) {
        break;
      }

      // On Windows, replacing an existing file can fail while a reader/AV holds it.
      // Drop the destination (best-effort) then retry the rename.
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        ((error as { code?: string }).code === "EPERM" ||
          (error as { code?: string }).code === "EEXIST")
      ) {
        await unlink(toPath).catch(() => undefined);
      }

      const delayMs = Math.min(1000, 25 * 2 ** (attempt - 1));
      console.warn(
        `[RAG] Rename failed for ${label} (${String((error as { code?: string }).code ?? error)}). Retrying in ${delayMs}ms…`,
      );
      await sleep(delayMs);
    }
  }

  throw new StorageWriteError(
    `Unable to update local document storage (${label}). Please try again in a moment.`,
    { cause: lastError },
  );
}

export function createUniqueTempPath(directory: string, baseName: string): string {
  const unique = `${process.pid}.${Date.now()}.${randomBytes(4).toString("hex")}`;
  return path.join(directory, `${baseName}.${unique}.tmp`);
}

/**
 * Write a complete buffer/string to a temp file, then atomically rename into place.
 */
export async function writeBytesAtomically(
  destinationPath: string,
  data: string | Uint8Array,
  options?: { encoding?: BufferEncoding; label?: string },
): Promise<void> {
  const directory = path.dirname(destinationPath);
  const baseName = path.basename(destinationPath);
  const tempPath = createUniqueTempPath(directory, baseName);
  const label = options?.label ?? baseName;

  try {
    if (typeof data === "string") {
      await writeFile(tempPath, data, options?.encoding ?? "utf8");
    } else {
      await writeFile(tempPath, data);
    }

    await renameWithRetry(tempPath, destinationPath, { label });
  } catch (error) {
    await unlink(tempPath).catch(() => undefined);

    if (error instanceof StorageWriteError) {
      throw error;
    }

    throw new StorageWriteError(
      `Unable to update local document storage (${label}). Please try again in a moment.`,
      { cause: error },
    );
  }
}

/**
 * Write text via a stream, wait until the file handle is fully closed, then
 * atomically rename into place. Never renames while the stream is still open.
 */
export async function writeFileAtomically(
  destinationPath: string,
  write: (writeLine: (chunk: string) => Promise<void>) => Promise<void>,
): Promise<void> {
  const directory = path.dirname(destinationPath);
  const baseName = path.basename(destinationPath);
  const tempPath = createUniqueTempPath(directory, baseName);

  console.info(`[RAG] Writing temp file... (${path.basename(tempPath)})`);

  const stream = createWriteStream(tempPath, {
    encoding: "utf8",
    flags: "w",
  });

  try {
    const writeLine = async (chunk: string) => {
      if (!stream.write(chunk)) {
        await once(stream, "drain");
      }
    };

    await write(writeLine);

    console.info(`[RAG] Closing stream... (${path.basename(tempPath)})`);
    // Register close listener BEFORE end() so we never miss a fast close.
    const closed = once(stream, "close");
    stream.end();
    await closed;

    await renameWithRetry(tempPath, destinationPath, {
      label: path.basename(destinationPath),
    });
  } catch (error) {
    if (!stream.destroyed) {
      stream.destroy();
    }
    await unlink(tempPath).catch(() => undefined);

    if (error instanceof StorageWriteError) {
      throw error;
    }

    throw new StorageWriteError(
      "Unable to update local document storage. Please try again in a moment.",
      { cause: error },
    );
  }
}
