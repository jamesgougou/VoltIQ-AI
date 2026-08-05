import { readLibraryPdf, saveLibraryPdf } from "@/lib/rag/libraryStore";
import { getVectorStore } from "@/lib/rag/store";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ documentId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { documentId } = await context.params;

  if (!documentId?.trim()) {
    return Response.json({ error: "Document ID is required." }, { status: 400 });
  }

  try {
    const bytes = await readLibraryPdf(documentId);

    if (!bytes) {
      return Response.json(
        { error: "PDF file is not available for this document." },
        { status: 404 },
      );
    }

    const record = await getVectorStore().getDocumentRecord(documentId);
    const filename = record?.filename ?? `${documentId}.pdf`;

    return new Response(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename.replace(/"/g, "")}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Failed to serve library PDF:", error);
    return Response.json(
      { error: "Unable to load the PDF file." },
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
    const contentType = request.headers.get("content-type") ?? "";
    if (
      !contentType.includes("application/pdf") &&
      !contentType.includes("application/octet-stream")
    ) {
      return Response.json(
        { error: "Expected a PDF body (application/pdf)." },
        { status: 400 },
      );
    }

    const arrayBuffer = await request.arrayBuffer();
    if (arrayBuffer.byteLength === 0) {
      return Response.json({ error: "Empty PDF body." }, { status: 400 });
    }

    await saveLibraryPdf(documentId, Buffer.from(arrayBuffer));
    await getVectorStore().updateDocumentRecord(documentId, { hasPdf: true });

    return Response.json({
      documentId,
      saved: true,
      bytes: arrayBuffer.byteLength,
    });
  } catch (error) {
    console.error("Failed to save library PDF:", error);
    return Response.json(
      { error: "Unable to save the PDF file." },
      { status: 500 },
    );
  }
}
