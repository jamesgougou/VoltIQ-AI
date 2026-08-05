"use client";

import { useState } from "react";
import type { IndexedCitation } from "@/types/citation";
import { usePDFViewerOptional } from "@/components/PDFViewer";
import { ChevronIcon, DocumentIcon } from "./CitationIcons";

type CitationCardProps = {
  citation: IndexedCitation;
  messageId: string;
  defaultExpanded?: boolean;
};

function formatSimilarity(score: number): string {
  return score.toFixed(2);
}

export function CitationCard({
  citation,
  messageId,
  defaultExpanded = false,
}: CitationCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const pdfViewer = usePDFViewerOptional();
  const cardId = `citation-${messageId}-${citation.id}`;
  const isUnavailable = citation.unavailable || !citation.excerpt.trim();
  const canOpenSource =
    Boolean(pdfViewer) &&
    !isUnavailable &&
    citation.documentId !== "pasted-text";

  function handleOpenSource(event: React.MouseEvent) {
    event.stopPropagation();

    if (!pdfViewer || !canOpenSource) {
      setExpanded(true);
      return;
    }

    pdfViewer.openCitation(citation);
  }

  return (
    <article
      id={cardId}
      className="scroll-mt-24 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/80 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex w-full items-start gap-3 p-3">
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="flex min-w-0 flex-1 items-start gap-3 text-left transition-colors"
          aria-expanded={expanded}
          aria-controls={`${cardId}-details`}
        >
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm">
            <DocumentIcon />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-900">
                {citation.index}. {citation.document}
              </span>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
              {citation.page !== undefined && <span>Page {citation.page}</span>}
              {citation.clause && <span>Clause {citation.clause}</span>}
              {!isUnavailable && (
                <span>
                  Similarity {formatSimilarity(citation.similarityScore)}
                </span>
              )}
            </div>

            {!expanded && !isUnavailable && (
              <p className="mt-1.5 line-clamp-1 text-[11px] text-slate-400">
                {citation.excerpt}
              </p>
            )}

            {isUnavailable && (
              <p className="mt-1.5 text-[11px] text-slate-500">
                Source information unavailable.
              </p>
            )}
          </div>

          <ChevronIcon
            expanded={expanded}
            className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
          />
        </button>

        <button
          type="button"
          onClick={handleOpenSource}
          disabled={!canOpenSource && !isUnavailable}
          className="shrink-0 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-[11px] font-semibold text-violet-700 transition-colors hover:border-violet-300 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Open Source
        </button>
      </div>

      {expanded && (
        <div
          id={`${cardId}-details`}
          className="border-t border-slate-200 bg-white px-3 py-3"
        >
          {isUnavailable ? (
            <p className="text-xs text-slate-500">Source unavailable.</p>
          ) : (
            <>
              <dl className="space-y-2.5 text-xs">
                <div>
                  <dt className="font-medium text-slate-500">Filename</dt>
                  <dd className="mt-0.5 font-mono text-slate-800">
                    {citation.fileName}
                  </dd>
                </div>
                {citation.page !== undefined && (
                  <div>
                    <dt className="font-medium text-slate-500">Page</dt>
                    <dd className="mt-0.5 text-slate-800">{citation.page}</dd>
                  </div>
                )}
                <div>
                  <dt className="font-medium text-slate-500">Chunk</dt>
                  <dd className="mt-0.5 text-slate-800">
                    {citation.chunkIndex + 1}
                  </dd>
                </div>
                {citation.clause && (
                  <div>
                    <dt className="font-medium text-slate-500">Clause</dt>
                    <dd className="mt-0.5 text-slate-800">{citation.clause}</dd>
                  </div>
                )}
                <div>
                  <dt className="font-medium text-slate-500">Similarity</dt>
                  <dd className="mt-0.5 text-slate-800">
                    {formatSimilarity(citation.similarityScore)}
                  </dd>
                </div>
              </dl>

              <div className="mt-3 border-t border-slate-200 pt-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  Retrieved text
                </p>
                <blockquote className="citation-excerpt mt-1.5 rounded-lg border border-amber-200/80 bg-amber-50/70 px-3 py-2 text-xs leading-relaxed text-slate-700">
                  <mark className="citation-highlight rounded-sm bg-amber-200/80 px-0.5 text-inherit">
                    {citation.excerpt}
                  </mark>
                </blockquote>
              </div>

              {canOpenSource && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={handleOpenSource}
                    className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 transition-colors hover:border-violet-300 hover:bg-violet-100"
                  >
                    Open Source
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </article>
  );
}
