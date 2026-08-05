import {
  readLibraryImage,
  saveLibraryImage,
} from "@/lib/rag/libraryStore";
import { getVectorStore } from "@/lib/rag/store";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ documentId: string }>;
};

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/octet-stream",
]);

export async function GET(_request: Request, context: RouteContext) {
  const { documentId } = await context.params;

  if (!documentId?.trim()) {
    return Response.json({ error: "Document ID is required." }, { status: 400 });
  }

  try {
    const bytes = await readLibraryImage(documentId);

    if (!bytes) {
      return Response.json(
        { error: "Image file is not available for this document." },
        { status: 404 },
      );
    }

    const record = await getVectorStore().getDocumentRecord(documentId);
    const filename = record?.filename ?? `${documentId}.image`;
    const mimeType = record?.mimeType ?? "application/octet-stream";

    return new Response(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `inline; filename="${filename.replace(/"/g, "")}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Failed to serve library image:", error);
    return Response.json(
      { error: "Unable to load the image file." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const { documentId } = await context.params;

  if (!documentId?.trim()) {
    return Response.json({ error: "Document ID is required." }, { status: 400 });
  }

  try {
    const contentType = (
      request.headers.get("content-type") ?? "application/octet-stream"
    )
      .split(";")[0]
      .trim()
      .toLowerCase();

    if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
      return Response.json(
        { error: "Expected an image body (image/jpeg, image/png, image/webp)." },
        { status: 400 },
      );
    }

    const arrayBuffer = await request.arrayBuffer();
    if (arrayBuffer.byteLength === 0) {
      return Response.json({ error: "Empty image body." }, { status: 400 });
    }

    const mimeType =
      contentType === "application/octet-stream" ? "image/jpeg" : contentType;

    await saveLibraryImage(documentId, Buffer.from(arrayBuffer));
    await getVectorStore().updateDocumentRecord(documentId, {
      hasImage: true,
      sourceKind: "image",
      mimeType,
    });

    return Response.json({
      documentId,
      saved: true,
      bytes: arrayBuffer.byteLength,
      mimeType,
    });
  } catch (error) {
    console.error("Failed to save library image:", error);
    return Response.json(
      { error: "Unable to save the image file." },
      { status: 500 },
    );
  }
}
