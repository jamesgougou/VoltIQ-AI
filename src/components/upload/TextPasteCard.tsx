"use client";

import { useState } from "react";
import { UploadCard } from "./UploadCard";
import { TextIcon } from "./UploadIcons";

export function TextPasteCard() {
  const [text, setText] = useState("");

  return (
    <UploadCard
      title="Paste Text"
      description="Paste or type content directly for analysis."
      icon={<TextIcon />}
    >
      <textarea
        id="text-paste"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Paste your text here..."
        rows={5}
        className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
      />
      {text.length > 0 && (
        <p className="mt-2 text-xs text-slate-400">
          {text.length.toLocaleString()} characters
        </p>
      )}
    </UploadCard>
  );
}
