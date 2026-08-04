"use client";

import { useState } from "react";
import { countWords } from "@/lib/format";
import { UploadCard } from "./UploadCard";
import { TextIcon } from "./UploadIcons";

export function TextPasteCard() {
  const [text, setText] = useState("");

  const characterCount = text.length;
  const wordCount = countWords(text);
  const hasText = characterCount > 0;

  function handleClear() {
    setText("");
  }

  return (
    <UploadCard
      title="Paste Text"
      description="Paste or type content directly for analysis."
      icon={<TextIcon />}
      status={hasText ? "success" : null}
      actions={
        hasText ? (
          <button
            type="button"
            onClick={handleClear}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700"
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
        rows={5}
        className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
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
    </UploadCard>
  );
}
