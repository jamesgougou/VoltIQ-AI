import { listLibraryDocuments } from "@/lib/rag/retrieve";

export const runtime = "nodejs";

export async function GET() {
  try {
    const documents = await listLibraryDocuments();
    return Response.json({ documents });
  } catch (error) {
    console.error("Failed to list document library:", error);
    return Response.json(
      { error: "Unable to load the document library." },
      { status: 500 },
    );
  }
}
