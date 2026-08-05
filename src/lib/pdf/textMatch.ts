export type TextItemBox = {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  transform: number[];
};

export type HighlightRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type PageTextMatch = {
  pageNumber: number;
  startIndex: number;
  endIndex: number;
  rects: HighlightRect[];
};

function normalizeChar(char: string): string {
  if (/\s/.test(char)) {
    return " ";
  }

  return char.toLowerCase();
}

/**
 * Build a whitespace-normalized string and map each normalized index back to
 * the original character index.
 */
export function buildNormalizedIndex(text: string): {
  normalized: string;
  map: number[];
} {
  const map: number[] = [];
  let normalized = "";
  let previousWasSpace = false;

  for (let index = 0; index < text.length; index++) {
    const char = normalizeChar(text[index]!);

    if (char === " ") {
      if (previousWasSpace || normalized.length === 0) {
        continue;
      }

      previousWasSpace = true;
      normalized += " ";
      map.push(index);
      continue;
    }

    previousWasSpace = false;
    normalized += char;
    map.push(index);
  }

  return {
    normalized: normalized.trimEnd(),
    map: map.slice(0, normalized.trimEnd().length),
  };
}

export function normalizeSearchQuery(query: string): string {
  return query.replace(/\s+/g, " ").trim().toLowerCase();
}

type PdfTextItem = {
  str?: string;
  transform?: number[];
  width?: number;
  height?: number;
};

export function extractTextItems(
  items: Array<PdfTextItem | { type: string }>,
): TextItemBox[] {
  const boxes: TextItemBox[] = [];

  for (const item of items) {
    if (!("str" in item) || !item.str || !item.transform) {
      continue;
    }

    const transform = item.transform;
    const x = transform[4] ?? 0;
    const y = transform[5] ?? 0;
    const height = Math.abs(transform[3] ?? item.height ?? 10);
    const width = item.width ?? Math.abs(transform[0] ?? 0) * item.str.length;

    boxes.push({
      str: item.str,
      x,
      y,
      width: width || item.str.length * height * 0.5,
      height: height || 10,
      transform,
    });
  }

  return boxes;
}

function buildPageString(items: TextItemBox[]): {
  text: string;
  charToItem: number[];
} {
  let text = "";
  const charToItem: number[] = [];

  items.forEach((item, itemIndex) => {
    if (text.length > 0) {
      text += " ";
      charToItem.push(itemIndex);
    }

    for (let i = 0; i < item.str.length; i++) {
      text += item.str[i];
      charToItem.push(itemIndex);
    }
  });

  return { text, charToItem };
}

function itemIndicesForRange(
  charToItem: number[],
  start: number,
  end: number,
): number[] {
  const indices = new Set<number>();

  for (let i = start; i < end && i < charToItem.length; i++) {
    indices.add(charToItem[i]!);
  }

  return [...indices];
}

function rectsForItems(
  items: TextItemBox[],
  itemIndices: number[],
  viewportWidth: number,
  viewportHeight: number,
  pdfWidth: number,
  pdfHeight: number,
): HighlightRect[] {
  const scaleX = viewportWidth / pdfWidth;
  const scaleY = viewportHeight / pdfHeight;
  const rects: HighlightRect[] = [];

  for (const index of itemIndices) {
    const item = items[index];
    if (!item) continue;

    // PDF coordinates origin is bottom-left; viewport/CSS is top-left.
    const left = item.x * scaleX;
    const width = Math.max(item.width * scaleX, 2);
    const height = Math.max(item.height * scaleY, 8);
    const top = viewportHeight - (item.y * scaleY) - height;

    rects.push({ left, top, width, height });
  }

  return mergeNearbyRects(rects);
}

function mergeNearbyRects(rects: HighlightRect[]): HighlightRect[] {
  if (rects.length <= 1) {
    return rects;
  }

  const sorted = [...rects].sort((a, b) => a.top - b.top || a.left - b.left);
  const merged: HighlightRect[] = [];

  for (const rect of sorted) {
    const previous = merged[merged.length - 1];

    if (
      previous &&
      Math.abs(previous.top - rect.top) < previous.height * 0.6 &&
      rect.left <= previous.left + previous.width + 8
    ) {
      const right = Math.max(
        previous.left + previous.width,
        rect.left + rect.width,
      );
      const bottom = Math.max(
        previous.top + previous.height,
        rect.top + rect.height,
      );
      previous.left = Math.min(previous.left, rect.left);
      previous.top = Math.min(previous.top, rect.top);
      previous.width = right - previous.left;
      previous.height = bottom - previous.top;
      continue;
    }

    merged.push({ ...rect });
  }

  return merged;
}

export function findMatchesOnPage(
  items: TextItemBox[],
  query: string,
  pageNumber: number,
  viewportWidth: number,
  viewportHeight: number,
  pdfWidth: number,
  pdfHeight: number,
): PageTextMatch[] {
  const normalizedQuery = normalizeSearchQuery(query);

  if (!normalizedQuery || items.length === 0) {
    return [];
  }

  const { text, charToItem } = buildPageString(items);
  const { normalized, map } = buildNormalizedIndex(text);
  const matches: PageTextMatch[] = [];
  let fromIndex = 0;

  while (fromIndex < normalized.length) {
    const matchIndex = normalized.indexOf(normalizedQuery, fromIndex);

    if (matchIndex === -1) {
      break;
    }

    const startOriginal = map[matchIndex] ?? 0;
    const endNormalized = matchIndex + normalizedQuery.length - 1;
    const endOriginal = (map[endNormalized] ?? startOriginal) + 1;
    const itemIndices = itemIndicesForRange(
      charToItem,
      startOriginal,
      endOriginal,
    );

    matches.push({
      pageNumber,
      startIndex: startOriginal,
      endIndex: endOriginal,
      rects: rectsForItems(
        items,
        itemIndices,
        viewportWidth,
        viewportHeight,
        pdfWidth,
        pdfHeight,
      ),
    });

    fromIndex = matchIndex + Math.max(normalizedQuery.length, 1);
  }

  return matches;
}

/** Prefer a distinctive slice of the excerpt for more reliable matching. */
export function excerptSearchQuery(excerpt: string): string {
  const normalized = excerpt.replace(/\s+/g, " ").trim();

  if (normalized.length <= 160) {
    return normalized;
  }

  // Prefer a mid-length window that avoids truncated edges.
  const start = Math.min(40, Math.floor(normalized.length * 0.15));
  return normalized.slice(start, start + 140).trim();
}
