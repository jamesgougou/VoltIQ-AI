import { describe, expect, it } from "vitest";
import {
  getImageUploadSizeViolation,
  MAX_IMAGE_SIZE_BYTES,
} from "./limits";

describe("server image size limits", () => {
  it("rejects oversized images", () => {
    expect(
      getImageUploadSizeViolation(MAX_IMAGE_SIZE_BYTES + 1),
    ).toMatch(/20 MB/i);
  });

  it("accepts normal images", () => {
    expect(getImageUploadSizeViolation(1024 * 1024)).toBeNull();
    expect(getImageUploadSizeViolation(MAX_IMAGE_SIZE_BYTES)).toBeNull();
  });
});
