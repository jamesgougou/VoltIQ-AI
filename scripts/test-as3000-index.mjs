import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..");
const baseUrl = process.env.VOLTIQ_BASE_URL ?? "http://localhost:3000";

async function loadEnv() {
  try {
    const raw = await readFile(path.join(projectRoot, ".env.local"), "utf8");

    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separator = trimmed.indexOf("=");

      if (separator === -1) {
        continue;
      }

      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim();

      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env.local is optional for API-only tests against a running dev server.
  }
}

async function findPdfPath() {
  const candidates = [
    process.env.AS3000_PDF_PATH,
    path.join(
      process.env.USERPROFILE ?? "",
      "OneDrive",
      "Documents",
      "VoltIQ",
      "knowledge_base",
      "AS3000-2018.pdf",
    ),
    path.join(
      process.env.USERPROFILE ?? "",
      "OneDrive",
      "VoltIQ",
      "knowledge_base",
      "AS3000-2018.pdf",
    ),
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      await readFile(candidate);
      return candidate;
    } catch {
      // try next candidate
    }
  }

  throw new Error(
    "AS3000-2018.pdf not found. Set AS3000_PDF_PATH to the full file path.",
  );
}

async function extractPdfText(pdfPath) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(await readFile(pdfPath));
  const loadingTask = pdfjs.getDocument({ data, useSystemFonts: true });
  const pdf = await loadingTask.promise;
  const pages = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .trim();

    if (text) {
      pages.push({ pageNumber, text });
    }
  }

  await loadingTask.destroy();

  const text = pages.map((page) => page.text).join("\n\n").trim();

  if (!text) {
    throw new Error("No extractable text found in AS3000 PDF.");
  }

  return { text, pages, totalPages: pdf.numPages };
}

function hashContent(content) {
  return createHash("sha256").update(content).digest("hex");
}

async function main() {
  await loadEnv();

  const pdfPath = await findPdfPath();
  console.info(`Using PDF: ${pdfPath}`);

  const { text, pages, totalPages } = await extractPdfText(pdfPath);
  console.info(
    `Extracted ${text.length.toLocaleString()} characters across ${totalPages} pages (${pages.length} pages with text).`,
  );

  const documentId = `test-as3000-${Date.now()}`;
  const contentHash = hashContent(text);

  console.info("Posting to /api/rag/index ...");

  const indexResponse = await fetch(`${baseUrl}/api/rag/index`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      documentId,
      documentName: "AS3000-2018.pdf",
      text,
      pages,
      contentHash,
    }),
  });

  const indexPayload = await indexResponse.json();
  console.info("Index response:", indexPayload);

  const statusResponse = await fetch(
    `${baseUrl}/api/rag/status?documentIds=${encodeURIComponent(documentId)}`,
  );
  const statusPayload = await statusResponse.json();
  console.info("Status response:", statusPayload);

  const chatResponse = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: "What is an RCD?" }],
      hasTextDocuments: true,
      documentIds: [documentId],
    }),
  });

  if (!chatResponse.ok) {
    const chatError = await chatResponse.json();
    console.error("Chat blocked:", chatError);
    process.exit(indexPayload.status === "ready" ? 1 : 0);
  }

  const chatText = await chatResponse.text();
  console.info(`Chat succeeded (${chatText.length} chars streamed).`);
  console.info("Preview:", chatText.slice(0, 240).replace(/\s+/g, " "));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
