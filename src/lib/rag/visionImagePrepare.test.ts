import { describe, expect, it } from "vitest";
import sharp from "sharp";
import {
  prepareImageForVision,
  resolveVisionLongEdge,
  VISION_MAX_LONG_EDGE,
  VISION_TARGET_LONG_EDGE,
} from "./visionImagePrepare";

describe("resolveVisionLongEdge", () => {
  it("keeps images up to 4096 px", () => {
    expect(resolveVisionLongEdge(2000)).toBeNull();
    expect(resolveVisionLongEdge(VISION_MAX_LONG_EDGE)).toBeNull();
  });

  it("downscales above 4096 to the 3072 target", () => {
    expect(resolveVisionLongEdge(5000)).toBe(VISION_TARGET_LONG_EDGE);
  });
});

describe("prepareImageForVision", () => {
  it("accepts a normal image without resizing", async () => {
    const original = await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 3,
        background: { r: 20, g: 40, b: 60 },
      },
    })
      .png()
      .toBuffer();

    const prepared = await prepareImageForVision(original, "image/png");
    expect(prepared.resized).toBe(false);
    expect(prepared.bytes.equals(original)).toBe(true);
  });

  it("Vision receives a resized image while caller keeps the original buffer", async () => {
    const original = await sharp({
      create: {
        width: 5000,
        height: 3000,
        channels: 3,
        background: { r: 10, g: 10, b: 10 },
      },
    })
      .png()
      .toBuffer();

    const prepared = await prepareImageForVision(original, "image/png");
    expect(prepared.resized).toBe(true);
    expect(Math.max(prepared.width, prepared.height)).toBe(
      VISION_TARGET_LONG_EDGE,
    );
    // Original library bytes are unchanged by the prepare helper.
    expect(original.byteLength).toBeGreaterThan(prepared.bytes.byteLength);
    const originalMeta = await sharp(original).metadata();
    expect(originalMeta.width).toBe(5000);
  });
});
