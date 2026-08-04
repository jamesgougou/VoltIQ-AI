import { getDocumentIndexStatuses } from "@/lib/rag/retrieve";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const documentIds = searchParams
    .get("documentIds")
    ?.split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  const statuses = documentIds?.length
    ? await getDocumentIndexStatuses(documentIds)
    : [];

  return Response.json({ statuses });
}
