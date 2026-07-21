export type AppTargetInfo = {
  path: string;
  name: string;
  iconDataUrl: string | null;
};

export type AppTargetPreviewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; info: AppTargetInfo }
  | { status: "error"; message: string };
