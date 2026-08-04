import { rebuildVectorIndex } from "@/lib/rag/retrieve";

export const runtime = "nodejs";

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST() {
  try {
    await rebuildVectorIndex();
    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to rebuild vector index:", error);

    return errorResponse(
      error instanceof Error
        ? error.message
        : "Unable to rebuild the document index.",
      500,
    );
  }
}
