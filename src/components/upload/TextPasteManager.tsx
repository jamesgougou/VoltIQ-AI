"use client";

import { useEffect, useState } from "react";
import { countWords } from "@/lib/format";
import { ManagerSection } from "./ManagerSection";
import { TextIcon } from "./UploadIcons";

type TextPasteManagerProps = {
  onHasContentChange?: (hasContent: boolean) => void;
};

export function TextPasteManager({
  onHasContentChange,
}: TextPasteManagerProps) {
  const [text, setText] = useState("");

  const characterCount = text.length;
  const wordCount = countWords(text);
  const hasText = characterCount > 0;

  useEffect(() => {
    onHasContentChange?.(hasText);
  }, [hasText, onHasContentChange]);

  function handleClear() {
    setText("");
  }

  return (
    <ManagerSection
      title="Paste Text"
      description="Paste or type content directly"
      icon={<TextIcon />}
      action={
        hasText ? (
          <button
            type="button"
            onClick={handleClear}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 sm:text-sm"
          >
            Clear
          </button>
        ) : undefined
      }
    >
      <textarea
        id="text-paste"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Paste your text here..."
        rows={3}
        className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
      />
      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-400">
        <span>
          {characterCount.toLocaleString()}{" "}
          {characterCount === 1 ? "character" : "characters"}
        </span>
        <span>
          {wordCount.toLocaleString()} {wordCount === 1 ? "word" : "words"}
        </span>
      </div>
    </ManagerSection>
  );
}
