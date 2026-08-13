/**
 * Prepare a Vision API payload from library image bytes.
 * Library originals are never modified — only the returned buffer is resized.
 */

export const VISION_TARGET_LONG_EDGE = 3072;
export const VISION_MAX_LONG_EDGE = 4096;

export type PreparedVisionImage = {
  bytes: Buffer;
  mimeType: string;
  width: number;
  height: number;
  resized: boolean;
};

function pickOutputFormat(mimeType: string): {
  mimeType: string;
  sharpFormat: "png" | "jpeg" | "webp";
} {
  const normalized = mimeType.toLowerCase();

  // Prefer diagram-friendly PNG for line art / lossless sources.
  if (
    normalized === "image/png" ||
    normalized === "image/gif" ||
    normalized === "image/webp"
  ) {
    return { mimeType: "image/png", sharpFormat: "png" };
  }

  if (normalized === "image/jpeg" || normalized === "image/jpg") {
    return { mimeType: "image/jpeg", sharpFormat: "jpeg" };
  }

  return { mimeType: "image/png", sharpFormat: "png" };
}

/**
 * Downscale only when longer than VISION_MAX_LONG_EDGE (4096).
 * Images between 3072–4096 are kept (diagram/nameplate detail).
 * Larger images are resized to VISION_TARGET_LONG_EDGE (3072).
 */
export function resolveVisionLongEdge(longestEdge: number): number | null {
  if (longestEdge <= VISION_MAX_LONG_EDGE) {
    return null;
  }

  return VISION_TARGET_LONG_EDGE;
}

export async function prepareImageForVision(
  bytes: Buffer,
  mimeType: string,
): Promise<PreparedVisionImage> {
  const sharp = (await import("sharp")).default;
  const image = sharp(bytes, { failOn: "none" });
  const metadata = await image.metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  const longestEdge = Math.max(width, height);
  const targetLongEdge = resolveVisionLongEdge(longestEdge);

  if (!targetLongEdge || width === 0 || height === 0) {
    return {
      bytes,
      mimeType,
      width,
      height,
      resized: false,
    };
  }

  const scale = targetLongEdge / longestEdge;
  const nextWidth = Math.max(1, Math.round(width * scale));
  const nextHeight = Math.max(1, Math.round(height * scale));
  const output = pickOutputFormat(mimeType);

  let pipeline = sharp(bytes, { failOn: "none" }).resize(nextWidth, nextHeight, {
    fit: "inside",
    withoutEnlargement: true,
    kernel: "lanczos3",
  });

  if (output.sharpFormat === "jpeg") {
    pipeline = pipeline.jpeg({ quality: 90, mozjpeg: true });
  } else if (output.sharpFormat === "webp") {
    pipeline = pipeline.webp({ quality: 90, nearLossless: true });
  } else {
    pipeline = pipeline.png({ compressionLevel: 6 });
  }

  const resizedBytes = Buffer.from(await pipeline.toBuffer());

  return {
    bytes: resizedBytes,
    mimeType: output.mimeType,
    width: nextWidth,
    height: nextHeight,
    resized: true,
  };
}
