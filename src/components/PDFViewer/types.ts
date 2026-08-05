export type ZoomMode = "fit-width" | "fit-page" | "custom";

export type DocumentViewerState = {
  page: number;
  zoomMode: ZoomMode;
  customScale: number;
  rotation: number;
  sidebarOpen: boolean;
  scrollTop: number;
};

export type OpenSourceRequest = {
  documentId: string;
  fileName: string;
  page?: number;
  excerpt: string;
  chunkId?: string;
};

export type ViewerErrorKind =
  | "missing"
  | "corrupt"
  | "render"
  | "invalid-page"
  | "unknown";

export const DEFAULT_VIEWER_STATE: DocumentViewerState = {
  page: 1,
  zoomMode: "fit-width",
  customScale: 1,
  rotation: 0,
  sidebarOpen: true,
  scrollTop: 0,
};

export const MIN_SCALE = 0.5;
export const MAX_SCALE = 3;
export const SCALE_STEP = 0.15;
