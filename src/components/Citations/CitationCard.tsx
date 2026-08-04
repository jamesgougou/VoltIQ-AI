"use client";

import { useState } from "react";
import type { IndexedCitation } from "@/types/citation";
import { ChevronIcon, DocumentIcon } from "./CitationIcons";

type CitationCardProps = {
  citation: IndexedCitation;
  messageId: string;
  defaultExpanded?: boolean;
};

const CONFIDENCE_STYLES = {
  High: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Medium: "bg-amber-50 text-amber-700 ring-amber-200",
  Low: "bg-slate-100 text-slate-600 ring-slate-200",
} as const;

export function CitationCard({
  citation,
  messageId,
  defaultExpanded = false,
}: CitationCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const cardId = `citation-${messageId}-${citation.id}`;

  return (
    <article
      id={cardId}
      className="scroll-mt-24 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-slate-50/80"
        aria-expanded={expanded}
        aria-controls={`${cardId}-details`}
      >
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
          <DocumentIcon />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-900">
              {citation.document}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${CONFIDENCE_STYLES[citation.confidence]}`}
            >
              {citation.confidence}
            </span>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
            <span>Page {citation.page}</span>
            {citation.clause && <span>Clause {citation.clause}</span>}
          </div>

          {!expanded && (
            <p className="mt-1.5 line-clamp-1 text-[11px] text-slate-400">
              {citation.excerpt}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5 pt-0.5 text-[11px] font-medium text-violet-600">
          <span className="hidden sm:inline">
            {expanded ? "Close" : "Open Source"}
          </span>
          <ChevronIcon expanded={expanded} className="h-4 w-4 text-slate-400" />
        </div>
      </button>

      {expanded && (
        <div
          id={`${cardId}-details`}
          className="border-t border-slate-100 bg-slate-50/60 px-3 py-3"
        >
          <dl className="space-y-2.5 text-xs">
            <div>
              <dt className="font-medium text-slate-500">Document</dt>
              <dd className="mt-0.5 font-mono text-slate-800">{citation.fileName}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Page</dt>
              <dd className="mt-0.5 text-slate-800">{citation.page}</dd>
            </div>
            {citation.clause && (
              <div>
                <dt className="font-medium text-slate-500">Clause</dt>
                <dd className="mt-0.5 text-slate-800">{citation.clause}</dd>
              </div>
            )}
          </dl>

          <div className="mt-3 border-t border-slate-200 pt-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Extract
            </p>
            <blockquote className="mt-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs leading-relaxed text-slate-700">
              {citation.excerpt}
            </blockquote>
          </div>
        </div>
      )}
    </article>
  );
}
