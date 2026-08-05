"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import type { PdfSourceRef } from "@/types/pdf";
import type { IndexedCitation } from "@/types/citation";
import {
  DEFAULT_VIEWER_STATE,
  type DocumentViewerState,
  type OpenSourceRequest,
} from "./types";

type PDFViewerContextValue = {
  isOpen: boolean;
  sources: PdfSourceRef[];
  activeDocumentId: string | null;
  activeSource: PdfSourceRef | null;
  request: OpenSourceRequest | null;
  getDocumentState: (documentId: string) => DocumentViewerState;
  updateDocumentState: (
    documentId: string,
    patch: Partial<DocumentViewerState>,
  ) => void;
  openCitation: (citation: IndexedCitation) => void;
  openDocument: (documentId: string, page?: number) => void;
  closeViewer: () => void;
  clearHighlightFocus: () => void;
};

const PDFViewerContext = createContext<PDFViewerContextValue | null>(null);

type PDFViewerProviderProps = {
  sources: PdfSourceRef[];
  children: React.ReactNode;
};

export function PDFViewerProvider({
  sources,
  children,
}: PDFViewerProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const [request, setRequest] = useState<OpenSourceRequest | null>(null);
  const documentStatesRef = useRef<Map<string, DocumentViewerState>>(new Map());
  const [, setStateVersion] = useState(0);

  const sourcesById = useMemo(() => {
    const map = new Map<string, PdfSourceRef>();
    for (const source of sources) {
      map.set(source.documentId, source);
    }
    return map;
  }, [sources]);

  const sourcesByName = useMemo(() => {
    const map = new Map<string, PdfSourceRef>();
    for (const source of sources) {
      map.set(source.fileName.toLowerCase(), source);
    }
    return map;
  }, [sources]);

  const getDocumentState = useCallback((documentId: string) => {
    return documentStatesRef.current.get(documentId) ?? {
      ...DEFAULT_VIEWER_STATE,
    };
  }, []);

  const updateDocumentState = useCallback(
    (documentId: string, patch: Partial<DocumentViewerState>) => {
      const current = documentStatesRef.current.get(documentId) ?? {
        ...DEFAULT_VIEWER_STATE,
      };
      documentStatesRef.current.set(documentId, { ...current, ...patch });
      setStateVersion((version) => version + 1);
    },
    [],
  );

  const resolveSource = useCallback(
    (documentId: string, fileName: string): PdfSourceRef | null => {
      return (
        sourcesById.get(documentId) ??
        sourcesByName.get(fileName.toLowerCase()) ??
        null
      );
    },
    [sourcesById, sourcesByName],
  );

  const openCitation = useCallback(
    (citation: IndexedCitation) => {
      const source = resolveSource(citation.documentId, citation.fileName);

      if (!source) {
        setActiveDocumentId(citation.documentId || null);
        setRequest({
          documentId: citation.documentId,
          fileName: citation.fileName,
          page: citation.page,
          excerpt: citation.excerpt,
          chunkId: citation.id,
        });
        setIsOpen(true);
        return;
      }

      const page = citation.page && citation.page > 0 ? citation.page : 1;
      updateDocumentState(source.documentId, { page });
      setActiveDocumentId(source.documentId);
      setRequest({
        documentId: source.documentId,
        fileName: source.fileName,
        page,
        excerpt: citation.excerpt,
        chunkId: citation.id,
      });
      setIsOpen(true);
    },
    [resolveSource, updateDocumentState],
  );

  const openDocument = useCallback(
    (documentId: string, page?: number) => {
      const source = sourcesById.get(documentId);
      if (!source) {
        return;
      }

      if (page && page > 0) {
        updateDocumentState(documentId, { page });
      }

      setActiveDocumentId(documentId);
      setRequest({
        documentId,
        fileName: source.fileName,
        page: page ?? getDocumentState(documentId).page,
        excerpt: "",
      });
      setIsOpen(true);
    },
    [getDocumentState, sourcesById, updateDocumentState],
  );

  const closeViewer = useCallback(() => {
    setIsOpen(false);
  }, []);

  const clearHighlightFocus = useCallback(() => {
    setRequest((current) =>
      current
        ? {
            ...current,
            excerpt: "",
          }
        : null,
    );
  }, []);

  const activeSource = activeDocumentId
    ? (sourcesById.get(activeDocumentId) ?? null)
    : null;

  const value = useMemo<PDFViewerContextValue>(
    () => ({
      isOpen,
      sources,
      activeDocumentId,
      activeSource,
      request,
      getDocumentState,
      updateDocumentState,
      openCitation,
      openDocument,
      closeViewer,
      clearHighlightFocus,
    }),
    [
      isOpen,
      sources,
      activeDocumentId,
      activeSource,
      request,
      getDocumentState,
      updateDocumentState,
      openCitation,
      openDocument,
      closeViewer,
      clearHighlightFocus,
    ],
  );

  return (
    <PDFViewerContext.Provider value={value}>
      {children}
    </PDFViewerContext.Provider>
  );
}

export function usePDFViewer(): PDFViewerContextValue {
  const context = useContext(PDFViewerContext);

  if (!context) {
    throw new Error("usePDFViewer must be used within PDFViewerProvider");
  }

  return context;
}

export function usePDFViewerOptional(): PDFViewerContextValue | null {
  return useContext(PDFViewerContext);
}
